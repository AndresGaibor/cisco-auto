/**
 * Tool Execution Types - Execution context and handler types
 * Handles execution flow, logging, and context management
 */
export class ToolExecutionError {
    name = 'ToolExecutionError';
    message;
    code;
    statusCode;
    details;
    recoverable = false;
    retryable = false;
    constructor(message, code = 'EXECUTION_ERROR', options) {
        this.message = message;
        this.code = code;
        this.statusCode = options?.statusCode;
        this.details = options?.details;
        this.recoverable = options?.recoverable ?? false;
        this.retryable = options?.retryable ?? false;
    }
}
//# sourceMappingURL=tool-execution.js.map