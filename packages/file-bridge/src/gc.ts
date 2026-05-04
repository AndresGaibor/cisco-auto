/**
 * Módulo de Garbage Collection para resultados del bridge.
 *
 * Políticas de retención:
 * - Results actuales (en uso): conservar
 * - Results recientes (dentro del umbral): conservar
 * - Results referenciados por history/session logs: conservar
 * - Results antiguos: archivar o borrar según flag
 * - Dead-letter: conservar hasta inspección manual
 * - Sidecars: limpiables
 *
 * CLI:
 * - pt results gc --dry-run
 * - pt results gc --older-than 7d
 * - pt results gc --archive
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, basename } from "node:path";
import { BridgePathLayout } from "./shared/path-layout.js";
import { isFsSidecarFile, isBridgeResultFile } from "./shared/bridge-file-classifier.js";

export interface GCOptions {
  olderThanMs?: number;
  archive?: boolean;
  dryRun?: boolean;
  archiveDir?: string;
}

export interface GCResult {
  scannedResults: number;
  scannedSidecars: number;
  candidatesForDeletion: number;
  deletedFiles: number;
  archivedFiles: number;
  freedBytes: number;
  errors: string[];
  skippedFiles: string[];
  referencedIds: Set<string>;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class ResultsGC {
  private readonly paths: BridgePathLayout;

  constructor(root: string) {
    this.paths = new BridgePathLayout(root);
  }

  /**
   * Obtiene IDs de resultados referenciados en history/session logs.
   */
  collectReferencedIds(): Set<string> {
    const referencedIds = new Set<string>();
    const logsDir = this.paths.logsDir();

    if (!existsSync(logsDir)) return referencedIds;

    const logFiles = readdirSync(logsDir).filter(
      (f) => f.startsWith("events.") && f.endsWith(".ndjson")
    );

    for (const file of logFiles) {
      const filePath = join(logsDir, file);
      try {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.resultId) {
              referencedIds.add(event.resultId);
            }
            if (event.value?.resultId) {
              referencedIds.add(event.value.resultId);
            }
          } catch {
            // Ignore parse errors in individual lines
          }
        }
      } catch {
        // Ignore unreadable log files
      }
    }

    return referencedIds;
  }

  /**
   * Escanea results/ y devuelve información sin modificar nada.
   */
  scanResults(
    olderThanMs: number = DEFAULT_TTL_MS,
    referencedIds: Set<string> = new Set()
  ): {
    candidates: Array<{ path: string; size: number; mtimeMs: number; id: string }>;
    recent: string[];
    referenced: string[];
    sidecars: string[];
    deadLetters: string[];
  } {
    const resultsDir = this.paths.resultsDir();
    const candidates: Array<{ path: string; size: number; mtimeMs: number; id: string }> = [];
    const recent: string[] = [];
    const referenced: string[] = [];
    const sidecars: string[] = [];
    const deadLetters: string[] = [];

    if (!existsSync(resultsDir)) {
      return { candidates, recent, referenced, sidecars, deadLetters };
    }

    const files = readdirSync(resultsDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = join(resultsDir, file);

      if (isFsSidecarFile(file)) {
        sidecars.push(filePath);
        continue;
      }

      if (file === "dead-letter" || file.startsWith("dead-letter.")) {
        deadLetters.push(filePath);
        continue;
      }

      if (!isBridgeResultFile(file)) {
        continue;
      }

      try {
        const stat = statSync(filePath);
        const id = file.replace(/\.json$/, "");

        if (referencedIds.has(id)) {
          referenced.push(filePath);
          continue;
        }

        const ageMs = now - stat.mtimeMs;
        if (ageMs <= olderThanMs) {
          recent.push(filePath);
          continue;
        }

        candidates.push({ path: filePath, size: stat.size, mtimeMs: stat.mtimeMs, id });
      } catch {
        // Skip files we can't stat
      }
    }

    return { candidates, recent, referenced, sidecars, deadLetters };
  }

  /**
   * Ejecuta garbage collection de results/.
   *
   * @param options
   * - olderThanMs: solo archivos mayores a este threshold (default: 7 días)
   * - archive: mueve a archiveDir en lugar de borrar (default: false)
   * - dryRun: solo reporta, no modifica nada (default: false)
   * - archiveDir: directorio de archive (default: {root}/archive)
   */
  run(options: GCOptions = {}): GCResult {
    const olderThanMs = options.olderThanMs ?? DEFAULT_TTL_MS;
    const archive = options.archive ?? false;
    const dryRun = options.dryRun ?? false;
    const archiveDir = options.archiveDir ?? join(this.paths.root, "archive");

    const result: GCResult = {
      scannedResults: 0,
      scannedSidecars: 0,
      candidatesForDeletion: 0,
      deletedFiles: 0,
      archivedFiles: 0,
      freedBytes: 0,
      errors: [],
      skippedFiles: [],
      referencedIds: new Set(),
    };

    const referencedIds = this.collectReferencedIds();
    result.referencedIds = referencedIds;

    const { candidates, recent, referenced, sidecars, deadLetters } = this.scanResults(
      olderThanMs,
      referencedIds
    );

    result.scannedResults = candidates.length + recent.length + referenced.length;
    result.scannedSidecars = sidecars.length;

    const protectedPaths = new Set([
      ...recent,
      ...referenced,
      ...deadLetters,
      this.paths.commandsDir(),
      this.paths.inFlightDir(),
    ]);

    for (const candidate of candidates) {
      result.candidatesForDeletion++;

      if (protectedPaths.has(candidate.path)) {
        result.skippedFiles.push(candidate.path);
        continue;
      }

      if (dryRun) {
        result.skippedFiles.push(candidate.path);
        result.freedBytes += candidate.size;
        continue;
      }

      try {
        if (archive) {
          if (!existsSync(archiveDir)) {
            mkdirSync(archiveDir, { recursive: true });
          }
          const destPath = join(archiveDir, basename(candidate.path));
          renameSync(candidate.path, destPath);
          result.archivedFiles++;
        } else {
          rmSync(candidate.path);
          result.deletedFiles++;
        }
        result.freedBytes += candidate.size;
      } catch (err) {
        result.errors.push(`${candidate.path}: ${String(err)}`);
      }
    }

    for (const sidecar of sidecars) {
      if (dryRun) {
        try {
          const stat = statSync(sidecar);
          result.freedBytes += stat.size;
        } catch {
          // Ignore
        }
        continue;
      }

      try {
        rmSync(sidecar);
        result.deletedFiles++;
        try {
          const stat = statSync(sidecar);
          result.freedBytes += stat.size;
        } catch {
          // File already gone
        }
      } catch (err) {
        result.errors.push(`${sidecar}: ${String(err)}`);
      }
    }

    return result;
  }

  /**
   * Genera un reporte legible del estado actual.
   */
  generateReport(olderThanMs: number = DEFAULT_TTL_MS): {
    totalResults: number;
    candidatesCount: number;
    recentCount: number;
    referencedCount: number;
    sidecarCount: number;
    deadLetterCount: number;
    candidatesBytes: number;
    dryRunFreedBytes: number;
    ttlDays: number;
  } {
    const referencedIds = this.collectReferencedIds();
    const { candidates, recent, referenced, sidecars, deadLetters } = this.scanResults(
      olderThanMs,
      referencedIds
    );

    const candidatesBytes = candidates.reduce((sum, c) => sum + c.size, 0);
    const sidecarBytes = sidecars.reduce((sum, s) => {
      try {
        return sum + statSync(s).size;
      } catch {
        return sum;
      }
    }, 0);

    return {
      totalResults: candidates.length + recent.length + referenced.length,
      candidatesCount: candidates.length,
      recentCount: recent.length,
      referencedCount: referenced.length,
      sidecarCount: sidecars.length,
      deadLetterCount: deadLetters.length,
      candidatesBytes,
      dryRunFreedBytes: candidatesBytes + sidecarBytes,
      ttlDays: olderThanMs / (24 * 60 * 60 * 1000),
    };
  }
}

export function parseOlderThan(value: string): number {
  const match = value.match(/^(\d+)([dhms])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${value}. Use format like 7d, 24h, 60m, 3600s`);
  }

  const num = parseInt(match[1]!, 10);
  const unit = match[2]!;

  switch (unit) {
    case "d":
      return num * 24 * 60 * 60 * 1000;
    case "h":
      return num * 60 * 60 * 1000;
    case "m":
      return num * 60 * 1000;
    case "s":
      return num * 1000;
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}
