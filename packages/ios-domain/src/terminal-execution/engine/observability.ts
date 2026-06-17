// ============================================================================
// Terminal Observability - Funciones de observabilidad y confianza
// ============================================================================
// Proporciona métricas de confianza y diagnóstico para el terminal.
// Extraído de command-executor.ts para separar la lógica de métricas.

/**
 * Niveles de confianza para el resultado de un comando.
 */
export type ConfidenceLevel = "high" | "medium" | "low" | "failure";

/**
 * Calcula el nivel de confianza del resultado de un comando.
 * Analiza múltiples factores para determinar la calidad del output.
 * Extraído de command-executor.ts lines 146-177.
 */
export function computeConfidenceString(
  cmdOk: boolean,
  warnings: string[],
  output: string,
  modeMatched: boolean,
  promptMatched: boolean,
  startedSeen: boolean,
  endedSeen: boolean,
  outputEvents: number,
): ConfidenceLevel {
  if (!cmdOk) return "failure";

  const factors: string[] = [];

  if (!startedSeen) factors.push("no-started");
  if (!endedSeen) factors.push("no-ended");
  if (outputEvents === 0) factors.push("no-events");
  if (!output.trim()) factors.push("empty-output");
  if (!modeMatched) factors.push("mode-mismatch");
  if (!promptMatched) factors.push("prompt-mismatch");
  if (warnings.length > 0) factors.push("warnings");

  if (factors.length === 0 && startedSeen && endedSeen && output.trim()) {
    return "high";
  }

  if (factors.length <= 2 && (startedSeen || endedSeen) && output.trim()) {
    return "medium";
  }

  return "low";
}

/**
 * Versión simplificada que recibe los factores ya calculados.
 */
export function computeConfidenceFromFactors(input: {
  startedSeen: boolean;
  endedSeen: boolean;
  outputEvents: number;
  hasOutput: boolean;
  modeMatched: boolean;
  promptMatched: boolean;
  warningCount: number;
}): ConfidenceLevel {
  const { startedSeen, endedSeen, outputEvents, hasOutput, modeMatched, promptMatched, warningCount } = input;

  const factors: string[] = [];
  if (!startedSeen) factors.push("no-started");
  if (!endedSeen) factors.push("no-ended");
  if (outputEvents === 0) factors.push("no-events");
  if (!hasOutput) factors.push("empty-output");
  if (!modeMatched) factors.push("mode-mismatch");
  if (!promptMatched) factors.push("prompt-mismatch");
  if (warningCount > 0) factors.push("warnings");

  if (factors.length === 0 && startedSeen && endedSeen && hasOutput) {
    return "high";
  }

  if (factors.length <= 2 && (startedSeen || endedSeen) && hasOutput) {
    return "medium";
  }

  return "low";
}

/**
 * Analiza el output para detectar anomalías.
 */
export interface AnomalyReport {
  hasAsyncNoise: boolean;
  hasEmptyOutput: boolean;
  hasPager: boolean;
  hasConfirmPrompt: boolean;
  hasWizard: boolean;
  hasDnsHangup: boolean;
  anomalyCount: number;
}

export function detectAnomalies(output: string): AnomalyReport {
  const text = output.toLowerCase();

  return {
    hasAsyncNoise: /^%[A-Z0-9_-]+-\d+-[A-Z0-9_-]+:/m.test(output),
    hasEmptyOutput: !output.trim(),
    hasPager: /--More--/i.test(output),
    hasConfirmPrompt: /\[confirm\]|\[yes\/no\]|\(y\/n\)/i.test(text),
    hasWizard: /initial configuration dialog|would you like to enter/i.test(text),
    hasDnsHangup: /translating\s+["']?.+["']?\.\.\./i.test(text),
    anomalyCount: 0,
  };
}