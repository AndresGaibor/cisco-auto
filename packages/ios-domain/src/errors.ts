/**
 * IOS Error Taxonomy
 * Standardized error codes and structures for IOS command execution
 */

import type { IosMode, OutputClassification } from "@cisco-auto/types";

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Códigos de error estándar para ejecución de comandos IOS.
 * Categorizados por fase: validación, auth, estado, ejecución, dispositivo, sesión.
 */
export const IOS_ERROR_CODES = {
  // Input validation errors
  INVALID_INPUT: "IOS_INVALID_INPUT",
  INCOMPLETE_COMMAND: "IOS_INCOMPLETE_COMMAND",
  AMBIGUOUS_COMMAND: "IOS_AMBIGUOUS_COMMAND",
  
  // Authentication/authorization errors
  PASSWORD_REQUIRED: "IOS_PASSWORD_REQUIRED",
  PRIVILEGE_DENIED: "IOS_PRIVILEGE_DENIED",
  
  // State errors
  CONFIRMATION_REQUIRED: "IOS_CONFIRMATION_REQUIRED",
  PAGING_TIMEOUT: "IOS_PAGING_TIMEOUT",
  WRONG_MODE: "IOS_WRONG_MODE",
  
  // Execution errors
  COMMAND_FAILED: "IOS_COMMAND_FAILED",
  SAVE_FAILED: "IOS_SAVE_FAILED",
  TIMEOUT: "IOS_TIMEOUT",
  
  // Device errors
  DEVICE_NOT_FOUND: "IOS_DEVICE_NOT_FOUND",
  NO_CLI: "IOS_NO_CLI",
  UNSUPPORTED_DEVICE: "IOS_UNSUPPORTED_DEVICE",
  
  // Session errors
  SESSION_ERROR: "IOS_SESSION_ERROR",
  SESSION_STALE: "IOS_SESSION_STALE",
  
  // Unknown
  UNKNOWN_ERROR: "IOS_UNKNOWN_ERROR",
} as const;

export type IosErrorCode = typeof IOS_ERROR_CODES[keyof typeof IOS_ERROR_CODES];

/**
 * Clasifica el output de un comando IOS según su tipo de error.
 * Se usa para mapear outputs a códigos de error accionables.
 * @param classification - Resultado de classifyOutput del output
 * @returns Código de error o null si el output indica éxito
 * @example
 * // "Invalid input detected" → IOS_ERROR_CODES.INVALID_INPUT
 * classificationToErrorCode("invalid") // "IOS_INVALID_INPUT"
 */
export function classificationToErrorCode(
  classification: OutputClassification
): IosErrorCode | null {
  switch (classification) {
    case "invalid":
      return IOS_ERROR_CODES.INVALID_INPUT;
    case "incomplete":
      return IOS_ERROR_CODES.INCOMPLETE_COMMAND;
    case "ambiguous":
      return IOS_ERROR_CODES.AMBIGUOUS_COMMAND;
    case "error":
      return IOS_ERROR_CODES.COMMAND_FAILED;
    case "paging":
      return IOS_ERROR_CODES.PAGING_TIMEOUT;
    case "success":
      return null;
    default:
      return IOS_ERROR_CODES.UNKNOWN_ERROR;
  }
}

/**
 * Determina si un error puede ser reintentado automáticamente.
 * Errores como timeout y session stale pueden requerir reintento.
 * @param code - Código de error IOS
 * @returns true si el error es retryable
 */
export function isRetryableError(code: IosErrorCode): boolean {
  const retryableCodes: IosErrorCode[] = [
    IOS_ERROR_CODES.TIMEOUT,
    IOS_ERROR_CODES.PAGING_TIMEOUT,
    IOS_ERROR_CODES.SESSION_STALE,
    IOS_ERROR_CODES.NO_CLI,
  ];
  return retryableCodes.includes(code);
}

/**
 * Identifica la fase donde ocurrió el error para decidir estrategia de recovery.
 * @param code - Código de error IOS
 * @returns Phase donde ocurrió el error
 */
export function determineErrorPhase(code: IosErrorCode): "preflight" | "execute" | "postflight" | "save" {
  switch (code) {
    case IOS_ERROR_CODES.DEVICE_NOT_FOUND:
    case IOS_ERROR_CODES.NO_CLI:
    case IOS_ERROR_CODES.UNSUPPORTED_DEVICE:
    case IOS_ERROR_CODES.PASSWORD_REQUIRED:
    case IOS_ERROR_CODES.PRIVILEGE_DENIED:
      return "preflight";
    case IOS_ERROR_CODES.SAVE_FAILED:
      return "save";
    case IOS_ERROR_CODES.INVALID_INPUT:
    case IOS_ERROR_CODES.INCOMPLETE_COMMAND:
    case IOS_ERROR_CODES.AMBIGUOUS_COMMAND:
    case IOS_ERROR_CODES.COMMAND_FAILED:
    case IOS_ERROR_CODES.TIMEOUT:
    case IOS_ERROR_CODES.WRONG_MODE:
    case IOS_ERROR_CODES.CONFIRMATION_REQUIRED:
    case IOS_ERROR_CODES.PAGING_TIMEOUT:
      return "execute";
    default:
      return "execute";
  }
}

// ============================================================================
// Structured IOS Error
// ============================================================================

/**
 * Contexto completo para crear un IosError estructurado.
 * Incluye información de dispositivo, comando, modo y clasificación.
 */
export interface IosErrorContext {
  code: IosErrorCode;
  message: string;
  device?: string;
  command?: string;
  phase?: "preflight" | "execute" | "postflight" | "save";
  modeBefore?: IosMode;
  modeAfter?: IosMode;
  classification?: OutputClassification;
  rawOutput?: string;
  durationMs?: number;
  retryable?: boolean;
}

/**
 * Crea un IosError estructurado con información de contexto completa.
 * El error incluye código, mensaje, dispositivo, comando, modo y clasificación.
 * @param context - Información del error incluyendo código y mensaje requeridos
 * @returns Error estructurado con todas las propiedades del contexto
 */
export function createIosError(context: IosErrorContext): Error & IosErrorContext {
  const error = new Error(context.message) as Error & IosErrorContext;
  error.name = "IosError";
  error.code = context.code;
  error.device = context.device;
  error.command = context.command;
  error.phase = context.phase ?? determineErrorPhase(context.code);
  error.modeBefore = context.modeBefore;
  error.modeAfter = context.modeAfter;
  error.classification = context.classification;
  error.rawOutput = context.rawOutput;
  error.durationMs = context.durationMs;
  error.retryable = context.retryable ?? isRetryableError(context.code);
  return error;
}

// ============================================================================
// Error Message Helpers
// ============================================================================

export const IOS_ERROR_MESSAGES: Record<IosErrorCode, string> = {
  [IOS_ERROR_CODES.INVALID_INPUT]: "Invalid input detected",
  [IOS_ERROR_CODES.INCOMPLETE_COMMAND]: "Incomplete command",
  [IOS_ERROR_CODES.AMBIGUOUS_COMMAND]: "Ambiguous command",
  [IOS_ERROR_CODES.PASSWORD_REQUIRED]: "Enable password required",
  [IOS_ERROR_CODES.PRIVILEGE_DENIED]: "Privilege level denied",
  [IOS_ERROR_CODES.CONFIRMATION_REQUIRED]: "Confirmation required",
  [IOS_ERROR_CODES.PAGING_TIMEOUT]: "Timeout while paginating output",
  [IOS_ERROR_CODES.WRONG_MODE]: "Device in wrong IOS mode",
  [IOS_ERROR_CODES.COMMAND_FAILED]: "Command execution failed",
  [IOS_ERROR_CODES.SAVE_FAILED]: "Failed to save configuration",
  [IOS_ERROR_CODES.TIMEOUT]: "Command execution timeout",
  [IOS_ERROR_CODES.DEVICE_NOT_FOUND]: "Device not found",
  [IOS_ERROR_CODES.NO_CLI]: "Device CLI not ready",
  [IOS_ERROR_CODES.UNSUPPORTED_DEVICE]: "Unsupported device type",
  [IOS_ERROR_CODES.SESSION_ERROR]: "Session error",
  [IOS_ERROR_CODES.SESSION_STALE]: "Session is stale",
  [IOS_ERROR_CODES.UNKNOWN_ERROR]: "Unknown error",
};

/**
 * Obtiene el mensaje legible para un código de error IOS.
 * Opcionalmente prependea contexto adicional al mensaje base.
 * @param code - Código de error IOS
 * @param context - Información adicional para enriquecer el mensaje
 * @returns Mensaje de error formateado
 * @example
 * getIosErrorMessage("IOS_TIMEOUT") // "Command execution timeout"
 * getIosErrorMessage("IOS_COMMAND_FAILED", "interface Gi0/1") // "Command execution failed: interface Gi0/1"
 */
export function getIosErrorMessage(code: IosErrorCode, context?: string): string {
  const base = IOS_ERROR_MESSAGES[code] || IOS_ERROR_MESSAGES[IOS_ERROR_CODES.UNKNOWN_ERROR];
  return context ? `${base}: ${context}` : base;
}
