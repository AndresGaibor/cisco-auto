// ============================================================================
// Stability Module - Índice de tipos y exportaciones
// ============================================================================
// Módulo de estabilidad y regresión para verification.
// Proporciona análisis de flaky scenarios, multi-run orchestration
// y gestión de baselines para detectar regresiones.

// Re-exportar tipos y funciones de cada submódulo
export type { StabilityMetrics, RunSample, StabilityVerdict } from "./flakiness-analyzer.js";
export { analyzeStability, computeStabilityVerdict } from "./flakiness-analyzer.js";

export type { MultiRunOptions, MultiRunSummary } from "./multi-run-orchestrator.js";
export { runMultiProfile, generarReporteStability } from "./multi-run-orchestrator.js";

export type { Baseline, BaselineComparison } from "./baseline-manager.js";
export {
  saveBaseline,
  getBaseline,
  compareToBaseline,
  listBaselines,
  deleteBaseline,
  generarReporteComparacion,
} from "./baseline-manager.js";

export type { RetryPolicyConfig, RetryAttempt, RetryState } from "./retry-policy.js";
export {
  RetryPolicy,
  NETWORK_RETRY_POLICY,
  FILE_RETRY_POLICY,
  PT_RETRY_POLICY,
  crearRetryPolicy,
} from "./retry-policy.js";

export type {
  FlakeObservation,
  FlakeSeries,
  FlakeClassification,
  FlakeClassificationResult,
  FlakeClassifierConfig,
} from "./flake-classifier.js";
export { FlakeClassifier, crearFlakeSeriesFromResults } from "./flake-classifier.js";

export type {
  TimingSample,
  TimingMetrics,
  TimingComparison,
  TimingHistory,
  TimingCollectorConfig,
} from "./timing-metrics.js";
export {
  TimingCollector,
  crearTimingSummary,
  formatDuration,
  generarTimingReport,
} from "./timing-metrics.js";

export type { E2EBaseline, E2EBaselineTiming, E2EComparison } from "./e2e-baseline-store.js";
export {
  saveE2EBaseline,
  getE2EBaseline,
  listE2EBaselines,
  compareE2EBaseline,
  generarReporteComparacionE2E,
} from "./e2e-baseline-store.js";