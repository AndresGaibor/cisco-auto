// ============================================================================
// Timing Metrics - Métricas de timing para análisis de performance
// ============================================================================
// Colección y análisis de métricas de tiempo para detectar problemas
// de performance y establecer baselines de timing.

/**
 * Métricas de timing para una operación individual.
 */
export interface TimingSample {
  operationId: string;
  timestamp: number;
  durationMs: number;
  ok: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Resumen de métricas de timing.
 */
export interface TimingMetrics {
  operationId: string;
  sampleCount: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  medianMs: number;
  p95Ms: number;
  p99Ms: number;
  stdDevMs: number;
  cv: number;
  outliers: number;
}

/**
 * Comparación de timing contra baseline.
 */
export interface TimingComparison {
  operationId: string;
  current: TimingMetrics;
  baseline: TimingMetrics;
  deltaAvgMs: number;
  deltaP95Ms: number;
  isRegression: boolean;
  regressionPercentage: number;
}

/**
 * Historial de timing para una operación.
 */
export interface TimingHistory {
  operationId: string;
  samples: TimingSample[];
  metrics: TimingMetrics;
  lastUpdated: number;
}

/**
 * Configuración del collector.
 */
export interface TimingCollectorConfig {
  windowSize: number;
  outlierThresholdStdDev: number;
  percentiles: number[];
}

/**
 * Collector de métricas de timing.
 */
export class TimingCollector {
  private history: Map<string, TimingSample[]> = new Map();
  private config: TimingCollectorConfig;

  constructor(config: Partial<TimingCollectorConfig> = {}) {
    this.config = {
      windowSize: config.windowSize ?? 100,
      outlierThresholdStdDev: config.outlierThresholdStdDev ?? 3,
      percentiles: config.percentiles ?? [50, 95, 99],
    };
  }

  /**
   * Registra una muestra de timing.
   */
  record(operationId: string, durationMs: number, ok = true, metadata?: Record<string, unknown>): void {
    if (!this.history.has(operationId)) {
      this.history.set(operationId, []);
    }

    const samples = this.history.get(operationId)!;
    samples.push({
      operationId,
      timestamp: Date.now(),
      durationMs,
      ok,
      metadata,
    });

    if (samples.length > this.config.windowSize) {
      samples.shift();
    }
  }

  /**
   * Obtiene las métricas calculadas para una operación.
   */
  getMetrics(operationId: string): TimingMetrics | null {
    const samples = this.history.get(operationId);
    if (!samples || samples.length === 0) {
      return null;
    }

    return this.calcularMetricas(operationId, samples);
  }

  /**
   * Obtiene todas las operaciones registradas.
   */
  getRegisteredOperations(): string[] {
    return Array.from(this.history.keys());
  }

  /**
   * Compara timing actual contra histórico.
   */
  compareWithBaseline(operationId: string, baselineSamples: TimingSample[]): TimingComparison | null {
    const currentSamples = this.history.get(operationId);
    if (!currentSamples || currentSamples.length === 0) {
      return null;
    }

    const current = this.calcularMetricas(operationId, currentSamples);
    const baseline = this.calcularMetricas(operationId, baselineSamples);

    const deltaAvgMs = current.avgMs - baseline.avgMs;
    const deltaP95Ms = current.p95Ms - baseline.p95Ms;
    const isRegression = deltaAvgMs > baseline.stdDevMs * 2;
    const regressionPercentage = baseline.avgMs > 0
      ? ((deltaAvgMs / baseline.avgMs) * 100)
      : 0;

    return {
      operationId,
      current,
      baseline,
      deltaAvgMs,
      deltaP95Ms,
      isRegression,
      regressionPercentage,
    };
  }

  /**
   * Detecta si una operación es más lenta que el baseline.
   */
  isSlowerThan(operationId: string, baselineSamples: TimingSample[], threshold = 0.2): boolean {
    const current = this.getMetrics(operationId);
    if (!current) return false;

    const baselineAvg = baselineSamples.reduce((a, b) => a + b.durationMs, 0) / baselineSamples.length;
    return current.avgMs > baselineAvg * (1 + threshold);
  }

  /**
   * Limpia el historial de una operación.
   */
  clear(operationId?: string): void {
    if (operationId) {
      this.history.delete(operationId);
    } else {
      this.history.clear();
    }
  }

  /**
   * Obtiene el historial completo.
   */
  getHistory(operationId: string): TimingSample[] {
    return [...(this.history.get(operationId) ?? [])];
  }

  private calcularMetricas(operationId: string, samples: TimingSample[]): TimingMetrics {
    const durations = samples.map((s) => s.durationMs).sort((a, b) => a - b);

    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const median = this.percentile(durations, 50);

    const squaredDiffs = durations.map((d) => Math.pow(d - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    const cv = avg > 0 ? stdDev / avg : 0;

    const p95 = this.percentile(durations, 95);
    const p99 = this.percentile(durations, 99);

    const outlierThreshold = avg + stdDev * this.config.outlierThresholdStdDev;
    const outliers = durations.filter((d) => d > outlierThreshold).length;

    return {
      operationId,
      sampleCount: durations.length,
      minMs: durations[0]!,
      maxMs: durations[durations.length - 1]!,
      avgMs: avg,
      medianMs: median,
      p95Ms: p95,
      p99Ms: p99,
      stdDevMs: stdDev,
      cv,
      outliers,
    };
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }
}

/**
 * Helper para crear timing comparison summary.
 */
export function crearTimingSummary(
  comparisons: TimingComparison[]
): {
  totalOperations: number;
  regressions: number;
  improvements: number;
  stable: number;
  avgRegressionPercentage: number;
  slowestOperation: string | null;
  fastestOperation: string | null;
} {
  let regressions = 0;
  let improvements = 0;
  let stable = 0;
  let totalRegressionPercentage = 0;
  let slowestOperation: string | null = null;
  let fastestOperation: string | null = null;
  let slowestP95 = 0;
  let fastestAvg = Infinity;

  for (const comp of comparisons) {
    if (comp.isRegression) {
      regressions++;
      totalRegressionPercentage += comp.regressionPercentage;
    } else if (comp.deltaAvgMs < -5) {
      improvements++;
    } else {
      stable++;
    }

    if (comp.current.p95Ms > slowestP95) {
      slowestP95 = comp.current.p95Ms;
      slowestOperation = comp.operationId;
    }

    if (comp.current.avgMs < fastestAvg) {
      fastestAvg = comp.current.avgMs;
      fastestOperation = comp.operationId;
    }
  }

  return {
    totalOperations: comparisons.length,
    regressions,
    improvements,
    stable,
    avgRegressionPercentage: regressions > 0 ? totalRegressionPercentage / regressions : 0,
    slowestOperation,
    fastestOperation,
  };
}

/**
 * Formatea duration en string legible.
 */
export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(1)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Genera reporte de timing en texto.
 */
export function generarTimingReport(
  metrics: Map<string, TimingMetrics>
): string {
  const lineas: string[] = [
    "=".repeat(70),
    "REPORTE DE TIMING",
    "=".repeat(70),
    "",
  ];

  for (const [operationId, m] of metrics.entries()) {
    lineas.push(`Operación: ${operationId}`);
    lineas.push(`  Muestras: ${m.sampleCount}`);
    lineas.push(`  Avg: ${formatDuration(m.avgMs)}`);
    lineas.push(`  Median: ${formatDuration(m.medianMs)}`);
    lineas.push(`  P95: ${formatDuration(m.p95Ms)}`);
    lineas.push(`  P99: ${formatDuration(m.p99Ms)}`);
    lineas.push(`  StdDev: ${formatDuration(m.stdDevMs)}`);
    lineas.push(`  CV: ${(m.cv * 100).toFixed(1)}%`);
    lineas.push(`  Outliers: ${m.outliers}`);
    lineas.push("");
  }

  lineas.push("=".repeat(70));

  return lineas.join("\n");
}
