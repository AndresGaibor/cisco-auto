/**
 * IOS Error Classifier (Fase 6)
 * 
 * Formal error categorization from terminal output and execution diagnostics.
 * Replaces diffuse error handling with structured error classification.
 * 
 * Generated into: packages/pt-control/src/domain/ios/ios-error-classifier.ts
 */

import type { IosInteractiveResult, Diagnostics, CompletionReason } from '@cisco-auto/types';

export enum IosErrorCategory {
  // Syntax/Validation Errors
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  AMBIGUOUS_COMMAND = 'AMBIGUOUS_COMMAND',
  INCOMPLETE_COMMAND = 'INCOMPLETE_COMMAND',

  // Permission/Mode Errors
  PRIVILEGE_ERROR = 'PRIVILEGE_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // Resource/Configuration Errors
  INTERFACE_NOT_FOUND = 'INTERFACE_NOT_FOUND',
  VLAN_NOT_FOUND = 'VLAN_NOT_FOUND',
  IP_CONFLICT = 'IP_CONFLICT',
  MASK_INVALID = 'MASK_INVALID',

  // Interaction Timeouts
  INTERACTION_TIMEOUT = 'INTERACTION_TIMEOUT',
  PAGING_TIMEOUT = 'PAGING_TIMEOUT',
  CONFIRM_TIMEOUT = 'CONFIRM_TIMEOUT',
  PASSWORD_TIMEOUT = 'PASSWORD_TIMEOUT',
  FILENAME_TIMEOUT = 'FILENAME_TIMEOUT',

  // Session Issues
  SESSION_DESYNC = 'SESSION_DESYNC',
  TERMINAL_UNAVAILABLE = 'TERMINAL_UNAVAILABLE',

  // Data Issues
  DNS_LOOKUP_TIMEOUT = 'DNS_LOOKUP_TIMEOUT',
  TRUNCATED_OUTPUT = 'TRUNCATED_OUTPUT',
  SYNTHETIC_RESULT = 'SYNTHETIC_RESULT',

  // Save/Persistence Errors
  SAVE_FAILED = 'SAVE_FAILED',
  WRITE_MEMORY_FAILED = 'WRITE_MEMORY_FAILED',

  // Generic
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ClassifiedError {
  category: IosErrorCategory;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  retryable: boolean;
  details?: {
    raw?: string;
    command?: string;
    completionReason?: CompletionReason;
    outputSnippet?: string;
  };
}

/**
 * Clasificador de errores IOS (Fase 6).
 *
 * Proporciona categorización formal de errores a partir de output de terminal
 * y diagnósticos de ejecución. Reemplaza el manejo difuso de errores con
 * clasificación estructurada.
 *
 * Las categorías principales incluyen:
 * - Errores de sintaxis/validación (SYNTAX_ERROR, AMBIGUOUS_COMMAND)
 * - Errores de permiso/modo (PRIVILEGE_ERROR, PERMISSION_DENIED)
 * - Errores de recurso/configuración (INTERFACE_NOT_FOUND, VLAN_NOT_FOUND)
 * - Timeouts de interacción (PAGING_TIMEOUT, CONFIRM_TIMEOUT)
 * - Problemas de sesión (SESSION_DESYNC, TERMINAL_UNAVAILABLE)
 *
 * @example
 * ```typescript
 * const result = await iosService.execInteractive("R1", "show ip route");
 * const error = classifyIosError(result);
 * if (error) {
 *   console.log(error.category); // e.g. "EXECUTION_TIMEOUT"
 *   console.log(error.severity); // "error"
 *   console.log(error.retryable); // true
 * }
 * ```
 */
export function classifyIosError(result: IosInteractiveResult): ClassifiedError | null {
  if (result.ok && result.diagnostics.source === 'terminal') {
    return null; // No error
  }

  const diagnostics = result.diagnostics;
  const raw = result.raw;

  // =========================================================================
  // Synthetic Result - Not from real device
  // =========================================================================
  if (diagnostics.source === 'synthetic') {
    return {
      category: IosErrorCategory.SYNTHETIC_RESULT,
      message: 'Result is synthetic (from heuristics, not from real device)',
      severity: 'warning',
      retryable: true,
      details: {
        command: result.command,
        completionReason: diagnostics.completionReason,
      },
    };
  }

  // =========================================================================
  // Timeouts - based on completion reason
  // =========================================================================
  if (diagnostics.completionReason === 'timeout') {
    return {
      category: IosErrorCategory.EXECUTION_TIMEOUT,
      message: 'Command execution timeout',
      severity: 'error',
      retryable: true,
      details: { command: result.command },
    };
  }

  if (diagnostics.completionReason === 'paging-timeout') {
    return {
      category: IosErrorCategory.PAGING_TIMEOUT,
      message: 'Paging timeout - device did not continue after space/return',
      severity: 'error',
      retryable: true,
      details: { command: result.command },
    };
  }

  if (diagnostics.completionReason === 'confirm-timeout') {
    return {
      category: IosErrorCategory.CONFIRM_TIMEOUT,
      message: 'Confirmation timeout - no response to [y/n] prompt',
      severity: 'error',
      retryable: true,
      details: { command: result.command },
    };
  }

  if (diagnostics.completionReason === 'password-timeout') {
    return {
      category: IosErrorCategory.PASSWORD_TIMEOUT,
      message: 'Password timeout - no response to password prompt',
      severity: 'error',
      retryable: true,
      details: { command: result.command },
    };
  }

  if (diagnostics.completionReason === 'filename-timeout') {
    return {
      category: IosErrorCategory.FILENAME_TIMEOUT,
      message: 'Destination filename timeout',
      severity: 'error',
      retryable: true,
      details: { command: result.command },
    };
  }

  // =========================================================================
  // Desync
  // =========================================================================
  if (diagnostics.completionReason === 'desync') {
    return {
      category: IosErrorCategory.SESSION_DESYNC,
      message: 'Session lost synchronization with device',
      severity: 'critical',
      retryable: false,
      details: { command: result.command },
    };
  }

  // =========================================================================
  // Parse output for error patterns
  // =========================================================================

  // Syntax errors
  if (/% Invalid/.test(raw) || /% Unknown/.test(raw)) {
    const match = raw.match(/% (Invalid|Unknown).*command/i);
    return {
      category: IosErrorCategory.SYNTAX_ERROR,
      message: match ? match[0] : 'Invalid or unknown command',
      severity: 'error',
      retryable: false,
      details: { command: result.command, outputSnippet: match?.[0] },
    };
  }

  // Incomplete command
  if (/% Incomplete command/.test(raw)) {
    return {
      category: IosErrorCategory.INCOMPLETE_COMMAND,
      message: 'Incomplete command',
      severity: 'error',
      retryable: false,
      details: { command: result.command },
    };
  }

  // Ambiguous command
  if (/% Ambiguous command/.test(raw)) {
    return {
      category: IosErrorCategory.AMBIGUOUS_COMMAND,
      message: 'Ambiguous command - matches multiple possibilities',
      severity: 'error',
      retryable: false,
      details: { command: result.command },
    };
  }

  // Privilege errors
  if (/% No such device|% This command is not permitted|% You are not authorized/.test(raw)) {
    return {
      category: IosErrorCategory.PRIVILEGE_ERROR,
      message: 'Insufficient privilege for command',
      severity: 'error',
      retryable: true, // May retry after enable
      details: { command: result.command },
    };
  }

  // Interface not found
  if (/% Invalid interface|% Unknown interface|No such device|% Device not found/i.test(raw)) {
    return {
      category: IosErrorCategory.INTERFACE_NOT_FOUND,
      message: 'Interface or device not found',
      severity: 'error',
      retryable: false,
      details: { command: result.command, outputSnippet: raw.split('\n')[0] },
    };
  }

  // VLAN not found
  if (/VLAN not found|% Invalid vlan|VLANs are not configured/i.test(raw)) {
    return {
      category: IosErrorCategory.VLAN_NOT_FOUND,
      message: 'VLAN not found or invalid',
      severity: 'error',
      retryable: false,
      details: { command: result.command, outputSnippet: raw.split('\n')[0] },
    };
  }

  // IP conflict
  if (/IP address already in use|% Overlapping address|conflict/i.test(raw)) {
    return {
      category: IosErrorCategory.IP_CONFLICT,
      message: 'IP address conflict',
      severity: 'error',
      retryable: false,
      details: { command: result.command },
    };
  }

  // Invalid mask
  if (/Invalid netmask|% Invalid address/i.test(raw)) {
    return {
      category: IosErrorCategory.MASK_INVALID,
      message: 'Invalid netmask or IP address format',
      severity: 'error',
      retryable: false,
      details: { command: result.command },
    };
  }

  // DNS lookup timeout
  if (/DNS lookup timeout|Translating|% Name resolution/i.test(raw)) {
    return {
      category: IosErrorCategory.DNS_LOOKUP_TIMEOUT,
      message: 'DNS lookup timeout or failed',
      severity: 'warning',
      retryable: true,
      details: { command: result.command },
    };
  }

  // Save/write memory failed
  if (/[Ww]rite memory failed|save failed|%.*Error.*write/i.test(raw)) {
    return {
      category: IosErrorCategory.SAVE_FAILED,
      message: 'Failed to save configuration',
      severity: 'critical',
      retryable: true,
      details: { command: result.command },
    };
  }

  // Truncated output
  if (/truncated|[Oo]utput truncated/i.test(raw) || raw.length > 100000) {
    return {
      category: IosErrorCategory.TRUNCATED_OUTPUT,
      message: 'Output was truncated - may be incomplete',
      severity: 'warning',
      retryable: true,
      details: { command: result.command },
    };
  }

  // =========================================================================
  // Diagnostics errors
  // =========================================================================
  if (diagnostics.errors.length > 0) {
    const error = diagnostics.errors[0];

    if (/timeout/i.test(error)) {
      return {
        category: IosErrorCategory.EXECUTION_TIMEOUT,
        message: error,
        severity: 'error',
        retryable: true,
      };
    }

    if (/desync/i.test(error)) {
      return {
        category: IosErrorCategory.SESSION_DESYNC,
        message: error,
        severity: 'critical',
        retryable: false,
      };
    }

    return {
      category: IosErrorCategory.UNKNOWN_ERROR,
      message: error,
      severity: 'error',
      retryable: true,
      details: { command: result.command },
    };
  }

  // =========================================================================
  // Default: unknown error (ok=false but no matching pattern)
  // =========================================================================
  return {
    category: IosErrorCategory.UNKNOWN_ERROR,
    message: 'Unknown IOS error',
    severity: 'error',
    retryable: true,
    details: {
      command: result.command,
      completionReason: diagnostics.completionReason,
      outputSnippet: raw.split('\n')[0],
    },
  };
}

/**
 * Determina si un error clasificado puede ser reintentado.
 *
 * @param error - Error clasificado por classifyIosError
 * @returns true si el error es retryable (timeout, sesión desincronizada, etc.)
 *
 * @example
 * ```typescript
 * const error = classifyIosError(result);
 * if (error && isRetryable(error)) {
 *   // Reintentar comando
 * }
 * ```
 */
export function isRetryable(error: ClassifiedError): boolean {
  return error.retryable;
}

/**
 * Obtiene descripción legible de un error clasificado.
 *
 * @param error - Error clasificado por classifyIosError
 * @returns String con mensaje formateado incluyendo categoría, mensaje y detalles
 *
 * @example
 * ```typescript
 * const error = classifyIosError(result);
 * if (error) {
 *   console.log(getErrorDescription(error));
 *   // Imprime: [SYNTAX_ERROR] Invalid or unknown command
 *   //         Command: show ip routee
 *   //         Output: % Invalid command
 * }
 * ```
 */
export function getErrorDescription(error: ClassifiedError): string {
  let description = `[${error.category}] ${error.message}`;

  if (error.details?.command) {
    description += `\nCommand: ${error.details.command}`;
  }

  if (error.details?.outputSnippet) {
    description += `\nOutput: ${error.details.outputSnippet}`;
  }

  if (error.retryable) {
    description += '\nThis error may be retryable.';
  }

  return description;
}

/**
 * Check if result should be considered a hard failure
 * (not just a warning or recoverable error)
 */
export function isHardFailure(result: IosInteractiveResult): boolean {
  if (result.ok && result.diagnostics.source === 'terminal') {
    return false; // Success
  }

  const error = classifyIosError(result);
  if (!error) {
    return false;
  }

  // Hard failures are critical or non-retryable errors
  return error.severity === 'critical' || !error.retryable;
}
