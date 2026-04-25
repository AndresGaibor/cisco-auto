/**
 * Error de dominio - representa violaciones de reglas del dominio.
 * Provee factory methods estáticos para crear errores comunes.
 */
export class DomainError extends Error {
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
   * Crea un error de valor inválido.
   * Útil cuando un valor no pasa la validación.
   * 
   * @param type - Nombre del tipo que falló (ej: 'VLAN ID', 'IPv4 address')
   * @param value - Valor que falló
   * @param reason - Razón específica del fallo
   * @param context - Contexto adicional para debugging
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
   * Crea un error de violación de invariante.
   * Útil cuando una regla de negocio se viola.
   * 
   * @param message - Descripción de la violación
   * @param context - Contexto adicional para debugging
   */
  static invariantViolation(
    message: string,
    context?: Record<string, unknown>
  ): DomainError {
    return new DomainError(message, 'INVARIANT_VIOLATION', context);
  }

  /**
   * Crea un error de entidad no encontrada.
   * 
   * @param type - Tipo de entidad (ej: 'Device', 'Interface')
   * @param id - Identificador de la entidad
   * @param context - Contexto adicional para debugging
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
   * Crea un error de operación no permitida.
   * 
   * @param operation - Nombre de la operación
   * @param reason - Razón por la cual no está permitida
   * @param context - Contexto adicional para debugging
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
   * Crea un error de conflicto.
   * Útil cuando hay duplicados o estados inconsistentes.
   * 
   * @param message - Descripción del conflicto
   * @param context - Contexto adicional para debugging
   */
  static conflict(
    message: string,
    context?: Record<string, unknown>
  ): DomainError {
    return new DomainError(message, 'CONFLICT', context);
  }
}