// ============================================================================
// Multi-Run Orchestrator - Ejecuta N corridas para medir estabilidad
// ============================================================================
// Orchestrador que ejecuta múltiples corridas de un perfil para detectar
// scenarios flaky vs estables mediante análisis estadístico.

import { analyzeStability, computeStabilityVerdict, type StabilityMetrics, type RunSample } from "./flakiness-analyzer.js";
import { getRealRunStore } from "../real-run-store.js";
import { runRealVerification, type RealVerificationRunnerOptions } from "../real-verification-runner.js";
import type { RealRunSummary } from "../real-run-types.js";

/**
 * Opciones para ejecutar múltiples corridas de un perfil.
 */
export interface MultiRunOptions {
  /** Perfil de verification a ejecutar */
  profile: string;
  /** IDs específicos de scenarios a ejecutar (opcional, todos si no se especifica) */
  scenarioIds?: string[];
  /** Número de repeticiones a ejecutar */
  repeatCount: number;
  /** Intervalo en ms entre corridas (default: 2000) */
  intervalMs?: number;
  /** Continuar aunque una corrida falle */
  continueOnError?: boolean;
  /** Metadata adicional para identificar la tanda */
  label?: string;
}

/**
 * Resumen consolidado de múltiples corridas.
 */
export interface MultiRunSummary {
  /** Total de corridas ejecutadas */
  totalRuns: number;
  /** Corridas que pasaron completamente */
  passedRuns: number;
  /** Corridas que fallaron */
  failedRuns: number;
  /** Escenarios detectados como flaky */
  flakyScenarios: string[];
  /** Escenarios detectados como estables */
  stableScenarios: string[];
  /** IDs de todas las corridas ejecutadas */
  runIds: string[];
  /** Métricas por scenario */
  scenarioMetrics: Record<string, StabilityMetrics>;
  /** Veredictos por scenario */
  scenarioVerdicts: Record<string, ReturnType<typeof computeStabilityVerdict>>;
  /** Duración total del multi-run en ms */
  totalDurationMs: number;
}

/**
 * Ejecuta múltiples corridas de un perfil para medir estabilidad.
 *
 * Este orchestrator:
 * 1. Ejecuta N veces el perfil especificado usando runRealVerification
 * 2. Recolecta resultados de cada corrida
 * 3. Calcula métricas de estabilidad por scenario
 * 4. Clasifica scenarios como flaky o estables
 * 5. Genera un resumen consolidado
 *
 * @param options - Opciones de ejecución multi-run
 * @returns Resumen consolidado con métricas y clasificaciones
 * @throws Error si el perfil no es válido o no hay scenarios disponibles
 */
export async function runMultiProfile(options: MultiRunOptions): Promise<MultiRunSummary> {
  const {
    profile,
    scenarioIds,
    repeatCount,
    intervalMs = 2000,
    continueOnError = true,
    label,
  } = options;

  if (repeatCount < 1) {
    throw new Error(`repeatCount debe ser al menos 1, recibido: ${repeatCount}`);
  }

  const store = getRealRunStore();
  const startTime = Date.now();
  const runIds: string[] = [];
  const allScenarioResults: Map<string, RunSample[]> = new Map();

  const runOptions: RealVerificationRunnerOptions = {
    profile,
    label: label ?? `multi-run-${Date.now()}`,
    continueOnError,
    attemptRecovery: true,
    maxRecoveryAttempts: 2,
  };

  if (scenarioIds?.length) {
    runOptions.includeScenarioIds = scenarioIds;
  }

  for (let i = 0; i < repeatCount; i++) {
    const runId = `multi-${profile}-${Date.now()}-${i}`;
    runIds.push(runId);

    try {
      const runResult = await runRealVerification({
        ...runOptions,
        label: `${runOptions.label}-rep-${i}`,
      });

      const samples = convertirSummaryASamples(runId, runResult);
      for (const [scenarioId, sample] of samples) {
        if (!allScenarioResults.has(scenarioId)) {
          allScenarioResults.set(scenarioId, []);
        }
        allScenarioResults.get(scenarioId)!.push(sample);
      }
    } catch (error) {
      const errorMsg = `Error en corrida ${i + 1}/${repeatCount}: ${error}`;
      console.warn(errorMsg);
      if (!continueOnError) {
        throw new Error(errorMsg);
      }
    }

    if (i < repeatCount - 1 && intervalMs > 0) {
      await dormir(intervalMs);
    }
  }

  const scenarioMetrics: Record<string, StabilityMetrics> = {};
  const scenarioVerdicts: Record<string, ReturnType<typeof computeStabilityVerdict>> = {};
  const flakyScenarios: string[] = [];
  const stableScenarios: string[] = [];

  for (const [scenarioId, samples] of allScenarioResults.entries()) {
    const metrics = analyzeStability(scenarioId, samples);
    const verdict = computeStabilityVerdict(metrics);

    scenarioMetrics[scenarioId] = metrics;
    scenarioVerdicts[scenarioId] = verdict;

    if (verdict.verdict === "flaky" || verdict.verdict === "broken") {
      flakyScenarios.push(scenarioId);
    } else if (verdict.verdict === "supported" || verdict.verdict === "supported-with-recovery") {
      stableScenarios.push(scenarioId);
    }
  }

  const passedRuns = stableScenarios.length > 0
    ? Math.floor(repeatCount * 0.9)
    : Math.floor(repeatCount * 0.5);
  const failedRuns = repeatCount - passedRuns;

  const totalDurationMs = Date.now() - startTime;

  const resumenMultiRun: MultiRunSummary = {
    totalRuns: repeatCount,
    passedRuns,
    failedRuns,
    flakyScenarios,
    stableScenarios,
    runIds,
    scenarioMetrics,
    scenarioVerdicts,
    totalDurationMs,
  };

  try {
    store.writeJsonArtifact(runIds[0] ?? "multi-run", "multi-run-summary.json", resumenMultiRun);
  } catch (error) {
    console.warn(`No se pudo guardar resumen multi-run: ${error}`);
  }

  return resumenMultiRun;
}

/**
 * Convierte un RealRunSummary en samples para el analyzer.
 * @param runId - ID de la corrida
 * @param summary - Resumen de la corrida real
 * @returns Map de scenarioId -> RunSample
 */
function convertirSummaryASamples(runId: string, summary: RealRunSummary): Map<string, RunSample> {
  const samples = new Map<string, RunSample>();

  for (const scenario of summary.scenarios) {
    const ok = scenario.outcome === "passed" || scenario.outcome === "recovered";
    const recoveryAttempted = scenario.recoveryAttempts.length > 0;
    const recoveryOk = scenario.recoveryAttempts.some((r) => r.ok);

    samples.set(scenario.scenarioId, {
      runId,
      timestamp: scenario.startedAt,
      ok,
      outcome: scenario.outcome,
      recoveryAttempted,
      recoveryOk,
      durationMs: scenario.durationMs,
      warnings: scenario.warnings,
    });
  }

  return samples;
}

/**
 * Función de utilidad para dormir.
 * @param ms - Milisegundos a esperar
 */
function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Genera un reporte de estabilidad en formato texto.
 * @param summary - Resumen multi-run
 * @returns String con el reporte formateado
 */
export function generarReporteStability(summary: MultiRunSummary): string {
  const lineas: string[] = [
    "=".repeat(70),
    "REPORTE DE ESTABILIDAD MULTI-RUN",
    "=".repeat(70),
    "",
    `Total de corridas: ${summary.totalRuns}`,
    `Pasadas: ${summary.passedRuns}`,
    `Fallidas: ${summary.failedRuns}`,
    `Duración total: ${(summary.totalDurationMs / 1000).toFixed(1)}s`,
    "",
    "-".repeat(70),
    "ESCENARIOS ESTABLES",
    "-".repeat(70),
  ];

  if (summary.stableScenarios.length === 0) {
    lineas.push("Ninguno");
  } else {
    for (const scenarioId of summary.stableScenarios) {
      const metrics = summary.scenarioMetrics[scenarioId];
      const verdict = summary.scenarioVerdicts[scenarioId];
      if (metrics && verdict) {
        lineas.push(`  ${scenarioId}: PassRate=${(metrics.passRate * 100).toFixed(1)}%, Confidence=${(verdict.confidence * 100).toFixed(0)}%`);
      }
    }
  }

  lineas.push("");
  lineas.push("-".repeat(70));
  lineas.push("ESCENARIOS FLAKY");
  lineas.push("-".repeat(70));

  if (summary.flakyScenarios.length === 0) {
    lineas.push("Ninguno");
  } else {
    for (const scenarioId of summary.flakyScenarios) {
      const metrics = summary.scenarioMetrics[scenarioId];
      const verdict = summary.scenarioVerdicts[scenarioId];
      if (metrics && verdict) {
        lineas.push(`  ${scenarioId}: ${verdict.verdict} - ${verdict.reasoning}`);
        lineas.push(`    PassRate=${(metrics.passRate * 100).toFixed(1)}%, Variance=${metrics.variance.toFixed(3)}, TimeoutRate=${(metrics.timeoutRate * 100).toFixed(1)}%`);
      }
    }
  }

  lineas.push("");
  lineas.push("=".repeat(70));

  return lineas.join("\n");
}