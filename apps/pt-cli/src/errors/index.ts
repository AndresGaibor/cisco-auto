import { ExitCodes, type ExitCode } from './codes';

export { ExitCodes, type ExitCode } from './codes';

/**
 * Interfaz para errores de la CLI
 */
export interface CLIErrorOptions {
  code: ExitCode;
  message: string;
  suggestions?: string[];
  cause?: Error;
}

/**
 * Clase base para todos los errores de la CLI
 * Proporciona formato consistente y suggestions para el usuario
 */
export class CLIError extends Error {
  public readonly code: ExitCode;
  public readonly suggestions: string[];
  public readonly rootCause?: Error;

  constructor(options: CLIErrorOptions) {
    super(options.message);
    this.name = 'CLIError';
    this.code = options.code;
    this.suggestions = options.suggestions || [];
    this.rootCause = options.cause;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CLIError);
    }
  }

  public override toString(): string {
    let output = `Error [${this.code}]: ${this.message}`;

    if (this.suggestions.length > 0) {
      output += '\n\nSugerencias:';
      this.suggestions.forEach((suggestion) => {
        output += `\n  - ${suggestion}`;
      });
    }

    if (this.rootCause) {
      output += `\n\nCausa: ${this.rootCause.message}`;
    }

    return output;
  }

  /**
   * Obtiene el código de salida para process.exit()
   */
  public getExitCode(): number {
    return this.code;
  }
}

/**
 * Error para uso inválido de comandos
 * Códigos de salida: 2
 */
export class InvalidUsageError extends CLIError {
  constructor(message: string, suggestions?: string[]) {
    super({
      code: ExitCodes.INVALID_USAGE,
      message,
      suggestions: suggestions || [
        'Ejecuta el comando con --help para ver la ayuda',
        'Verifica la sintaxis del comando',
      ],
    });
    this.name = 'InvalidUsageError';
  }
}

/**
 * Error para recursos no encontrados
 * Códigos de salida: 3
 */
export class NotFoundError extends CLIError {
  constructor(resource: string, suggestions?: string[]) {
    super({
      code: ExitCodes.NOT_FOUND,
      message: `No se encontró: ${resource}`,
      suggestions: suggestions || [
        'Verifica que el nombre sea correcto',
        'Usa tab completion para ver opciones disponibles',
      ],
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Error para operaciones que exceden el timeout
 * Códigos de salida: 4
 */
export class TimeoutError extends CLIError {
  constructor(operation: string, timeoutMs?: number) {
    const message = timeoutMs
      ? `Timeout en '${operation}' después de ${timeoutMs}ms`
      : `Timeout en '${operation}'`;

    super({
      code: ExitCodes.TIMEOUT,
      message,
      suggestions: [
        'Verifica la conectividad de red',
        'Aumenta el timeout con --timeout flag',
        'Verifica que el dispositivo esté accesible',
      ],
    });
    this.name = 'TimeoutError';
  }
}

/**
 * Error para conexiones rechazadas
 * Códigos de salida: 5
 */
export class ConnectionError extends CLIError {
  constructor(target: string, reason?: string) {
    const message = reason
      ? `No se pudo conectar a '${target}': ${reason}`
      : `No se pudo conectar a '${target}'`;

    super({
      code: ExitCodes.CONNECTION_REFUSED,
      message,
      suggestions: [
        'Verifica que el dispositivo esté encendido',
        'Verifica la dirección IP/hostname',
        'Verifica las credenciales configuradas',
        'Asegúrate de que el servicio esté disponible',
      ],
    });
    this.name = 'ConnectionError';
  }
}

/**
 * Error genérico para errores inesperados
 * Códigos de salida: 1
 */
export class CLIUnexpectedError extends CLIError {
  constructor(message: string, cause?: Error) {
    super({
      code: ExitCodes.ERROR,
      message,
      suggestions: [
        'Ejecuta con --verbose para más detalles',
        'Reporta el bug si el problema persiste',
      ],
      cause,
    });
    this.name = 'CLIUnexpectedError';
  }
}

/**
 * Función helper para lanzar errores de la CLI
 */
export function throwCLIError(options: CLIErrorOptions): never {
  throw new CLIError(options);
}

/**
 * Función helper para lanzar InvalidUsageError
 */
export function throwInvalidUsage(message: string, suggestions?: string[]): never {
  throw new InvalidUsageError(message, suggestions);
}

/**
 * Función helper para lanzar NotFoundError
 */
export function throwNotFound(resource: string, suggestions?: string[]): never {
  throw new NotFoundError(resource, suggestions);
}

/**
 * Función helper para lanzar TimeoutError
 */
export function throwTimeout(operation: string, timeoutMs?: number): never {
  throw new TimeoutError(operation, timeoutMs);
}

/**
 * Función helper para lanzar ConnectionError
 */
export function throwConnection(target: string, reason?: string): never {
  throw new ConnectionError(target, reason);
}