// ============================================================================
// Flake Classifier - Clasificador de flakes
// ============================================================================
// Clasifica tests y escenarios como flaky, estable, o roto basándose
// en patrones de fallo y estadísticas históricas.

/**
 * Resultado de una corrida individual.
 */
export interface FlakeObservation {
  timestamp: number;
  ok: boolean;
  durationMs: number;
  error?: string;
  retryNumber?: number;
}

/**
 * Serie de observaciones para un test/escenario.
 */
export interface FlakeSeries {
  id: string;
  observations: FlakeObservation[];
  firstSeen: number;
  lastSeen: number;
}

/**
 * Clasificación de un test/escenario.
 */
export type FlakeClassification =
  | "stable"
  | "flaky"
  | "broken"
  | "recovering"
  | "unknown";

/**
 * Detalles de la clasificación.
 */
export interface FlakeClassificationResult {
  id: string;
  classification: FlakeClassification;
  confidence: number;
  reasoning: string;
  passRate: number;
  sampleSize: number;
  recentTrend: "improving" | "stable" | "degrading";
  recommendedAction: string;
}

/**
 * Configuración del clasificador.
 */
export interface FlakeClassifierConfig {
  minSampleSize: number;
  stablePassRateThreshold: number;
  flakyPassRateMin: number;
  flakyPassRateMax: number;
  brokenPassRateMax: number;
  trendWindowSize: number;
  confidenceWeights: {
    sampleSize: number;
    passRate: number;
    trend: number;
    consistency: number;
  };
}

const DEFAULT_CONFIG: FlakeClassifierConfig = {
  minSampleSize: 5,
  stablePassRateThreshold: 0.95,
  flakyPassRateMin: 0.3,
  flakyPassRateMax: 0.94,
  brokenPassRateMax: 0.29,
  trendWindowSize: 5,
  confidenceWeights: {
    sampleSize: 0.3,
    passRate: 0.35,
    trend: 0.2,
    consistency: 0.15,
  },
};

/**
 * Clasificador de flakes basado en reglas.
 */
export class FlakeClassifier {
  private config: FlakeClassifierConfig;

  constructor(config: Partial<FlakeClassifierConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Clasifica un escenario/test basándose en su historial.
   */
  classify(series: FlakeSeries): FlakeClassificationResult {
    const { observations } = series;
    const sampleSize = observations.length;

    if (sampleSize < this.config.minSampleSize) {
      return this.clasificarInsuficienteDatos(series);
    }

    const passRate = this.calcularPassRate(observations);
    const recentTrend = this.calcularTrend(observations);
    const consistency = this.calcularConsistencia(observations);
    const confidence = this.calcularConfianza(sampleSize, passRate, recentTrend, consistency);

    let classification: FlakeClassification;
    let reasoning: string;
    let recommendedAction: string;

    if (passRate <= this.config.brokenPassRateMax) {
      classification = "broken";
      reasoning = `Pass rate muy bajo (${(passRate * 100).toFixed(1)}%). El escenario falla consistentemente.`;
      recommendedAction = "Investigar root cause. Posiblemente remover o deshabilitar.";
    } else if (passRate >= this.config.stablePassRateThreshold) {
      classification = "stable";
      reasoning = `Pass rate alto (${(passRate * 100).toFixed(1)}%). Escenario estable.`;
      recommendedAction = "Monitorear. Considerar reducir reintentos.";
    } else if (passRate >= this.config.flakyPassRateMin && passRate <= this.config.flakyPassRateMax) {
      if (recentTrend === "degrading") {
        classification = "recovering";
        reasoning = `Comportamiento intermitente con tendencia a empeorar. Pass rate=${(passRate * 100).toFixed(1)}%.`;
        recommendedAction = "Investigar. Posible regresión introducida.";
      } else {
        classification = "flaky";
        reasoning = `Comportamiento intermitente. Pass rate=${(passRate * 100).toFixed(1)}%.`;
        recommendedAction = "Agregar retry policy. Investigar condiciones de carrera.";
      }
    } else {
      classification = "unknown";
      reasoning = "Clasificación no determinada.";
      recommendedAction = "Recolectar más datos.";
    }

    return {
      id: series.id,
      classification,
      confidence,
      reasoning,
      passRate,
      sampleSize,
      recentTrend,
      recommendedAction,
    };
  }

  /**
   * Clasifica múltiples series y retorna las flaky.
   */
  classifyBatch(seriesList: FlakeSeries[]): Map<string, FlakeClassificationResult> {
    const results = new Map<string, FlakeClassificationResult>();

    for (const series of seriesList) {
      results.set(series.id, this.classify(series));
    }

    return results;
  }

  /**
   * Filtra series que son flaky.
   */
  getFlakySeries(seriesList: FlakeSeries[]): FlakeSeries[] {
    return seriesList.filter((s) => {
      const result = this.classify(s);
      return result.classification === "flaky" || result.classification === "broken";
    });
  }

  /**
   * Obtiene el ranking de flakes por severidad.
   */
  getFlakeRanking(seriesList: FlakeSeries[]): FlakeClassificationResult[] {
    return seriesList
      .map((s) => this.classify(s))
      .filter((r) => r.classification !== "stable")
      .sort((a, b) => {
        const order: Record<FlakeClassification, number> = { broken: 0, flaky: 1, recovering: 2, unknown: 3, stable: 4 };
        return order[a.classification] - order[b.classification];
      });
  }

  private calcularPassRate(observations: FlakeObservation[]): number {
    if (observations.length === 0) return 0;
    const passed = observations.filter((o) => o.ok).length;
    return passed / observations.length;
  }

  private calcularTrend(observations: FlakeObservation[]): "improving" | "stable" | "degrading" {
    const windowSize = Math.min(this.config.trendWindowSize, observations.length);
    const recent = observations.slice(-windowSize);
    const older = observations.slice(0, windowSize);

    if (older.length === 0) return "stable";

    const recentPassRate = this.calcularPassRate(recent);
    const olderPassRate = this.calcularPassRate(older);

    const delta = recentPassRate - olderPassRate;

    if (delta > 0.1) return "improving";
    if (delta < -0.1) return "degrading";
    return "stable";
  }

  private calcularConsistencia(observations: FlakeObservation[]): number {
    if (observations.length < 2) return 1;

    const durations = observations.map((o) => o.durationMs);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

    if (avg === 0) return 1;

    const variance = durations.reduce((acc, d) => acc + Math.pow(d - avg, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);

    return 1 - Math.min(stdDev / avg, 1);
  }

  private calcularConfianza(
    sampleSize: number,
    passRate: number,
    trend: "improving" | "stable" | "degrading",
    consistency: number
  ): number {
    const { confidenceWeights } = this.config;

    const sampleScore = Math.min(sampleSize / 20, 1);
    const passRateScore = passRate > 0.5 ? passRate : 1 - passRate;
    const trendScore = trend === "stable" ? 1 : trend === "improving" ? 0.8 : 0.5;

    const weightedScore =
      sampleScore * confidenceWeights.sampleSize +
      passRateScore * confidenceWeights.passRate +
      trendScore * confidenceWeights.trend +
      consistency * confidenceWeights.consistency;

    return Math.round(weightedScore * 100) / 100;
  }

  private clasificarInsuficienteDatos(series: FlakeSeries): FlakeClassificationResult {
    const passRate = this.calcularPassRate(series.observations);

    return {
      id: series.id,
      classification: "unknown",
      confidence: series.observations.length / this.config.minSampleSize,
      reasoning: `Datos insuficientes (n=${series.observations.length}). Se necesitan al menos ${this.config.minSampleSize} observaciones.`,
      passRate,
      sampleSize: series.observations.length,
      recentTrend: "stable",
      recommendedAction: "Ejecutar más veces para clasificar correctamente.",
    };
  }

  getConfig(): Readonly<FlakeClassifierConfig> {
    return { ...this.config };
  }
}

/**
 * Crea serie desde resultados de corrida.
 */
export function crearFlakeSeriesFromResults(
  id: string,
  results: Array<{ ok: boolean; durationMs: number; error?: string }>
): FlakeSeries {
  const observations: FlakeObservation[] = results.map((r, i) => ({
    timestamp: Date.now() - (results.length - i) * 60000,
    ok: r.ok,
    durationMs: r.durationMs,
    error: r.error,
  }));

  return {
    id,
    observations,
    firstSeen: observations[0]?.timestamp ?? Date.now(),
    lastSeen: observations[observations.length - 1]?.timestamp ?? Date.now(),
  };
}
