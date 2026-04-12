// ============================================================================
// Terminal Policy Engine - Types
// ============================================================================

/**
 * Diálogo types que el policy engine debe resolver
 */
export type DialogType = 
  | 'pager'      // --More--
  | 'confirm'    // [confirm]
  | 'setup'      // Setup mode
  | 'autoinstall' // Autoinstall
  | 'dirtyline'; // Outstanding prompts

/**
 * Modos de sesión IOS
 */
export type SessionMode = 
  | 'exec'
  | 'privilege'
  | 'configure'
  | 'interface'
  | 'subinterface'
  | 'router'
  | 'vlan'
  | 'line';

/**
 * Opciones de política para ejecutar comandos
 */
export interface PolicyOptions {
  timeoutMs?: number;
  retryCount?: number;
  autoConfirm?: boolean;
  autoPaginate?: boolean;
  abortOnDirtyLine?: boolean;
}

/**
 * Estado actual del policy para un device
 */
export interface PolicyState {
  device: string;
  currentMode: SessionMode;
  dirtyLine: boolean;
  lastCommand?: string;
  lastOutput?: string;
  timeoutMs: number;
  retryCount: number;
  consecutiveTimeouts: number;
  lastActivity: Date;
}

/**
 * Resultado de un comando ejecutado con política
 */
export interface CommandResult {
  success: boolean;
  output: string;
  mode: SessionMode;
  dialogResolved?: DialogType;
  error?: string;
  executionTimeMs: number;
}

/**
 * Transición de modo válida
 */
export interface ModeTransition {
  from: SessionMode;
  to: SessionMode;
  valid: boolean;
  reason?: string;
}

/**
 * Job en cola para ejecución
 */
export interface QueuedJob {
  id: string;
  device: string;
  command: string;
  enqueuedAt: Date;
  options?: PolicyOptions;
}

/**
 * Policy configuration global
 */
export interface PolicyConfig {
  defaultTimeoutMs: number;
  defaultRetryCount: number;
  maxConsecutiveTimeouts: number;
  pagerTimeoutMs: number;
  confirmTimeoutMs: number;
  setupTimeoutMs: number;
  heartbeatIntervalMs: number;
}

/**
 * Default policy configuration
 */
export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  defaultTimeoutMs: 30000,
  defaultRetryCount: 2,
  maxConsecutiveTimeouts: 3,
  pagerTimeoutMs: 30000,
  confirmTimeoutMs: 10000,
  setupTimeoutMs: 60000,
  heartbeatIntervalMs: 1000,
};

/**
 * Interfaz del Terminal Policy Engine
 */
export interface ITerminalPolicyEngine {
  sendCommand(device: string, command: string, options?: PolicyOptions): Promise<CommandResult>;
  resolveDialog(device: string, dialog: DialogType): Promise<void>;
  transitionMode(device: string, targetMode: SessionMode): Promise<void>;
  executeWithPolicy<T>(device: string, op: () => Promise<T>, options?: PolicyOptions): Promise<T>;
  getPolicyState(device: string): PolicyState;
  enqueueJob(job: QueuedJob): void;
  getQueuedJobs(device: string): QueuedJob[];
  clearQueue(device: string): void;
}