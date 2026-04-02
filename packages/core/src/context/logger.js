/**
 * Wrapper de pino para logging estructurado con correlation ID
 * Proporciona logs con trazabilidad completa de requests
 */
import pino from 'pino';
// ============================================================================
// Constantes
// ============================================================================
const DEFAULT_LOG_LEVEL = 'info';
// ============================================================================
// Implementación
// ============================================================================
/**
 * Crea un logger con correlation ID incluido en cada mensaje
 */
export function createContextLogger(correlationId, options = {}) {
    const level = options.level || DEFAULT_LOG_LEVEL;
    const isVerbose = options.verbose || false;
    const pinoOptions = {
        level: process.env.NODE_ENV === 'production' ? 'info' : level,
        base: {
            correlationId,
            timestamp: pino.stdTimeFunctions.isoTime
        },
        formatters: {
            level(label) {
                return { level: label };
            }
        },
        timestamp: isVerbose ? pino.stdTimeFunctions.isoTime : false
    };
    const pinoLogger = pino(pinoOptions);
    // Wrappers que incluyen correlation ID en cada log
    const contextLogger = {
        pino: pinoLogger,
        correlationId,
        debug(message, data) {
            pinoLogger.debug({ ...data, correlationId }, message);
        },
        info(message, data) {
            pinoLogger.info({ ...data, correlationId }, message);
        },
        warn(message, data) {
            pinoLogger.warn({ ...data, correlationId }, message);
        },
        error(message, error, data) {
            if (error) {
                pinoLogger.error({
                    ...data,
                    correlationId,
                    error: {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                    }
                }, message);
            }
            else {
                pinoLogger.error({ ...data, correlationId }, message);
            }
        },
        child(data) {
            const childLogger = this.pino.child(data);
            return {
                pino: childLogger,
                correlationId: this.correlationId,
                debug: this.debug.bind(this),
                info: this.info.bind(this),
                warn: this.warn.bind(this),
                error: this.error.bind(this),
                child: (moreData) => this.child({ ...data, ...moreData }),
                isDebug: this.isDebug.bind(this)
            };
        },
        isDebug() {
            return level === 'debug' || isVerbose;
        }
    };
    return contextLogger;
}
/**
 * Crea un logger stub para cuando no se necesita logging
 */
export function createNoOpLogger() {
    const noOp = {
        pino: pino({ enabled: false }),
        correlationId: 'no-op',
        debug: () => { },
        info: () => { },
        warn: () => { },
        error: () => { },
        child: () => noOp,
        isDebug: () => false
    };
    return noOp;
}
/**
 * Convierte string de nivel a LogLevel
 */
export function parseLogLevel(level) {
    const validLevels = ['debug', 'info', 'warn', 'error'];
    const normalized = level.toLowerCase();
    if (validLevels.includes(normalized)) {
        return normalized;
    }
    return DEFAULT_LOG_LEVEL;
}
//# sourceMappingURL=logger.js.map