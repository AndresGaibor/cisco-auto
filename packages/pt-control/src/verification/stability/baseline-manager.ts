// ============================================================================
// Baseline Manager - Gestiona baselines por perfil
// ============================================================================
// Manager para almacenar, recuperar y comparar métricas de estabilidad
// contra baselines históricos, detectando regresiones y mejoras.

import fs from "node:fs";
import path from "node:path";
import type { StabilityMetrics } from "./flakiness-analyzer.js";
import type { MultiRunSummary } from "./multi-run-orchestrator.js";
import { getRealRunStore } from "../real-run-store.js";

/**
 * Baseline histórico de estabilidad para un perfil.
 */
export interface Baseline {
  /** Etiqueta identificadora del baseline */
  label: string;
  /** Perfil al que pertenece el baseline */
  profile: string;
  /** Timestamp de creación */
  createdAt: number;
  /** ID de la corrida que generó este baseline */
  runId: string;
  /** Resultados por scenario */
  scenarioResults: Record<string, {
    outcome: string;
    passRate: number;
    avgDurationMs: number;
  }>;
  /** Métricas de estabilidad por scenario */
  stabilityMetrics: Record<string, StabilityMetrics>;
}

/**
 * Obtiene la ruta del directorio de baselines.
 * @returns Ruta absoluta del directorio de baselines
 */
function obtenerDirectorioBaselines(): string {
  const store = getRealRunStore();
  return path.join(store.getArtifactsBase(), "baselines");
}

/**
 * Asegura que el directorio de baselines exista.
 * @param dir - Ruta del directorio
 */
function asegurarDirectorio(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Guarda un baseline de estabilidad para un perfil específico.
 *
 * Un baseline captura el estado de estabilidad de un perfil en un momento
 * dado, permitiendo comparaciones futuras para detectar regresiones.
 *
 * @param label - Etiqueta identificadora del baseline (ej: "v1.2.3", "before-upgrade")
 * @param profile - Perfil al que pertenece el baseline
 * @param runId - ID de la corrida que generó este baseline
 * @param summary - Resumen de la corrida multi-run
 * @throws Error si no se puede escribir el baseline
 */
export function saveBaseline(
  label: string,
  profile: string,
  runId: string,
  summary: MultiRunSummary
): void {
  const baselinesDir = obtenerDirectorioBaselines();
  asegurarDirectorio(baselinesDir);

  const baseline: Baseline = {
    label,
    profile,
    createdAt: Date.now(),
    runId,
    scenarioResults: {},
    stabilityMetrics: summary.scenarioMetrics,
  };

  // Generar scenarioResults desde el summary
  for (const [scenarioId, metrics] of Object.entries(summary.scenarioMetrics)) {
    baseline.scenarioResults[scenarioId] = {
      outcome: summary.flakyScenarios.includes(scenarioId) ? "flaky" : "stable",
      passRate: metrics.passRate,
      avgDurationMs: 0, // Se calcularía de los samples originales
    };
  }

  const filename = `${profile}-${label.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`;
  const filePath = path.join(baselinesDir, filename);

  try {
    fs.writeFileSync(filePath, JSON.stringify(baseline, null, 2), "utf-8");
  } catch (error) {
    throw new Error(`No se pudo guardar baseline "${label}" para perfil "${profile}": ${error}`);
  }
}

/**
 * Recupera un baseline por su etiqueta y perfil.
 *
 * @param label - Etiqueta del baseline a recuperar
 * @returns El baseline si existe, null si no se encuentra
 */
export function getBaseline(label: string): Baseline | null {
  const baselinesDir = obtenerDirectorioBaselines();

  if (!fs.existsSync(baselinesDir)) {
    return null;
  }

  // Buscar archivos que coincidan con el patrón
  const files = fs.readdirSync(baselinesDir);
  const matchingFile = files.find((f) => f.includes(`-${label.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`));

  if (!matchingFile) {
    return null;
  }

  try {
    const content = fs.readFileSync(path.join(baselinesDir, matchingFile), "utf-8");
    return JSON.parse(content) as Baseline;
  } catch (error) {
    console.warn(`Error al leer baseline "${label}": ${error}`);
    return null;
  }
}

/**
 * Resultado de la comparación contra baseline.
 */
export interface BaselineComparison {
  improved: string[];
  regressed: string[];
  newlyFlaky: string[];
  newlyStable: string[];
  unchanged: string[];
}

/**
 * Compara resultados actuales contra un baseline para detectar cambios.
 *
 * Esta función identifica:
 * - Escenarios que mejoraron su estabilidad
 * - Escenarios que regressaron (empeoraron)
 * - Escenarios que se volvieron flaky
 * - Escenarios que se volvieron estables
 * - Escenarios sin cambios
 *
 * @param current - Resumen actual de la corrida multi-run
 * @param baseline - Baseline histórico a comparar
 * @returns Comparación detallada con listas de escenarios
 */
export function compareToBaseline(
  current: MultiRunSummary,
  baseline: Baseline
): BaselineComparison {
  const improved: string[] = [];
  const regressed: string[] = [];
  const newlyFlaky: string[] = [];
  const newlyStable: string[] = [];
  const unchanged: string[] = [];

  // Escenarios en baseline
  const escenarioBase = new Set(Object.keys(baseline.scenarioResults));
  // Escenarios en corrida actual
  const escenarioActual = new Set(Object.keys(current.scenarioMetrics));

  // Comparar escenarios existentes
  for (const scenarioId of escenarioBase) {
    if (!escenarioActual.has(scenarioId)) {
      // Escenario removido (no出现在 current)
      continue;
    }

    const baselineResult = baseline.scenarioResults[scenarioId];
    const currentMetrics = current.scenarioMetrics[scenarioId];

    if (!baselineResult || !currentMetrics) {
      unchanged.push(scenarioId);
      continue;
    }

    const baselinePassRate = baselineResult.passRate;
    const currentPassRate = currentMetrics.passRate;

    // Detectar mejora: passRate aumentó significativamente
    if (currentPassRate > baselinePassRate + 0.1) {
      // Estaba en baseline, ahora es estable?
      if (baselineResult.outcome === "flaky" && !current.flakyScenarios.includes(scenarioId)) {
        newlyStable.push(scenarioId);
      } else {
        improved.push(scenarioId);
      }
    }
    // Detectar regresión: passRate disminuyó significativamente
    else if (currentPassRate < baselinePassRate - 0.1) {
      // Era estable pero ahora es flaky?
      if (baselineResult.outcome === "stable" && current.flakyScenarios.includes(scenarioId)) {
        newlyFlaky.push(scenarioId);
      } else {
        regressed.push(scenarioId);
      }
    }
    // Sin cambio significativo
    else {
      unchanged.push(scenarioId);
    }
  }

  // Escenarios nuevos (no estaban en baseline)
  for (const scenarioId of escenarioActual) {
    if (!escenarioBase.has(scenarioId)) {
      if (current.flakyScenarios.includes(scenarioId)) {
        newlyFlaky.push(scenarioId);
      } else {
        newlyStable.push(scenarioId);
      }
    }
  }

  return {
    improved,
    regressed,
    newlyFlaky,
    newlyStable,
    unchanged,
  };
}

/**
 * Lista todos los baselines disponibles para un perfil.
 *
 * @param profile - Perfil del cual listar baselines (opcional)
 * @returns Lista de etiquetas de baselines disponibles
 */
export function listBaselines(profile?: string): string[] {
  const baselinesDir = obtenerDirectorioBaselines();

  if (!fs.existsSync(baselinesDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(baselinesDir);
    let baselines = files.filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));

    if (profile) {
      baselines = baselines.filter((b) => b.startsWith(`${profile}-`));
    }

    return baselines;
  } catch (error) {
    console.warn(`Error al listar baselines: ${error}`);
    return [];
  }
}

/**
 * Elimina un baseline por su etiqueta.
 *
 * @param label - Etiqueta del baseline a eliminar
 * @returns true si se eliminó, false si no existía
 */
export function deleteBaseline(label: string): boolean {
  const baselinesDir = obtenerDirectorioBaselines();

  if (!fs.existsSync(baselinesDir)) {
    return false;
  }

  const files = fs.readdirSync(baselinesDir);
  const matchingFile = files.find((f) => f.includes(`-${label.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`));

  if (!matchingFile) {
    return false;
  }

  try {
    fs.unlinkSync(path.join(baselinesDir, matchingFile));
    return true;
  } catch (error) {
    console.warn(`Error al eliminar baseline "${label}": ${error}`);
    return false;
  }
}

/**
 * Genera un reporte de comparación contra baseline en formato texto.
 *
 * @param current - Resumen actual de la corrida
 * @param baseline - Baseline histórico
 * @param comparison - Resultado de la comparación
 * @returns String con el reporte formateado
 */
export function generarReporteComparacion(
  current: MultiRunSummary,
  baseline: Baseline,
  comparison: BaselineComparison
): string {
  const lineas: string[] = [
    "=".repeat(70),
    `REPORTE DE COMPARACIÓN CON BASELINE: ${baseline.label}`,
    "=".repeat(70),
    "",
    `Perfil: ${baseline.profile}`,
    `Baseline creado: ${new Date(baseline.createdAt).toISOString()}`,
    `Corrida actual: ${current.totalRuns} corridas`,
    "",
    "-".repeat(70),
    "RESUMEN",
    "-".repeat(70),
    "",
    `Mejorados: ${comparison.improved.length}`,
    `Regredados: ${comparison.regressed.length}`,
    `Nuevos flaky: ${comparison.newlyFlaky.length}`,
    `Nuevos estables: ${comparison.newlyStable.length}`,
    `Sin cambios: ${comparison.unchanged.length}`,
    "",
  ];

  if (comparison.improved.length > 0) {
    lineas.push("-".repeat(70));
    lineas.push("MEJORAS");
    lineas.push("-".repeat(70));
    for (const scenarioId of comparison.improved) {
      const currentMetrics = current.scenarioMetrics[scenarioId];
      const baselineResult = baseline.scenarioResults[scenarioId];
      const baseRate = baselineResult ? (baselineResult.passRate * 100).toFixed(1) : "0.0";
      const currRate = currentMetrics ? (currentMetrics.passRate * 100).toFixed(1) : "0.0";
      lineas.push(`  ${scenarioId}: ${baseRate}% -> ${currRate}%`);
    }
    lineas.push("");
  }

  if (comparison.regressed.length > 0) {
    lineas.push("-".repeat(70));
    lineas.push("REGRESIONES");
    lineas.push("-".repeat(70));
    for (const scenarioId of comparison.regressed) {
      const currentMetrics = current.scenarioMetrics[scenarioId];
      const baselineResult = baseline.scenarioResults[scenarioId];
      const baseRate = baselineResult ? (baselineResult.passRate * 100).toFixed(1) : "0.0";
      const currRate = currentMetrics ? (currentMetrics.passRate * 100).toFixed(1) : "0.0";
      lineas.push(`  ${scenarioId}: ${baseRate}% -> ${currRate}%`);
    }
    lineas.push("");
  }

  if (comparison.newlyFlaky.length > 0) {
    lineas.push("-".repeat(70));
    lineas.push("NUEVOS FLAKY (REGRESIÓN CRÍTICA)");
    lineas.push("-".repeat(70));
    for (const scenarioId of comparison.newlyFlaky) {
      const currentMetrics = current.scenarioMetrics[scenarioId];
      const passRateStr = currentMetrics ? (currentMetrics.passRate * 100).toFixed(1) : "0.0";
      const varianceStr = currentMetrics ? currentMetrics.variance.toFixed(3) : "0.000";
      lineas.push(`  ${scenarioId}: PassRate=${passRateStr}%, Variance=${varianceStr}`);
    }
    lineas.push("");
  }

  lineas.push("=".repeat(70));

  return lineas.join("\n");
}