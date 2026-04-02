/**
 * Contexto de ejecución para tools
 * Proporciona inyección de dependencias: logger, config
 */
import { type ContextLogger } from './logger.ts';
import { type CiscoAutoConfig } from '../config/types.ts';
import type { ExecutionContextOptions, ContextResult, ContextError } from './types.ts';
export declare class ExecutionContext {
    readonly correlationId: string;
    readonly logger: ContextLogger;
    readonly config: Required<CiscoAutoConfig>;
    readonly timeout: number;
    readonly abortSignal?: AbortSignal;
    readonly verbose: boolean;
    readonly createdAt: Date;
    private constructor();
    static create(options?: ExecutionContextOptions): ExecutionContext;
    fork(options?: Partial<ExecutionContextOptions>): ExecutionContext;
    getLogger(): ContextLogger;
    getConfig(): CiscoAutoConfig;
    run<T>(fn: (ctx: ExecutionContext) => Promise<T>): Promise<ContextResult<T>>;
    createError(code: string, message: string, durationMs: number): ContextError;
    elapsedMs(): number;
    isTimedOut(): boolean;
}
export declare function createStubContext(): ExecutionContext;
//# sourceMappingURL=index.d.ts.map