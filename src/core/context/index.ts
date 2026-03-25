/**
 * Contexto de ejecución para tools
 * Proporciona inyección de dependencias: logger, config, bridge client
 */

import { createContextLogger, type ContextLogger, createNoOpLogger } from './logger.ts';
import { createBridgeClient, type BridgeClient, NoOpBridgeClient } from './bridge-client.ts';
import { resolveConfig } from '../../../apps/cli/src/config/resolver.ts';
import { DEFAULT_CONFIG, type CiscoAutoConfig } from '../../../apps/cli/src/config/types.ts';
import type { ExecutionContextOptions, ContextResult, ContextError } from './types.ts';

function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

export class ExecutionContext {
  readonly correlationId: string;
  readonly logger: ContextLogger;
  readonly config: Required<CiscoAutoConfig>;
  readonly bridgeClient: BridgeClient;
  readonly timeout: number;
  readonly abortSignal?: AbortSignal;
  readonly verbose: boolean;
  readonly createdAt: Date;

  private constructor(options: ExecutionContextOptions) {
    this.correlationId = options.correlationId || generateCorrelationId();
    this.timeout = options.timeout || 30000;
    this.abortSignal = options.abortSignal;
    this.verbose = options.verbose || false;

    this.logger = options.logger
      ? createContextLogger(this.correlationId, { level: options.config?.logLevel, verbose: this.verbose })
      : createContextLogger(this.correlationId, { level: options.config?.logLevel, verbose: this.verbose });

    const resolved = resolveConfig();
    this.config = { ...DEFAULT_CONFIG, ...resolved, ...options.config };

    const port = this.config.bridgePort || 54321;
    this.bridgeClient = options.bridgeClient || createBridgeClient(port, this.timeout);

    this.createdAt = new Date();
  }

  static create(options: ExecutionContextOptions = {}): ExecutionContext {
    return new ExecutionContext(options);
  }

  fork(options: Partial<ExecutionContextOptions> = {}): ExecutionContext {
    return new ExecutionContext({
      ...options,
      correlationId: this.correlationId,
      abortSignal: options.abortSignal || this.abortSignal
    });
  }

  getLogger(): ContextLogger {
    return this.logger;
  }

  getConfig(): CiscoAutoConfig {
    return this.config;
  }

  getBridgeClient(): BridgeClient {
    return this.bridgeClient;
  }

  async isBridgeConnected(): Promise<boolean> {
    return this.bridgeClient.isConnected();
  }

  async run<T>(fn: (ctx: ExecutionContext) => Promise<T>): Promise<ContextResult<T>> {
    const startTime = Date.now();
    const timeoutMs = this.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (this.abortSignal?.aborted) {
      clearTimeout(timeoutId);
      return {
        data: undefined as T,
        correlationId: this.correlationId,
        durationMs: Date.now() - startTime,
        success: false,
        error: 'Operation cancelled'
      };
    }

    if (this.abortSignal) {
      this.abortSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      this.logger.debug('Iniciando operación', { timeout: timeoutMs });
      
      const result = await Promise.race([
        fn(this),
        new Promise<never>((_, reject) => {
          const id = setTimeout(() => reject(new Error('Timeout exceeded')), timeoutMs);
          controller.signal.addEventListener('abort', () => {
            clearTimeout(id);
            reject(new Error('Operation cancelled'));
          });
        })
      ]);
      
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      this.logger.debug('Operación completada', { durationMs });
      return { data: result, correlationId: this.correlationId, durationMs, success: true };
    } catch (error) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Operación fallida', error instanceof Error ? error : undefined, { durationMs });
      return {
        data: undefined as T,
        correlationId: this.correlationId,
        durationMs,
        success: false,
        error: errorMessage
      };
    }
  }

  createError(code: string, message: string, durationMs: number): ContextError {
    return {
      correlationId: this.correlationId,
      message,
      code,
      stack: this.verbose ? new Error().stack : undefined,
      durationMs
    };
  }

  elapsedMs(): number {
    return Date.now() - this.createdAt.getTime();
  }

  isTimedOut(): boolean {
    return this.elapsedMs() > this.timeout;
  }
}

export function createStubContext(): ExecutionContext {
  return ExecutionContext.create({
    correlationId: 'stub',
    logger: createNoOpLogger(),
    config: {
      defaultRouter: '2911',
      defaultSwitch: '2960-24TT',
      defaultPc: 'PC-PT',
      defaultVlan: 10,
      defaultSubnet: '255.255.255.0',
      outputDir: './output',
      bridgePort: 54321,
      logLevel: 'info',
      format: 'table'
    },
    timeout: 30000,
    bridgeClient: new NoOpBridgeClient()
  });
}
