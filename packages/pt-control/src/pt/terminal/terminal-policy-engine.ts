// ============================================================================
// TerminalPolicyEngine - Orquestador principal de políticas de terminal IOS
// ============================================================================

import type {
  ITerminalPolicyEngine,
  PolicyState,
  SessionMode,
  PolicyOptions,
  CommandResult,
  DialogType,
  QueuedJob,
  PolicyConfig,
} from './policy-types.js';
import { DEFAULT_POLICY_CONFIG } from './policy-types.js';
import { PolicyManager } from './policy-manager.js';
import { DialogResolver } from './dialog-resolver.js';
import { SessionArbiter } from './session-arbiter.js';
import { ModeTransitionHandler } from './mode-transition.js';

/**
 * TerminalPolicyEngine - Orchestrates all terminal policy handling
 */
export class TerminalPolicyEngine implements ITerminalPolicyEngine {
  private policyManager: PolicyManager;
  private dialogResolver: DialogResolver;
  private sessionArbiter: SessionArbiter;
  private modeHandler: ModeTransitionHandler;
  private config: PolicyConfig;
  private commandExecutor?: (device: string, command: string) => Promise<CommandResult>;

  constructor(config: PolicyConfig = DEFAULT_POLICY_CONFIG) {
    this.config = config;
    this.policyManager = new PolicyManager(config);
    this.dialogResolver = new DialogResolver();
    this.sessionArbiter = new SessionArbiter(config.heartbeatIntervalMs);
    this.modeHandler = new ModeTransitionHandler();
  }

  /**
   * Establecer el ejecutor de comandos (inyectado desde afuera)
   */
  setCommandExecutor(executor: (device: string, command: string) => Promise<CommandResult>): void {
    this.commandExecutor = executor;
  }

  /**
   * Enviar comando con política aplicada
   */
  async sendCommand(device: string, command: string, options: PolicyOptions = {}): Promise<CommandResult> {
    const state = this.policyManager.getState(device);
    const timeout = options.timeoutMs || this.config.defaultTimeoutMs;
    const maxRetries = options.retryCount ?? this.config.defaultRetryCount;

    // Verificar si hay jobs en cola para este device
    if (this.sessionArbiter.isExecuting(device)) {
      // Encolar y esperar
      this.enqueueJob({
        id: `job-${Date.now()}`,
        device,
        command,
        enqueuedAt: new Date(),
        options,
      });
      // Por ahora, ejecutamos directamente (en el futuro será encolado)
    }

    // Limpiar dirty line antes de ejecutar
    if (state.dirtyLine) {
      // Enviar newline para limpiar
      await this.executeRaw(device, '');
    }

    // Ejecutar comando con reintentos
    let lastError: string | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.policyManager.resetTimeouts(device);
        this.policyManager.setLastCommand(device, command);

        const result = await this.executeWithTimeout(device, command, timeout);
        
        // Procesar resultado
        this.policyManager.setLastOutput(device, result.output);
        this.policyManager.touch(device);
        this.policyManager.clearDirty(device);

        // Detectar y resolver diálogos
        const dialog = this.dialogResolver.detectDialog(result.output);
        if (dialog && (options.autoPaginate || options.autoConfirm)) {
          const resolved = this.dialogResolver.resolve(dialog, result.output, options);
          if (resolved.resolved && resolved.response) {
            // Resolver diálogo automáticamente
            await this.executeRaw(device, resolved.response);
            result.dialogResolved = dialog;
          }
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        
        if (error.message?.includes('timeout')) {
          this.policyManager.registerTimeout(device);
          
          if (this.policyManager.hasTooManyTimeouts(device)) {
            throw new Error(`Too many timeouts for device ${device}, giving up`);
          }
        }
        
        this.policyManager.incrementRetry(device);
      }
    }

    throw new Error(`Command failed after ${maxRetries} retries: ${lastError}`);
  }

  /**
   * Resolver diálogo específico
   */
  async resolveDialog(device: string, dialog: DialogType): Promise<void> {
    const state = this.policyManager.getState(device);
    const response = this.dialogResolver.getResponseForDialog(dialog);
    
    await this.executeRaw(device, response);
    this.policyManager.clearDirty(device);
  }

  /**
   * Transicionar a un modo específico
   */
  async transitionMode(device: string, targetMode: SessionMode): Promise<void> {
    const state = this.policyManager.getState(device);
    const currentMode = state.currentMode;

    // Verificar si es válida la transición
    const transition = this.modeHandler.canTransition(currentMode, targetMode);
    if (!transition.valid) {
      throw new Error(transition.reason);
    }

    // Obtener comando de transición
    const command = this.modeHandler.getEnterCommand(targetMode);
    if (command) {
      await this.sendCommand(device, command);
    }

    // Validar que estamos en el modo correcto
    // (en implementación real, verificaríamos el prompt)
    this.policyManager.setMode(device, targetMode);
  }

  /**
   * Ejecutar operación con política
   */
  async executeWithPolicy<T>(
    device: string,
    op: () => Promise<T>,
    options: PolicyOptions = {}
  ): Promise<T> {
    const timeout = options.timeoutMs || this.config.defaultTimeoutMs;

    // Crear promise con timeout
    const promise = op();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      this.policyManager.touch(device);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        this.policyManager.registerTimeout(device);
      }
      throw error;
    }
  }

  /**
   * Obtener estado de política actual
   */
  getPolicyState(device: string): PolicyState {
    return this.policyManager.getState(device);
  }

  /**
   * Enqueue un job
   */
  enqueueJob(job: QueuedJob): void {
    this.sessionArbiter.enqueue(job);
  }

  /**
   * Obtener jobs en cola para un device
   */
  getQueuedJobs(device: string): QueuedJob[] {
    return this.sessionArbiter.getQueuedJobs(device);
  }

  /**
   * Limpiar cola de un device
   */
  clearQueue(device: string): void {
    this.sessionArbiter.clearQueue(device);
  }

  // ==================== Private Methods ====================

  /**
   * Ejecutar comando raw (sin política extra)
   */
  private async executeRaw(device: string, command: string): Promise<CommandResult> {
    if (this.commandExecutor) {
      return this.commandExecutor(device, command);
    }
    
    // Default: throw if no executor configured
    throw new Error('No command executor configured');
  }

  /**
   * Ejecutar con timeout
   */
  private async executeWithTimeout(device: string, command: string, timeoutMs: number): Promise<CommandResult> {
    const promise = this.executeRaw(device, command);
    
    const timeoutPromise = new Promise<CommandResult>((_, reject) => {
      setTimeout(() => reject(new Error(`Command timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}

/**
 * Factory para crear TerminalPolicyEngine
 */
export function createTerminalPolicyEngine(config?: PolicyConfig): TerminalPolicyEngine {
  return new TerminalPolicyEngine(config);
}