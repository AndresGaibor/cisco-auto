// ============================================================================
// E2E Baseline Store - Almacén de baselines para E2E
// ============================================================================
// Gestiona baselines históricos de corridas E2E para comparaciones
// y detección de regresiones.

import fs from "node:fs";
import path from "node:path";
import type { E2EReport } from "../e2e/e2e-report.js";

/**
 * Baseline histórico de una corrida E2E.
 */
export interface E2EBaseline {
  /** Etiqueta del baseline */
  label: string;
  /** Profile del baseline */
  profile: string;
  /** Timestamp de creación */
  createdAt: number;
  /** Run ID original */
  runId: string;
  /** Resumen de outcomes */
  outcomeSummary: {
    passed: number;
    failed: number;
    skipped: number;
    aborted: number;
    error: number;
  };
  /** Métricas de timing */
  timingMetrics: E2EBaselineTiming;
  /** Escenarios incluidos */
  scenarioIds: string[];
  /** Tags más comunes */
  commonTags: string[];
}

export interface E2EBaselineTiming {
  avgScenarioDurationMs: number;
  avgStepDurationMs: number;
  totalDurationMs: number;
  scenarioCount: number;
  stepCount: number;
}

/**
 * Obtiene la ruta del directorio de baselines E2E.
 */
function obtenerDirectorioBaselines(): string {
  const baseDir = process.env.PT_ARTIFACTS_DIR ?? "/tmp/pt-e2e-artifacts";
  return path.join(baseDir, "baselines");
}

/**
 * Asegura que el directorio exista.
 */
function asegurarDirectorio(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Guarda un baseline E2E desde un reporte.
 */
export function saveE2EBaseline(
  label: string,
  report: E2EReport
): void {
  const baselinesDir = obtenerDirectorioBaselines();
  asegurarDirectorio(baselinesDir);

  const baseline: E2EBaseline = {
    label,
    profile: report.profile,
    createdAt: Date.now(),
    runId: report.reportId,
    outcomeSummary: report.outcomeSummary,
    timingMetrics: {
      avgScenarioDurationMs: report.totalScenarios > 0
        ? report.totalDurationMs / report.totalScenarios
        : 0,
      avgStepDurationMs: report.totalScenarios > 0
        ? report.totalDurationMs / report.scenarioResults.reduce((acc, s) => acc + s.stepsTotal, 0)
        : 0,
      totalDurationMs: report.totalDurationMs,
      scenarioCount: report.totalScenarios,
      stepCount: report.scenarioResults.reduce((acc, s) => acc + s.stepsTotal, 0),
    },
    scenarioIds: report.scenarioResults.map((s) => s.scenarioId),
    commonTags: obtenerTagsComunes(report),
  };

  const filename = `e2e-${report.profile}-${label.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`;
  const filePath = path.join(baselinesDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(baseline, null, 2), "utf-8");
}

/**
 * Obtiene un baseline por etiqueta y profile.
 */
export function getE2EBaseline(label: string, profile: string): E2EBaseline | null {
  const baselinesDir = obtenerDirectorioBaselines();

  if (!fs.existsSync(baselinesDir)) {
    return null;
  }

  const files = fs.readdirSync(baselinesDir);
  const pattern = `e2e-${profile}-${label.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`;
  const matchingFile = files.find((f) => f === pattern);

  if (!matchingFile) {
    return null;
  }

  try {
    const content = fs.readFileSync(path.join(baselinesDir, matchingFile), "utf-8");
    return JSON.parse(content) as E2EBaseline;
  } catch {
    return null;
  }
}

/**
 * Lista todos los baselines disponibles para un profile.
 */
export function listE2EBaselines(profile?: string): string[] {
  const baselinesDir = obtenerDirectorioBaselines();

  if (!fs.existsSync(baselinesDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(baselinesDir);
    let baselines = files
      .filter((f) => f.startsWith("e2e-") && f.endsWith(".json"))
      .map((f) => f.replace(/^e2e-/, "").replace(".json", ""));

    if (profile) {
      baselines = baselines.filter((b) => b.startsWith(`${profile}-`));
    }

    return baselines;
  } catch {
    return [];
  }
}

/**
 * Compara un reporte actual contra un baseline.
 */
export function compareE2EBaseline(
  report: E2EReport,
  baseline: E2EBaseline
): E2EComparison {
  const comparison: E2EComparison = {
    baselineLabel: baseline.label,
    currentReportId: report.reportId,
    comparedAt: Date.now(),
    scenariosCompared: 0,
    scenariosImproved: [],
    scenariosRegressed: [],
    timingDelta: {
      durationDeltaMs: report.totalDurationMs - baseline.timingMetrics.totalDurationMs,
      avgDurationDeltaMs: (report.totalDurationMs / report.totalScenarios) - baseline.timingMetrics.avgScenarioDurationMs,
    },
    outcomeDelta: {
      passedDelta: report.outcomeSummary.passed - baseline.outcomeSummary.passed,
      failedDelta: report.outcomeSummary.failed - baseline.outcomeSummary.failed,
      errorDelta: report.outcomeSummary.error - baseline.outcomeSummary.error,
    },
  };

  for (const result of report.scenarioResults) {
    comparison.scenariosCompared++;
    const baselineIndex = baseline.scenarioIds.indexOf(result.scenarioId);

    if (baselineIndex === -1) {
      if (result.outcome === "passed") {
        comparison.scenariosImproved.push(result.scenarioId);
      } else {
        comparison.scenariosRegressed.push(result.scenarioId);
      }
    }
  }

  return comparison;
}

export interface E2EComparison {
  baselineLabel: string;
  currentReportId: string;
  comparedAt: number;
  scenariosCompared: number;
  scenariosImproved: string[];
  scenariosRegressed: string[];
  timingDelta: {
    durationDeltaMs: number;
    avgDurationDeltaMs: number;
  };
  outcomeDelta: {
    passedDelta: number;
    failedDelta: number;
    errorDelta: number;
  };
}

/**
 * Genera reporte textual de comparación E2E.
 */
export function generarReporteComparacionE2E(
  comparison: E2EComparison
): string {
  const lineas: string[] = [
    "=".repeat(70),
    "COMPARACIÓN E2E CON BASELINE",
    "=".repeat(70),
    "",
    `Baseline: ${comparison.baselineLabel}`,
    `Report: ${comparison.currentReportId}`,
    `Comparado: ${new Date(comparison.comparedAt).toISOString()}`,
    "",
    "-".repeat(70),
    "RESUMEN",
    "-".repeat(70),
    "",
    `Escenarios comparados: ${comparison.scenariosCompared}`,
    `Mejorados: ${comparison.scenariosImproved.length}`,
    `Regredados: ${comparison.scenariosRegressed.length}`,
    "",
    "-".repeat(70),
    "TIMING",
    "-".repeat(70),
    "",
    `Delta duración total: ${formatDelta(comparison.timingDelta.durationDeltaMs)}`,
    `Delta avg por escenario: ${formatDelta(comparison.timingDelta.avgDurationDeltaMs)}`,
    "",
    "-".repeat(70),
    "OUTCOMES",
    "-".repeat(70),
    "",
    `Delta passed: ${formatDelta(comparison.outcomeDelta.passedDelta)}`,
    `Delta failed: ${formatDelta(comparison.outcomeDelta.failedDelta)}`,
    `Delta error: ${formatDelta(comparison.outcomeDelta.errorDelta)}`,
    "",
  ];

  if (comparison.scenariosImproved.length > 0) {
    lineas.push("-".repeat(70));
    lineas.push("MEJORAS");
    lineas.push("-".repeat(70));
    for (const id of comparison.scenariosImproved) {
      lineas.push(`  + ${id}`);
    }
    lineas.push("");
  }

  if (comparison.scenariosRegressed.length > 0) {
    lineas.push("-".repeat(70));
    lineas.push("REGRESIONES");
    lineas.push("-".repeat(70));
    for (const id of comparison.scenariosRegressed) {
      lineas.push(`  - ${id}`);
    }
    lineas.push("");
  }

  lineas.push("=".repeat(70));

  return lineas.join("\n");
}

function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}

function obtenerTagsComunes(report: E2EReport): string[] {
  const tagCounts = new Map<string, number>();

  for (const result of report.scenarioResults) {
    for (const tag of result.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);
}
