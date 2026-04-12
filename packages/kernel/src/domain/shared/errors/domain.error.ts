/**
 * Error de dominio - representa violaciones de reglas del dominio
 */export class DomainError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.context = context;
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Crea un error de valor inválido
   */
  static invalidValue(
    type: string,
    value: unknown,
    reason?: string,
    context?: Record<string, unknown>
  ): DomainError {
    const message = reason
      ? `Invalid ${type}: "${String(value)}". ${reason}`
      : `Invalid ${type}: "${String(value)}"`;
    return new DomainError(message, 'INVALID_VALUE', { type, value, reason, ...context });
  }

  /**
   * Crea un error de violación de invariante
   */
  static invariantViolation(
    message: string,
    context?: Record<string, unknown>
  ): DomainError {
    return new DomainError(message, 'INVARIANT_VIOLATION', context);
  }

  /**
   * Crea un error de entidad no encontrada
   */
  static notFound(
    type: string,
    id: string,
    context?: Record<string, unknown>
  ): DomainError {
    return new DomainError(
      `${type} with id "${id}" not found`,
      'NOT_FOUND',
      { type, id, ...context }
    );
  }

  /**
   * Crea un error de operación no permitida
   */
  static notAllowed(
    operation: string,
    reason: string,
    context?: Record<string, unknown>
  ): DomainError {
    return new DomainError(
      `Operation "${operation}" not allowed: ${reason}`,
      'NOT_ALLOWED',
      { operation, reason, ...context }
    );
  }

  /**
   * Crea un error de conflicto
   */
  static conflict(
    message: string,
    context?: Record<string, unknown>
  ): DomainError {
    return new DomainError(message, 'CONFLICT', context);
  }
}