/**
 * Servicio de monitoreo para FileBridge V2.
 *
 * Encapsula las tres actividades de background monitoring:
 * - Heartbeat: detecta cuando PT deja de responder
 * - Auto-snapshot: polling periódico de topología y diff detection
 * - Auto-GC: limpieza automática de resultados y logs antiguos
 *
 * Todas las operaciones de escritura (comandos, eventos) se delegan
 * vía callbacks inyectados, evitando acoplamiento directo con FileBridgeV2.
 */
import type { BridgeEvent } from "../shared/protocol.js";
import type { BridgePathLayout } from "../shared/path-layout.js";
import type { Snapshot } from "@cisco-auto/types";
import { join } from "path";

export interface MonitoringCallbacks {
  /** Callback para enviar comandos a PT (sendCommandAndWait) */
  sendCommandAndWait: <TPayload = unknown, TResult = unknown>(
    type: string,
    payload: TPayload,
    timeoutMs: number,
  ) => Promise<{ ok: boolean; value?: TResult; error?: unknown }>;
  /** Callback para appendEvent */
  appendEvent: (event: Omit<BridgeEvent, "seq" | "ts"> & Partial<Pick<BridgeEvent, "seq" | "ts">>) => void;
  /** Callback para gc() */
  runGc: (options: { resultTtlMs?: number; logTtlMs?: number }) => {
    deletedResults: number;
    deletedLogs: number;
    errors: string[];
  };
  /** Callback para seq.next() */
  nextSeq: () => number;
}

export interface MonitoringOptions {
  /** Intervalo para auto-snapshot de topología (default: 5000ms) */
  autoSnapshotIntervalMs?: number;
  /** Intervalo para monitoreo de heartbeat de PT (default: 2000ms) */
  heartbeatIntervalMs?: number;
  /** Intervalo para limpieza automática de archivos huérfanos (default: 30000ms) */
  autoGcIntervalMs?: number;
  /** Umbral de edad del heartbeat para considerarse stale (default: 10000ms) */
  heartbeatStaleThresholdMs?: number;
  /** TTL para resultados en auto-gc (default: 60000ms) */
  gcResultTtlMs?: number;
  /** TTL para logs en auto-gc (default: 3600000ms) */
  gcLogTtlMs?: number;
}

export interface HeartbeatHealth {
  state: "ok" | "stale" | "missing" | "unknown";
  ageMs?: number;
  lastSeenTs?: number;
}

export interface SnapshotDiff {
  hasChanges: boolean;
  devicesAdded: string[];
  devicesRemoved: string[];
  devicesChanged: string[];
  linksAdded: string[];
  linksRemoved: string[];
}

export interface MonitoringState {
  isRunning: boolean;
  autoSnapshotActive: boolean;
  heartbeatActive: boolean;
  autoGcActive: boolean;
  lastSnapshot: Snapshot | null;
  lastHeartbeat: HeartbeatHealth | null;
}

const DEBUG = process.env.PT_DEBUG === "1";
const debugLog = (...args: unknown[]) => {
  if (DEBUG) console.error("[bridge:monitoring]", ...args);
};

export class MonitoringService {
  private autoSnapshotTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private autoGcTimer: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot: Snapshot | null = null;
  private lastHeartbeat: HeartbeatHealth | null = null;

  private readonly paths: BridgePathLayout;
  private readonly callbacks: MonitoringCallbacks;
  private readonly options: Required<MonitoringOptions>;

  constructor(paths: BridgePathLayout, callbacks: MonitoringCallbacks, options: MonitoringOptions = {}) {
    this.paths = paths;
    this.callbacks = callbacks;
    this.options = {
      autoSnapshotIntervalMs: options.autoSnapshotIntervalMs ?? 5_000,
      heartbeatIntervalMs: options.heartbeatIntervalMs ?? 2_000,
      autoGcIntervalMs: options.autoGcIntervalMs ?? 30_000,
      heartbeatStaleThresholdMs: options.heartbeatStaleThresholdMs ?? 10_000,
      gcResultTtlMs: options.gcResultTtlMs ?? 60_000,
      gcLogTtlMs: options.gcLogTtlMs ?? 3_600_000,
    };
  }

  get state(): MonitoringState {
    return {
      isRunning: this.autoSnapshotTimer !== null || this.heartbeatTimer !== null || this.autoGcTimer !== null,
      autoSnapshotActive: this.autoSnapshotTimer !== null,
      heartbeatActive: this.heartbeatTimer !== null,
      autoGcActive: this.autoGcTimer !== null,
      lastSnapshot: this.lastSnapshot,
      lastHeartbeat: this.lastHeartbeat,
    };
  }

  getHeartbeatHealth(): HeartbeatHealth {
    const heartbeatFile = join(this.paths.root, "heartbeat.json");
    const { statSync, readFileSync } = require("node:fs");
    const { existsSync } = require("node:fs");

    try {
      const stats = statSync(heartbeatFile);
      const ageMs = Date.now() - stats.mtime.getTime();
      const isStale = ageMs > this.options.heartbeatStaleThresholdMs;

      let heartbeat: Record<string, unknown> | null = null;
      try {
        const content = readFileSync(heartbeatFile, "utf8");
        heartbeat = JSON.parse(content);
      } catch {
        // Heartbeat file existe pero no es JSON válido
      }

      this.lastHeartbeat = {
        state: isStale ? "stale" : "ok",
        ageMs,
        lastSeenTs: stats.mtime.getTime(),
      };
      return this.lastHeartbeat;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === "ENOENT") return { state: "missing" };
      return { state: "unknown" };
    }
  }

  getHeartbeat<T = unknown>(): T | null {
    try {
      const { readFileSync } = require("node:fs");
      const content = readFileSync(join(this.paths.root, "heartbeat.json"), "utf8");
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  getLastSnapshot<T = Snapshot>(): T | null {
    return this.lastSnapshot as T | null;
  }

  startAll(): void {
    this.startAutoSnapshot();
    this.startHeartbeatMonitoring();
    this.startAutoGc();
  }

  stopAll(): void {
    this.stopMonitoring();
  }

  startAutoSnapshot(): void {
    if (this.autoSnapshotTimer) return;

    this.autoSnapshotTimer = setInterval(async () => {
      try {
        const result = await this.callbacks.sendCommandAndWait<{}, Snapshot>("snapshot", {}, 10_000);

        if (result.ok && result.value) {
          const newSnapshot = result.value;

          if (this.lastSnapshot) {
            const diff = calculateSnapshotDiff(this.lastSnapshot, newSnapshot);
            if (diff.hasChanges) {
              this.callbacks.appendEvent({
                seq: this.callbacks.nextSeq(),
                ts: Date.now(),
                type: "topology-changed",
                diff,
                snapshot: newSnapshot,
              });
            }
          } else {
            this.callbacks.appendEvent({
              seq: this.callbacks.nextSeq(),
              ts: Date.now(),
              type: "topology-initial",
              snapshot: newSnapshot,
            });
          }

          this.lastSnapshot = newSnapshot;
        }
      } catch (error) {
        this.callbacks.appendEvent({
          seq: this.callbacks.nextSeq(),
          ts: Date.now(),
          type: "auto-snapshot-error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, this.options.autoSnapshotIntervalMs);
  }

  startHeartbeatMonitoring(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(() => {
      const { readFileSync, statSync, existsSync } = require("node:fs");
      const heartbeatFile = join(this.paths.root, "heartbeat.json");

      try {
        const stats = statSync(heartbeatFile);
        const age = Date.now() - stats.mtime.getTime();

        if (age > this.options.heartbeatStaleThresholdMs) {
          this.callbacks.appendEvent({
            seq: this.callbacks.nextSeq(),
            ts: Date.now(),
            type: "pt-heartbeat-stale",
            ageMs: age,
            lastModified: stats.mtime.getTime(),
          });
        } else {
          try {
            const content = readFileSync(heartbeatFile, "utf8");
            const heartbeat = JSON.parse(content);
            this.callbacks.appendEvent({
              seq: this.callbacks.nextSeq(),
              ts: Date.now(),
              type: "pt-heartbeat-ok",
              heartbeat,
              ageMs: age,
            });
          } catch {
            this.callbacks.appendEvent({
              seq: this.callbacks.nextSeq(),
              ts: Date.now(),
              type: "pt-heartbeat-ok",
              ageMs: age,
            });
          }
        }
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") {
          this.callbacks.appendEvent({
            seq: this.callbacks.nextSeq(),
            ts: Date.now(),
            type: "pt-heartbeat-missing",
          });
        } else {
          this.callbacks.appendEvent({
            seq: this.callbacks.nextSeq(),
            ts: Date.now(),
            type: "pt-heartbeat-error",
            error: err.message,
          });
        }
      }
    }, this.options.heartbeatIntervalMs);
  }

  startAutoGc(): void {
    if (this.autoGcTimer) return;

    this.autoGcTimer = setInterval(() => {
      try {
        const report = this.callbacks.runGc({
          resultTtlMs: this.options.gcResultTtlMs,
          logTtlMs: this.options.gcLogTtlMs,
        });

        const totalDeleted = report.deletedResults + report.deletedLogs;
        if (totalDeleted > 0) {
          debugLog(`Cleaned ${totalDeleted} stale files (${report.deletedResults} results, ${report.deletedLogs} logs)`);
        }
      } catch (error) {
        debugLog(`Auto-GC error: ${String(error)}`);
      }
    }, this.options.autoGcIntervalMs);
  }

  stopMonitoring(): void {
    if (this.autoSnapshotTimer) {
      clearInterval(this.autoSnapshotTimer);
      this.autoSnapshotTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.autoGcTimer) {
      clearInterval(this.autoGcTimer);
      this.autoGcTimer = null;
    }
  }
}

export function calculateSnapshotDiff(
  prev: Snapshot,
  curr: Snapshot,
): SnapshotDiff {
  const prevDevices = new Set(Object.keys(prev.devices));
  const currDevices = new Set(Object.keys(curr.devices));
  const prevLinks = new Set(Object.keys(prev.links));
  const currLinks = new Set(Object.keys(curr.links));

  const devicesAdded = [...currDevices].filter((d) => !prevDevices.has(d));
  const devicesRemoved = [...prevDevices].filter((d) => !currDevices.has(d));
  const linksAdded = [...currLinks].filter((l) => !prevLinks.has(l));
  const linksRemoved = [...prevLinks].filter((l) => !currLinks.has(l));

  const devicesChanged: string[] = [];
  for (const deviceName of [...currDevices].filter((d) => prevDevices.has(d))) {
    const prevDevice = prev.devices[deviceName];
    const currDevice = curr.devices[deviceName];
    if (JSON.stringify(prevDevice) !== JSON.stringify(currDevice)) {
      devicesChanged.push(deviceName);
    }
  }

  const hasChanges =
    devicesAdded.length > 0 ||
    devicesRemoved.length > 0 ||
    devicesChanged.length > 0 ||
    linksAdded.length > 0 ||
    linksRemoved.length > 0;

  return {
    hasChanges,
    devicesAdded,
    devicesRemoved,
    devicesChanged,
    linksAdded,
    linksRemoved,
  };
}
