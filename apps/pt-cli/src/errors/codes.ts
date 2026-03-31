/**
 * Códigos de salida estándar para la CLI
 * Siguiendo el patrón de gh CLI para consistencia
 */

// Códigos de salida estándar
export const ExitCodes = {
  // Éxito - operación completada correctamente
  SUCCESS: 0,

  // Error general - errores inesperados o internos
  ERROR: 1,

  // Uso inválido - argumentos incorrectos, flags inválidos, comandos mal formados
  INVALID_USAGE: 2,

  // No encontrado - recurso, archivo o comando no existe
  NOT_FOUND: 3,

  // Timeout - operación excedió el tiempo límite
  TIMEOUT: 4,

  // Conexión rechazada - no se pudo conectar al servidor/dispositivo
  CONNECTION_REFUSED: 5,
} as const;

// Tipo para los códigos de salida
export type ExitCode = (typeof ExitCodes)[keyof typeof ExitCodes];

// Mensajes predefinidos para cada código
export const ExitMessages: Record<ExitCode, string> = {
  [ExitCodes.SUCCESS]: 'Operación completada exitosamente',
  [ExitCodes.ERROR]: 'Ha ocurrido un error inesperado',
  [ExitCodes.INVALID_USAGE]: 'Uso inválido del comando',
  [ExitCodes.NOT_FOUND]: 'El recurso solicitado no fue encontrado',
  [ExitCodes.TIMEOUT]: 'La operación excedió el tiempo límite',
  [ExitCodes.CONNECTION_REFUSED]: 'No se pudo establecer la conexión',
};