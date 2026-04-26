// ============================================================================
// E2E Report Types - Tipos de reportes E2E
// ============================================================================
// Estructuras de datos para reportes de pruebas E2E.
// Proporciona tipos para generar reportes estructurados y textuales.

import type { E2EScenario, E2EStepResult, E2EOutcome } from "./e2e-scenario.js";

/**
 * Resultado completo de ejecutar un escenario E2E.
 */
export interface E2ERunResult {
  /** Escenario que se ejecutó */
  scenario: E2EScenario;
  /** ID de la corrida */
  runId: string;
  /** Timestamp de inicio */
  startedAt: number;
  /** Timestamp de fin */
  completedAt: number;
  /** Duración total en ms */
  durationMs: number;
  /** Outcome general del escenario */
  outcome: E2ERunOutcome;
  /** Resultados de cada paso */
  stepResults: E2EStepResult[];
  /** Evidencia recopilada */
  evidence: E2EEvidenceBundle;
  /** Warnings capturados */
  warnings: string[];
  /** Error si falló */
  error?: string;
  /** Metadata adicional */
  metadata: E2ERunMetadata;
}

export type E2ERunOutcome = "passed" | "failed" | "skipped" | "aborted" | "error";

/**
 * Evidencia捆 bundle recopilada durante la corrida.
 */
export interface E2EEvidenceBundle {
  /** Topología antes de ejecutar */
  topologyBefore?: Record<string, unknown>;
  /** Topología después de ejecutar */
  topologyAfter?: Record<string, unknown>;
  /** Outputs de comandos ejecutados */
  commandOutputs: Record<string, unknown>;
  /** Estados de dispositivos */
  deviceStates: Record<string, Record<string, unknown>>;
  /** Snapshots capturados */
  snapshots: Record<string, unknown>;
}

/**
 * Metadata de una corrida E2E.
 */
export interface E2ERunMetadata {
  /** Profile utilizado */
  profile: string;
  /** Tags del escenario */
  tags: string[];
  /** Número de retry */
  retryCount: number;
  /** Si fue recovery */
  isRecovery: boolean;
  /** Versión del bridge */
  bridgeVersion?: string;
}

/**
 * Reporte consolidado de múltiples corridas E2E.
 */
export interface E2EReport {
  /** ID único del reporte */
  reportId: string;
  /** Timestamp de generación */
  generatedAt: number;
  /** Perfil ejecutado */
  profile: string;
  /** Total de escenarios ejecutados */
  totalScenarios: number;
  /** Escenarios que pasaron */
  passedScenarios: number;
  /** Escenarios que fallaron */
  failedScenarios: number;
  /** Escenarios saltados */
  skippedScenarios: number;
  /** Duración total en ms */
  totalDurationMs: number;
  /** Resultados por escenario */
  scenarioResults: E2EScenarioReport[];
  /** Resumen de outcomes */
  outcomeSummary: E2EOutcomeSummary;
  /** Configuración del reporte */
  config: E2EReportConfig;
}

export interface E2EOutcomeSummary {
  passed: number;
  failed: number;
  skipped: number;
  aborted: number;
  error: number;
}

export interface E2EScenarioReport {
  scenarioId: string;
  title: string;
  outcome: E2ERunOutcome;
  durationMs: number;
  stepsPassed: number;
  stepsFailed: number;
  stepsTotal: number;
  firstFailure?: string;
  tags: string[];
}

export interface E2EReportConfig {
  includeEvidence?: boolean;
  includeOutputs?: boolean;
  includeTopology?: boolean;
  maxOutputLength?: number;
  format: "json" | "text" | "html";
}

/**
 * Resumen de métricas de timing para un reporte.
 */
export interface E2ETimingSummary {
  /** Tiempo promedio por paso */
  avgStepDurationMs: Record<string, number>;
  /** Percentiles de duración */
  stepDurationPercentiles: Record<string, {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  }>;
  /** Escenarios más lentos */
  slowestScenarios: Array<{ scenarioId: string; durationMs: number }>;
  /** Escenarios más rápidos */
  fastestScenarios: Array<{ scenarioId: string; durationMs: number }>;
}

/**
 * Genera un resumen de timing desde un reporte.
 */
export function generarTimingSummary(report: E2EReport): E2ETimingSummary {
  const scenarioResults = report.scenarioResults;

  const avgStepDurationMs: Record<string, number[]> = {};
  const slowestScenarios: Array<{ scenarioId: string; durationMs: number }> = [];
  const fastestScenarios: Array<{ scenarioId: string; durationMs: number }> = [];

  for (const result of scenarioResults) {
    if (result.stepsTotal > 0) {
      const avg = result.durationMs / result.stepsTotal;
      if (!avgStepDurationMs[result.scenarioId]) {
        avgStepDurationMs[result.scenarioId] = [];
      }
      avgStepDurationMs[result.scenarioId]!.push(avg);
    }

    slowestScenarios.push({ scenarioId: result.scenarioId, durationMs: result.durationMs });
    fastestScenarios.push({ scenarioId: result.scenarioId, durationMs: result.durationMs });
  }

  slowestScenarios.sort((a, b) => b.durationMs - a.durationMs);
  fastestScenarios.sort((a, b) => a.durationMs - b.durationMs);

  const stepDurationPercentiles: E2ETimingSummary["stepDurationPercentiles"] = {};
  for (const [scenarioId, durations] of Object.entries(avgStepDurationMs)) {
    const sorted = [...durations].sort((a, b) => a - b);
    stepDurationPercentiles[scenarioId] = {
      p50: percentile(sorted, 50),
      p90: percentile(sorted, 90),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
    };
  }

  return {
    avgStepDurationMs: Object.fromEntries(
      Object.entries(avgStepDurationMs).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length])
    ),
    stepDurationPercentiles,
    slowestScenarios: slowestScenarios.slice(0, 5),
    fastestScenarios: fastestScenarios.slice(0, 5),
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

/**
 * Genera un reporte textual desde un E2EReport.
 */
export function generarReporteTexto(report: E2EReport): string {
  const lineas: string[] = [
    "=".repeat(70),
    `REPORTE E2E: ${report.profile}`,
    "=".repeat(70),
    "",
    `Generado: ${new Date(report.generatedAt).toISOString()}`,
    `Total escenarios: ${report.totalScenarios}`,
    "",
    "-".repeat(70),
    "RESUMEN DE OUTCOMES",
    "-".repeat(70),
    `  Pasados:    ${report.outcomeSummary.passed}`,
    `  Fallidos:   ${report.outcomeSummary.failed}`,
    `  Saltados:   ${report.outcomeSummary.skipped}`,
    `  Abortados:  ${report.outcomeSummary.aborted}`,
    `  Errores:    ${report.outcomeSummary.error}`,
    "",
  ];

  if (report.outcomeSummary.failed > 0 || report.outcomeSummary.error > 0) {
    lineas.push("-".repeat(70));
    lineas.push("ESCENARIOS FALLIDOS");
    lineas.push("-".repeat(70));

    for (const result of report.scenarioResults) {
      if (result.outcome === "failed" || result.outcome === "error") {
        lineas.push(`  ${result.scenarioId}: ${result.outcome}`);
        if (result.firstFailure) {
          lineas.push(`    Primer fallo: ${result.firstFailure}`);
        }
        lineas.push(`    Pasos: ${result.stepsPassed}/${result.stepsTotal}`);
        lineas.push(`    Duración: ${(result.durationMs / 1000).toFixed(1)}s`);
        lineas.push("");
      }
    }
  }

  lineas.push("-".repeat(70));
  lineas.push("ESCENARIOS PASADOS");
  lineas.push("-".repeat(70));

  for (const result of report.scenarioResults) {
    if (result.outcome === "passed") {
      lineas.push(
        `  ${result.scenarioId}: OK (${(result.durationMs / 1000).toFixed(1)}s, ${result.stepsPassed}/${result.stepsTotal} pasos)`
      );
    }
  }

  lineas.push("");
  lineas.push("=".repeat(70));

  return lineas.join("\n");
}

/**
 * Crea un E2EReport desde un array de E2ERunResult.
 */
export function crearE2EReport(
  results: E2ERunResult[],
  profile: string,
  config: E2EReportConfig
): E2EReport {
  const outcomeSummary: E2EOutcomeSummary = {
    passed: 0,
    failed: 0,
    skipped: 0,
    aborted: 0,
    error: 0,
  };

  const scenarioResults: E2EScenarioReport[] = results.map((r) => {
    outcomeSummary[r.outcome]++;

    const stepsPassed = r.stepResults.filter((s) => s.outcome === "passed").length;
    const stepsFailed = r.stepResults.filter((s) => s.outcome === "failed").length;
    const firstFailure = r.stepResults.find((s) => s.outcome === "failed")?.stepId;

    return {
      scenarioId: r.scenario.id,
      title: r.scenario.title,
      outcome: r.outcome,
      durationMs: r.durationMs,
      stepsPassed,
      stepsFailed,
      stepsTotal: r.stepResults.length,
      firstFailure,
      tags: r.scenario.tags,
    };
  });

  return {
    reportId: `e2e-report-${Date.now()}`,
    generatedAt: Date.now(),
    profile,
    totalScenarios: results.length,
    passedScenarios: outcomeSummary.passed,
    failedScenarios: outcomeSummary.failed,
    skippedScenarios: outcomeSummary.skipped,
    totalDurationMs: results.reduce((acc, r) => acc + r.durationMs, 0),
    scenarioResults,
    outcomeSummary,
    config,
  };
}
