/**
 * FileBridgeMetricsHistory - persistencia NDJSON rotada y consultas
 * históricas de las métricas del FileBridge.
 *
 * Cada snapshot se persiste como una línea JSON en `metrics.ndjson`
 * dentro de `<root>/metrics-history/`. El archivo se rota automáticamente
 * cuando supera `maxBytes` (similar a EventLogWriter), conservando los
 * snapshots antiguos en archivos `metrics.<timestamp>-<counter>.ndjson`.
 *
 * Pruning:
 * - `pruneOlderThan(maxAgeMs)` elimina del archivo activo las entradas
 *   con timestamp anterior al cutoff, retornando el número eliminado.
 * - Los archivos rotados cuyos snapshots más recientes ya están vencidos
 *   se eliminan completamente para liberar disco.
 *
 * Thread-safety:
 * - Single-threaded Node.js (sin locks). Todos los métodos asumen
 *   que se llaman desde el event loop principal.
 * - El timer de auto-snapshot se cancela en `stopAutoSnapshot()`.
 * - `unref()` se aplica al timer para que no bloquee la salida del proceso.
 */
import {
  existsSync,
  statSync,
  renameSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  FileBridgeMetrics,
  type FileBridgeMetricsSnapshot,
} from "./file-bridge-metrics.js";
import { appendLine, ensureDir, ensureFile } from "./shared/fs-atomic.js";

export interface FileBridgeMetricsHistoryOptions {
  /** Directorio donde se persisten los snapshots. Default: <root>/metrics-history/ */
  historyDir?: string;
  /** Tamaño máximo en bytes antes de rotar. Default: 32MB. */
  maxBytes?: number;
}

const DEFAULT_MAX_BYTES = 32 * 1024 * 1024;

/**
 * Helper de integración: toma un snapshot de `FileBridgeMetrics` y lo
 * persiste en `FileBridgeMetricsHistory`. Útil para no tener que
 * recordar encadenar `getSnapshot()` + `record()` en cada callsite.
 *
 * @returns El snapshot tomado (también persistido).
 */
export function getSnapshotAndPersist(
  metrics: FileBridgeMetrics,
  history: FileBridgeMetricsHistory,
): FileBridgeMetricsSnapshot {
  const snapshot = metrics.getSnapshot();
  history.record(snapshot);
  return snapshot;
}

/**
 * Historial persistente de métricas del FileBridge.
 */
export class FileBridgeMetricsHistory {
  private readonly historyDir: string;
  private readonly currentFile: string;
  private readonly maxBytes: number;
  private rotationCounter = 0;
  private autoSnapshotTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * @param root - Directorio raíz del bridge (pt-dev).
   * @param options - Opciones de configuración (historyDir, maxBytes).
   */
  constructor(root: string, options: FileBridgeMetricsHistoryOptions = {}) {
    this.historyDir = options.historyDir ?? join(root, "metrics-history");
    this.currentFile = join(this.historyDir, "metrics.ndjson");
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

    ensureDir(this.historyDir);
    ensureFile(this.currentFile, "");
  }

  /**
   * Persiste un snapshot como una línea JSON en el archivo activo.
   * Si el archivo activo supera `maxBytes`, rota antes de escribir.
   */
  record(snapshot: FileBridgeMetricsSnapshot): void {
    this.rotateIfNeeded();
    appendLine(this.currentFile, JSON.stringify(snapshot));
  }

  /**
   * Retorna los últimos `limit` snapshots en orden cronológico.
   * Si hay menos de `limit` snapshots, retorna los que existan.
   */
  getRecent(limit: number): FileBridgeMetricsSnapshot[] {
    if (limit <= 0) return [];
    const lines = this.readAllLines();
    return lines.slice(-limit).map(this.parseLine).filter(this.isSnapshot);
  }

  /**
   * Retorna snapshots con timestamp >= al indicado.
   */
  getSince(timestamp: number): FileBridgeMetricsSnapshot[] {
    const lines = this.readAllLines();
    const out: FileBridgeMetricsSnapshot[] = [];
    for (const line of lines) {
      const snap = this.parseLine(line);
      if (snap !== null && snap.timestamp >= timestamp) {
        out.push(snap);
      }
    }
    return out;
  }

  /**
   * Elimina snapshots con timestamp anterior a `Date.now() - maxAgeMs`.
   * También borra archivos rotados cuyo snapshot más reciente ya esté vencido.
   *
   * @returns Número de snapshots eliminados (archivo activo + rotados).
   */
  pruneOlderThan(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;

    // 1. Podar archivo activo: filtrar y reescribir
    const lines = this.readAllLines();
    const keep: FileBridgeMetricsSnapshot[] = [];
    for (const line of lines) {
      const snap = this.parseLine(line);
      if (snap === null) continue;
      if (snap.timestamp < cutoff) {
        removed++;
      } else {
        keep.push(snap);
      }
    }
    this.writeAll(keep);

    // 2. Podar archivos rotados cuyo contenido completo esté vencido
    for (const file of this.listRotatedFiles()) {
      const content = readFileSync(join(this.historyDir, file), "utf8");
      let latestTs = -Infinity;
      let hasAny = false;
      for (const line of content.split("\n")) {
        const snap = this.parseLine(line);
        if (snap !== null) {
          hasAny = true;
          if (snap.timestamp > latestTs) latestTs = snap.timestamp;
        }
      }
      if (!hasAny || latestTs < cutoff) {
        try {
          unlinkSync(join(this.historyDir, file));
        } catch {
          // Ignorar errores de borrado
        }
      }
    }

    return removed;
  }

  /**
   * Rota el archivo activo si su tamaño >= `maxBytes` (o el `maxBytes`
   * explícito pasado como argumento).
   *
   * Idempotente: si no se alcanza el umbral, no hace nada.
   */
  rotateIfNeeded(maxBytes?: number): void {
    const threshold = maxBytes ?? this.maxBytes;

    let size = 0;
    try {
      size = statSync(this.currentFile).size;
    } catch {
      // Archivo no existe: no hay nada que rotar
      return;
    }

    if (size < threshold) return;

    const timestamp = Date.now();
    const counter = this.rotationCounter++;
    const rotatedFileName = `metrics.${timestamp}-${counter}.ndjson`;
    const rotatedPath = join(this.historyDir, rotatedFileName);

    try {
      renameSync(this.currentFile, rotatedPath);
    } catch {
      // Si no se puede renombrar, no rotamos
      return;
    }

    ensureFile(this.currentFile, "");
  }

  /**
   * Programa capturas automáticas de `metrics.getSnapshot()` cada
   * `intervalMs` milisegundos. Si ya hay un timer activo, lo reemplaza.
   *
   * El timer se marca con `unref()` para no bloquear la salida del proceso.
   */
  startAutoSnapshot(metrics: FileBridgeMetrics, intervalMs: number): void {
    this.stopAutoSnapshot();
    this.autoSnapshotTimer = setInterval(() => {
      try {
        this.record(metrics.getSnapshot());
      } catch {
        // Silenciar errores durante auto-snapshot para no crashear el timer
      }
    }, intervalMs);
    if (
      this.autoSnapshotTimer !== null &&
      typeof this.autoSnapshotTimer === "object" &&
      "unref" in this.autoSnapshotTimer
    ) {
      (this.autoSnapshotTimer as { unref: () => void }).unref();
    }
  }

  /**
   * Detiene el timer de auto-snapshot si está activo. Idempotente.
   */
  stopAutoSnapshot(): void {
    if (this.autoSnapshotTimer !== null) {
      clearInterval(this.autoSnapshotTimer);
      this.autoSnapshotTimer = null;
    }
  }

  /** @returns Path del directorio de historial. */
  getHistoryDir(): string {
    return this.historyDir;
  }

  /** @returns Path del archivo activo. */
  getCurrentFile(): string {
    return this.currentFile;
  }

  // ───── Internos ─────

  private readAllLines(): string[] {
    if (!existsSync(this.currentFile)) return [];
    const content = readFileSync(this.currentFile, "utf8");
    if (content.length === 0) return [];
    return content.split("\n").filter((l) => l.length > 0);
  }

  private writeAll(snapshots: FileBridgeMetricsSnapshot[]): void {
    const content = snapshots.map((s) => JSON.stringify(s)).join("\n");
    const suffix = snapshots.length > 0 ? "\n" : "";
    writeFileSync(this.currentFile, content + suffix, "utf8");
  }

  private listRotatedFiles(): string[] {
    if (!existsSync(this.historyDir)) return [];
    try {
      return readdirSync(this.historyDir)
        .filter((f) => /^metrics\.\d+-\d+\.ndjson$/.test(f))
        .sort();
    } catch {
      return [];
    }
  }

  private parseLine(line: string): FileBridgeMetricsSnapshot | null {
    try {
      const obj = JSON.parse(line) as unknown;
      if (
        typeof obj === "object" &&
        obj !== null &&
        typeof (obj as { timestamp?: unknown }).timestamp === "number"
      ) {
        return obj as FileBridgeMetricsSnapshot;
      }
      return null;
    } catch {
      return null;
    }
  }

  private isSnapshot(value: FileBridgeMetricsSnapshot | null): value is FileBridgeMetricsSnapshot {
    return value !== null;
  }
}
