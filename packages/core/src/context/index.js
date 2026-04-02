/**
 * Contexto de ejecución para tools
 * Proporciona inyección de dependencias: logger, config
 */
import { createContextLogger, createNoOpLogger } from './logger.ts';
import { resolveConfig } from '../config/resolver.ts';
import { DEFAULT_CONFIG } from '../config/types.ts';
function generateCorrelationId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
}
export class ExecutionContext {
    correlationId;
    logger;
    config;
    timeout;
    abortSignal;
    verbose;
    createdAt;
    constructor(options) {
        this.correlationId = options.correlationId || generateCorrelationId();
        this.timeout = options.timeout || 30000;
        this.abortSignal = options.abortSignal;
        this.verbose = options.verbose || false;
        this.logger = options.logger
            ? createContextLogger(this.correlationId, { level: options.config?.logLevel, verbose: this.verbose })
            : createContextLogger(this.correlationId, { level: options.config?.logLevel, verbose: this.verbose });
        const resolved = resolveConfig();
        this.config = { ...DEFAULT_CONFIG, ...resolved, ...options.config };
        this.createdAt = new Date();
    }
    static create(options = {}) {
        return new ExecutionContext(options);
    }
    fork(options = {}) {
        return new ExecutionContext({
            ...options,
            correlationId: this.correlationId,
            abortSignal: options.abortSignal || this.abortSignal
        });
    }
    getLogger() {
        return this.logger;
    }
    getConfig() {
        return this.config;
    }
    async run(fn) {
        const startTime = Date.now();
        const timeoutMs = this.timeout;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        if (this.abortSignal?.aborted) {
            clearTimeout(timeoutId);
            return {
                data: undefined,
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
                new Promise((_, reject) => {
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
        }
        catch (error) {
            clearTimeout(timeoutId);
            const durationMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Operación fallida', error instanceof Error ? error : undefined, { durationMs });
            return {
                data: undefined,
                correlationId: this.correlationId,
                durationMs,
                success: false,
                error: errorMessage
            };
        }
    }
    createError(code, message, durationMs) {
        return {
            correlationId: this.correlationId,
            message,
            code,
            stack: this.verbose ? new Error().stack : undefined,
            durationMs
        };
    }
    elapsedMs() {
        return Date.now() - this.createdAt.getTime();
    }
    isTimedOut() {
        return this.elapsedMs() > this.timeout;
    }
}
export function createStubContext() {
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
            logLevel: 'info',
            format: 'table'
        },
        timeout: 30000
    });
}
//# sourceMappingURL=index.js.map