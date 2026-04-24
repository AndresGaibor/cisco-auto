/**
 * Recolector de basura para cleanup de resultados y logs antiguos.
 *
 * Limpia archivos basado en TTL (time-to-live) con verificaciones
 * de seguridad para no eliminar logs que aún necesitan los consumers.
 */

import { join } from "node:path";
import { readdirSync, statSync, unlinkSync } from "node:fs";
import { BridgePathLayout } from "../shared/path-layout.js";

export interface GCReport {
  deletedResults: number;
  deletedLogs: number;
  errors: string[];
}

/**
 * Limpia resultados y logs antiguos basado en TTL.
 */
export class GarbageCollector {
  /**
   * @param paths - Gestor de paths
   * @param isLogNeededFn - Función para verificar si un log aún es necesario por algún consumer
   */
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly isLogNeededFn: (logFile: string) => boolean,
  ) {}

  /**
   * Ejecuta el garbage collection de resultados y logs.
   *
   * Resultados: se eliminan si mtime > resultTtlMs
   * Logs: se eliminan si mtime > logTtlMs Y ningún consumer los necesita
   *
   * @param options - TTLs opcionales en ms (default: 24h results, 7d logs)
   * @returns Reporte con archivos eliminados y errores encontrados
   */
  collect(options: { resultTtlMs?: number; logTtlMs?: number } = {}): GCReport {
    const resultTtlMs = options.resultTtlMs ?? 24 * 60 * 60 * 1000;
    const logTtlMs = options.logTtlMs ?? 7 * 24 * 60 * 60 * 1000;
    const report: GCReport = { deletedResults: 0, deletedLogs: 0, errors: [] };
    const now = Date.now();

    // Clean old results
    this.cleanOldResults(resultTtlMs, now, report);

    // Clean old logs
    this.cleanOldLogs(logTtlMs, now, report);

    return report;
  }

  private cleanOldResults(
    resultTtlMs: number,
    now: number,
    report: GCReport,
  ): void {
    try {
      const resultFiles = readdirSync(this.paths.resultsDir())
        .filter((f) => f.endsWith(".json"));
      for (const file of resultFiles) {
        const filePath = join(this.paths.resultsDir(), file);
        try {
          const stat = statSync(filePath);
          if (now - stat.mtimeMs > resultTtlMs) {
            unlinkSync(filePath);
            report.deletedResults++;
          }
        } catch (err) {
          report.errors.push(`result ${file}: ${String(err)}`);
        }
      }
    } catch (err) {
      report.errors.push(`results dir: ${String(err)}`);
    }
  }

  private cleanOldLogs(
    logTtlMs: number,
    now: number,
    report: GCReport,
  ): void {
    try {
      const logFiles = readdirSync(this.paths.logsDir())
        .filter(
          (f) =>
            f.startsWith("events.") &&
            f !== "events.current.ndjson" &&
            f.endsWith(".ndjson")
        );
      for (const file of logFiles) {
        const filePath = join(this.paths.logsDir(), file);
        try {
          const stat = statSync(filePath);
          if (now - stat.mtimeMs > logTtlMs) {
            if (!this.isLogNeededFn(file)) {
              unlinkSync(filePath);
              report.deletedLogs++;
            }
          }
        } catch (err) {
          report.errors.push(`log ${file}: ${String(err)}`);
        }
      }
    } catch (err) {
      report.errors.push(`logs dir: ${String(err)}`);
    }
  }
}
