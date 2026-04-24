// ============================================================================
// Flakiness Analyzer - Analiza estabilidad de corridas
// ============================================================================
// Módulo para detectar flaky scenarios, calcular métricas de estabilidad y
// generar veredictos de confiabilidad basados en múltiples corridas.

/**
 * Métricas de estabilidad para un capability o scenario específico.
 */
export interface StabilityMetrics {
  /** Identificador del capability o scenario */
  capabilityId: string;
  /** Número de muestras (corridas) analizadas */
  sampleSize: number;
  /** Tasa de éxito (0-1) */
  passRate: number;
  /** Tasa de recuperación exitosa (0-1) */
  recoveryRate: number;
  /** Tasa de timeouts (0-1) */
  timeoutRate: number;
  /** Varianza de la duración de las corridas */
  variance: number;
  /** Tasa de verificación cruzada exitosa */
  crossVerificationRate: number;
  /** Clasificación de estabilidad */
  stability: "stable" | "flaky" | "unstable" | "insufficient-data";
}

/**
 * Muestra de una corrida individual para análisis de estabilidad.
 */
export interface RunSample {
  /** Identificador único de la corrida */
  runId: string;
  /** Timestamp de la corrida */
  timestamp: number;
  /** Si la corrida pasó o falló */
  ok: boolean;
  /** Outcome de la corrida */
  outcome: string;
  /** Si se intentó recuperación */
  recoveryAttempted: boolean;
  /** Si la recuperación fue exitosa */
  recoveryOk: boolean;
  /** Duración en milisegundos */
  durationMs: number;
  /** Warnings capturados durante la corrida */
  warnings: string[];
}

/**
 * Calcula la varianza de los durations de una muestra de corridas.
 * @param durations - Array de duraciones en ms
 * @returns Varianza calculada
 */
function calcularVarianza(durations: number[]): number {
  if (durations.length === 0) return 0;
  const media = durations.reduce((a, b) => a + b, 0) / durations.length;
  const sumaCuadrados = durations.reduce((acc, d) => acc + Math.pow(d - media, 2), 0);
  return sumaCuadrados / durations.length;
}

/**
 * Calcula el pass rate de una muestra de corridas.
 * @param samples - Muestra de corridas
 * @returns Pass rate entre 0 y 1
 */
function calcularPassRate(samples: RunSample[]): number {
  if (samples.length === 0) return 0;
  const passed = samples.filter((s) => s.ok).length;
  return passed / samples.length;
}

/**
 * Calcula el recovery rate de una muestra de corridas.
 * Solo considera corridas que intentaron recuperación.
 * @param samples - Muestra de corridas
 * @returns Recovery rate entre 0 y 1
 */
function calcularRecoveryRate(samples: RunSample[]): number {
  const conRecuperacion = samples.filter((s) => s.recoveryAttempted);
  if (conRecuperacion.length === 0) return 0;
  const recuperadas = conRecuperacion.filter((s) => s.recoveryOk).length;
  return recuperadas / conRecuperacion.length;
}

/**
 * Calcula el timeout rate de una muestra de corridas.
 * @param samples - Muestra de corridas
 * @param thresholdMs - Umbral en ms para considerar timeout (default: 60000)
 * @returns Timeout rate entre 0 y 1
 */
function calcularTimeoutRate(samples: RunSample[], thresholdMs = 60000): number {
  if (samples.length === 0) return 0;
  const timeouts = samples.filter((s) => s.durationMs > thresholdMs).length;
  return timeouts / samples.length;
}

/**
 * Calcula el cross-verification rate basado en warnings.
 * Escenarios con muchos warnings son menos confiables.
 * @param samples - Muestra de corridas
 * @returns Cross-verification rate entre 0 y 1
 */
function calcularCrossVerificationRate(samples: RunSample[]): number {
  if (samples.length === 0) return 0;
  const confiables = samples.filter((s) => s.warnings.length <= 2).length;
  return confiables / samples.length;
}

/**
 * Clasifica la estabilidad basado en las métricas calculadas.
 * @param passRate - Tasa de éxito
 * @param variance - Varianza de duración
 * @param sampleSize - Tamaño de muestra
 * @returns Clasificación de estabilidad
 */
function clasificarEstabilidad(
  passRate: number,
  variance: number,
  sampleSize: number
): StabilityMetrics["stability"] {
  if (sampleSize < 3) return "insufficient-data";

  if (passRate >= 0.95 && variance < 0.3) return "stable";
  if (passRate >= 0.7 && variance < 0.5) return "flaky";
  if (passRate >= 0.5) return "unstable";
  return "flaky";
}

/**
 * Analiza la estabilidad de una muestra de corridas para un capability específico.
 *
 * Este análisis permite detectar:
 * - Escenarios que fallan intermitentemente (flaky)
 * - Escenarios con alta varianza en duración
 * - Escenarios con problemas de recuperación
 *
 * @param capabilityId - Identificador del capability o scenario
 * @param samples - Array de muestras de corridas
 * @returns Métricas de estabilidad calculadas
 */
export function analyzeStability(
  capabilityId: string,
  samples: RunSample[]
): StabilityMetrics {
  if (samples.length === 0) {
    return {
      capabilityId,
      sampleSize: 0,
      passRate: 0,
      recoveryRate: 0,
      timeoutRate: 0,
      variance: 0,
      crossVerificationRate: 0,
      stability: "insufficient-data",
    };
  }

  const durations = samples.map((s) => s.durationMs);
  const passRate = calcularPassRate(samples);
  const recoveryRate = calcularRecoveryRate(samples);
  const timeoutRate = calcularTimeoutRate(samples);
  const variance = calcularVarianza(durations);
  const crossVerificationRate = calcularCrossVerificationRate(samples);
  const stability = clasificarEstabilidad(passRate, variance, samples.length);

  return {
    capabilityId,
    sampleSize: samples.length,
    passRate,
    recoveryRate,
    timeoutRate,
    variance,
    crossVerificationRate,
    stability,
  };
}

/**
 * Veredicto de estabilidad retornado por computeStabilityVerdict.
 */
export type StabilityVerdict = "supported" | "supported-with-recovery" | "partial" | "flaky" | "broken" | "insufficient-data";

/**
 * Calcula el coeficiente de variación (CV) para evaluar dispersión.
 * @param durations - Array de duraciones en ms
 * @returns Coeficiente de variación (0 = sin dispersión)
 */
function calcularCoeficienteVariacion(durations: number[]): number {
  if (durations.length === 0) return 0;
  const media = durations.reduce((a, b) => a + b, 0) / durations.length;
  if (media === 0) return 0;
  const varianza = calcularVarianza(durations);
  return Math.sqrt(varianza) / media;
}

/**
 * Genera un veredicto de estabilidad con confianza y razonamiento.
 *
 * El veredicto indica si un capability está:
 * - supported: Funciona consistentemente
 * - supported-with-recovery: Funciona pero requiere mecanismo de recovery
 * - partial: Funciona parcialmente (algunos scenarios fallan)
 * - flaky: Fallo intermitente no predecible
 * - broken: No funciona en absoluto
 * - insufficient-data: No hay suficientes datos para decidir
 *
 * @param metrics - Métricas de estabilidad previamente calculadas
 * @returns Veredicto con confianza (0-1) y razonamiento detallado
 */
export function computeStabilityVerdict(
  metrics: StabilityMetrics
): {
  verdict: StabilityVerdict;
  confidence: number;
  reasoning: string;
} {
  const { sampleSize, passRate, recoveryRate, timeoutRate, variance, crossVerificationRate, stability } = metrics;

  // Caso: datos insuficientes
  if (stability === "insufficient-data" || sampleSize < 3) {
    return {
      verdict: "insufficient-data",
      confidence: Math.min(sampleSize / 5, 0.5),
      reasoning: `Muestra insuficiente (n=${sampleSize}). Se necesitan al menos 3 corridas para evaluar estabilidad.`,
    };
  }

  // Caso: capability roto (passRate muy bajo)
  if (passRate < 0.2) {
    return {
      verdict: "broken",
      confidence: 0.95,
      reasoning: `Capability permanentemente fallido. PassRate=${(passRate * 100).toFixed(1)}% en ${sampleSize} corridas.`,
    };
  }

  // Caso: flaky (passRate moderado con alta varianza)
  if (stability === "flaky" || (passRate < 0.8 && variance > 0.4)) {
    const razonamiento = `Comportamiento intermitente detectado. PassRate=${(passRate * 100).toFixed(1)}%, Variance=${variance.toFixed(3)}, TimeoutRate=${(timeoutRate * 100).toFixed(1)}%.`;
    return {
      verdict: "flaky",
      confidence: 0.85,
      reasoning: razonamiento,
    };
  }

  // Caso: funciona pero con problemas de recovery
  if (passRate >= 0.8 && recoveryRate < 0.5 && timeoutRate > 0.1) {
    return {
      verdict: "supported-with-recovery",
      confidence: 0.75,
      reasoning: `Funciona con recuperación. PassRate=${(passRate * 100).toFixed(1)}%, RecoveryRate=${(recoveryRate * 100).toFixed(1)}%, TimeoutRate=${(timeoutRate * 100).toFixed(1)}%.`,
    };
  }

  // Caso: partial (funciona parcialmente)
  if (passRate >= 0.6 && passRate < 0.95) {
    return {
      verdict: "partial",
      confidence: 0.8,
      reasoning: `Funciona parcialmente. PassRate=${(passRate * 100).toFixed(1)}% en ${sampleSize} corridas. Considerar investigación adicional.`,
    };
  }

  // Caso: supported (funciona consistentemente)
  if (passRate >= 0.95 && variance < 0.3 && crossVerificationRate >= 0.8) {
    const cv = calcularCoeficienteVariacion([metrics.sampleSize]);
    return {
      verdict: "supported",
      confidence: 0.92,
      reasoning: `Capability estable y confiable. PassRate=${(passRate * 100).toFixed(1)}%, CV=${cv.toFixed(3)}.`,
    };
  }

  // Caso por defecto: partial
  return {
    verdict: "partial",
    confidence: 0.6,
    reasoning: `Resultados mixtos. PassRate=${(passRate * 100).toFixed(1)}%, CrossVerificationRate=${(crossVerificationRate * 100).toFixed(1)}%.`,
  };
}