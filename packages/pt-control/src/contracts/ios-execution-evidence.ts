// ============================================================================
// IOS Execution Evidence & Result Contracts — Fase 4
// ============================================================================
// Contrato formal para evidencia de ejecución IOS. Distingue:
// - ejecución (el comando se mandó)
// - evidencia (qué reportó el runtime)
// - verificación (se comprobó el estado deseado)
// ============================================================================

/**
 * Nivel de confianza de un resultado IOS.
 * - executed: se ejecutó en terminal real pero no se verificó
 * - verified: se ejecutó Y se verificó completamente
 * - partially_verified: se verificó parcialmente (algunos checks OK, otros no)
 * - unverified: se ejecutó pero la verificación falló o no se hizo
 * - non_terminal: el resultado no viene de terminal real (synthetic/unknown)
 */
export type IosConfidence =
  | "executed"
  | "verified"
  | "partially_verified"
  | "unverified"
  | "non_terminal";

/**
 * Evidencia cruda de una ejecución IOS.
 * Provee contexto sobre cómo se obtuvo el resultado.
 */
export interface IosExecutionEvidence {
  /** Fuente del resultado: "terminal" = dispositivo real, "synthetic" = heurístico, "unknown" = indeterminado */
  source: "terminal" | "synthetic" | "hybrid" | "unknown";
  /** Código de status del comando (0 = éxito, >0 = error) */
  status?: number;
  /** Modo IOS al terminar (user-exec, priv-exec, config, config-if, etc.) */
  mode?: string;
  /** Prompt visible al terminar */
  prompt?: string;
  /** Paging activo al terminar */
  paging?: boolean;
  /** Esperando confirmación [y/n] */
  awaitingConfirm?: boolean;
  /** El diálogo inicial fue descartado automáticamente */
  autoDismissedInitialDialog?: boolean;
  /** Razón de completitud reportada por el runtime */
  completionReason?: string;
  /** Timeout del comando en ms */
  commandTimeoutMs?: number;
}

/**
 * Resultado de una ejecución IOS individual (execIos, execInteractive).
 */
export interface IosExecutionSuccess<TParsed = unknown> {
  ok: true;
  /** Salida cruda del dispositivo */
  raw: string;
  /** Salida parseada (si se solicitó y hay parser disponible) */
  parsed?: TParsed;
  /** Evidencia de cómo se obtuvo este resultado */
  evidence: IosExecutionEvidence;
}

/**
 * Fallo de ejecución IOS con evidencia adjunta para diagnóstico.
 */
export interface IosExecutionFailure {
  ok: false;
  /** Mensaje de error legible */
  error: string;
  /** Código de error estructurado (ej: NON_TERMINAL_SOURCE, TIMEOUT, etc.) */
  code?: string;
  /** Salida cruda si está disponible (útil para diagnóstico) */
  raw?: string;
  /** Evidencia del contexto del fallo */
  evidence: IosExecutionEvidence;
}

/**
 * Unión de éxito o fallo de ejecución IOS.
 */
export type IosExecutionResult<TParsed = unknown> =
  | IosExecutionSuccess<TParsed>
  | IosExecutionFailure;

/**
 * Resultado de aplicar configuración IOS.
 * Solo indica que los comandos se ejecutaron — NO que quedaron verificados.
 */
export interface IosConfigCommandResult {
  index: number;
  command: string;
  ok: boolean;
  output: string;
}

export interface IosConfigApplyResult {
  executed: true;
  device: string;
  commands: string[];
  results: IosConfigCommandResult[];
  evidence: IosExecutionEvidence;
}

/**
 * Deriva el nivel de confianza a partir de evidencia + verificación opcional.
 */
export function deriveIosConfidence(
  evidence: IosExecutionEvidence,
  verification?: { verified: boolean; partiallyVerified?: boolean }
): IosConfidence {
  if (evidence.source !== "terminal") return "non_terminal";
  if (!verification) return "executed";
  if (verification.verified) return "verified";
  if (verification.partiallyVerified) return "partially_verified";
  return "unverified";
}
