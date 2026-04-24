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