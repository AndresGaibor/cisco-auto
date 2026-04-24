// ============================================================================
// Real Run Store - Persistencia central de corridas reales de verification
// ============================================================================
// Store para gestionar la estructura de directorios y archivos de las corridas
// reales ejecutadas dentro del orchestration brain de pt-control.

import fs from "node:fs";
import path from "node:path";
import type { RealRunManifest, RealScenarioResult, RealRunSummary } from "./real-run-types.js";
import type { EnvironmentFingerprint } from "../omni/capability-types.js";

// ============================================================================
// Rutas de una corrida
// ============================================================================

export interface RunPaths {
  base: string;
  scenarios: string;
  evidence: string;
  snapshots: string;
  cleanup: string;
  recovery: string;
}

// ============================================================================
// Store principal
// ============================================================================

class RealRunStore {
  private readonly artifactsBase: string;

  constructor(artifactsBase: string) {
    this.artifactsBase = artifactsBase;
  }

  // ============================================================================
  // Path helpers
  // ============================================================================

  private runPath(runId: string): string {
    return path.join(this.artifactsBase, "runs", runId);
  }

  private latestPath(): string {
    return path.join(this.artifactsBase, "latest");
  }

  // ============================================================================
  // Metodos publicos
  // ============================================================================

  /**
   * Crea la estructura de directorios para una nueva corrida.
   * @param runId - Identificador unico de la corrida
   * @param profile - Perfil de ejecucion
   * @returns Rutas absolutas de la corrida creada
   */
  createRun(runId: string, profile: string): RunPaths {
    const base = this.runPath(runId);
    const paths: RunPaths = {
      base,
      scenarios: path.join(base, "scenarios"),
      evidence: path.join(base, "evidence"),
      snapshots: path.join(base, "snapshots"),
      cleanup: path.join(base, "cleanup"),
      recovery: path.join(base, "recovery"),
    };

    // Crear todos los directorios necesarios
    for (const dir of Object.values(paths)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    return paths;
  }

  /**
   * Escribe el manifiesto inicial de la corrida.
   * @param runId - Identificador de la corrida
   * @param manifest - Manifiesto con metadata de la corrida
   */
  writeManifest(runId: string, manifest: RealRunManifest): void {
    const manifestPath = path.join(this.runPath(runId), "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  }

  /**
   * Escribe el resultado de un scenario especifico.
   * @param runId - Identificador de la corrida
   * @param scenarioId - Identificador del scenario
   * @param result - Resultado completo del scenario
   */
  writeScenarioResult(runId: string, scenarioId: string, result: RealScenarioResult): void {
    const scenarioPath = path.join(this.runPath(runId), "scenarios", `${scenarioId}.json`);
    fs.writeFileSync(scenarioPath, JSON.stringify(result, null, 2), "utf-8");
  }

  /**
   * Escribe un artefacto de paso (phase) con contenido de texto plano.
   * @param runId - Identificador de la corrida
   * @param scenarioId - Identificador del scenario
   * @param phase - Fase o nombre del paso
   * @param filename - Nombre del archivo a escribir
   * @param content - Contenido de texto
   */
  writeStepArtifact(
    runId: string,
    scenarioId: string,
    phase: string,
    filename: string,
    content: string,
  ): void {
    const phaseDir = path.join(this.runPath(runId), "scenarios", scenarioId, phase);
    fs.mkdirSync(phaseDir, { recursive: true });
    const filePath = path.join(phaseDir, filename);
    fs.writeFileSync(filePath, content, "utf-8");
  }

  /**
   * Escribe un artefacto JSON en una ruta relativa dentro de la corrida.
   * @param runId - Identificador de la corrida
   * @param relativePath - Ruta relativa dentro de la corrida
   * @param value - Valor a serializar como JSON
   */
  writeJsonArtifact(runId: string, relativePath: string, value: unknown): void {
    const fullPath = path.join(this.runPath(runId), relativePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(value, null, 2), "utf-8");
  }

  /**
   * Escribe un artefacto de texto plano en una ruta relativa.
   * @param runId - Identificador de la corrida
   * @param relativePath - Ruta relativa dentro de la corrida
   * @param text - Contenido de texto
   */
  writeTextArtifact(runId: string, relativePath: string, text: string): void {
    const fullPath = path.join(this.runPath(runId), relativePath);
    const dir = path.dirname(fullPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, text, "utf-8");
  }

  /**
   * Finaliza la corrida escribiendo el resumen y creando el directorio latest.
   * @param runId - Identificador de la corrida
   * @param summary - Resumen consolidado de la corrida
   */
  finalizeRun(runId: string, summary: RealRunSummary): void {
    const summaryPath = path.join(this.runPath(runId), "summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");

    const summaryMd = this.generateSummaryMd(summary);
    const summaryMdPath = path.join(this.runPath(runId), "summary.md");
    fs.writeFileSync(summaryMdPath, summaryMd, "utf-8");

    this.updateLatest(runId, summary.profile);
  }

  /**
   * Actualiza el directorio latest con symlinks o archivos de la corrida mas reciente.
   * @param runId - Identificador de la corrida
   * @param profile - Perfil de ejecucion
   */
  updateLatest(runId: string, profile: string): void {
    const latestDir = this.latestPath();
    fs.mkdirSync(latestDir, { recursive: true });

    fs.writeFileSync(path.join(latestDir, "run-id.txt"), runId, "utf-8");

    const summaryPath = path.join(this.runPath(runId), "summary.json");
    if (fs.existsSync(summaryPath)) {
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8")) as RealRunSummary;
      const summaryMd = this.generateSummaryMd(summary);
      fs.writeFileSync(path.join(latestDir, "summary.md"), summaryMd, "utf-8");
    }

    const latestSummaryJson = path.join(latestDir, "summary.json");
    if (fs.existsSync(summaryPath)) {
      fs.copyFileSync(summaryPath, latestSummaryJson);
    }
  }

  /**
   * Retorna la ruta base de artefactos.
   * @returns Ruta absoluta del directorio base de artefactos
   */
  getArtifactsBase(): string {
    return this.artifactsBase;
  }

  // ============================================================================
  // Generadores de contenido
  // ============================================================================

  private generateSummaryMd(summary: RealRunSummary): string {
    const lines: string[] = [
      `# Resumen de Corrida: ${summary.runId}`,
      ``,
      `**Perfil:** ${summary.profile}`,
      `**Estado:** ${summary.status}`,
      `**Iniciada:** ${new Date(summary.startedAt).toISOString()}`,
      `**Duracion:** ${(summary.durationMs / 1000).toFixed(1)}s`,
      ``,
      `## Escenarios`,
      ``,
      `| Total | Pasados | Parciales | Fallidos | Recuperados | Saltados | Abortados |`,
      `|-------|---------|-----------|----------|-------------|----------|-----------|`,
      `| ${summary.scenarioCounts.total} | ${summary.scenarioCounts.passed} | ${summary.scenarioCounts.partial} | ${summary.scenarioCounts.failed} | ${summary.scenarioCounts.recovered} | ${summary.scenarioCounts.skipped} | ${summary.scenarioCounts.aborted} |`,
      ``,
    ];

    if (summary.recoveryCounts.attempted > 0) {
      lines.push(`## Recuperaciones`);
      lines.push(``);
      lines.push(`- **Intentadas:** ${summary.recoveryCounts.attempted}`);
      lines.push(`- **Exitosas:** ${summary.recoveryCounts.succeeded}`);
      lines.push(`- **Fallidas:** ${summary.recoveryCounts.failed}`);
      lines.push(``);
    }

    if (summary.fatalErrors.length > 0) {
      lines.push(`## Errores Fatales`);
      lines.push(``);
      for (const error of summary.fatalErrors) {
        lines.push(`- ${error}`);
      }
      lines.push(``);
    }

    if (summary.warnings.length > 0) {
      lines.push(`## Warnings`);
      lines.push(``);
      for (const warning of summary.warnings) {
        lines.push(`- ${warning}`);
      }
      lines.push(``);
    }

    lines.push(`**Entorno Degradado:** ${summary.environmentDegraded ? "Si" : "No"}`);
    lines.push(``);
    lines.push(`**Artefactos:** ${summary.artifactsRoot}`);

    return lines.join("\n");
  }
}

// ============================================================================
// Factory
// ============================================================================

function createRealRunStore(): RealRunStore {
  const artifactsBase = process.env.PT_REAL_ARTIFACTS_DIR ?? path.join(process.cwd(), "artifacts", "pt-real");
  return new RealRunStore(artifactsBase);
}

// ============================================================================
// Export singleton
// ============================================================================

let storeInstance: RealRunStore | null = null;

export function getRealRunStore(): RealRunStore {
  if (!storeInstance) {
    storeInstance = createRealRunStore();
  }
  return storeInstance;
}

export { RealRunStore, createRealRunStore };
