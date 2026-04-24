/**
 * Recopilador de salud y diagnóstico del FileBridge V2.
 *
 * Recopila estadísticas de colas, lease, journal, y detecta issues.
 * El health check evalúa:
 * - Lease activo y su edad
 * - Commands stuck in-flight (>10 commands)
 * - Cola respaldándose (>100 pending)
 * - Drift entre queue index y archivos físicos
 * - Comandos oldest in-flight/pending (>5 min)
 * - Consumers con lag excesivo (>1000 events)
 */

import { join } from "node:path";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { BridgePathLayout } from "../shared/path-layout.js";
import { SequenceStore } from "../shared/sequence-store.js";
import type { BridgeLease } from "../shared/protocol.js";

export interface BridgeHealth {
  status: "healthy" | "degraded" | "unhealthy";
  lease: {
    active: boolean;
    ownerId: string | null;
    ageMs: number;
  };
  queues: {
    pendingCommands: number;
    inFlight: number;
    results: number;
    deadLetters: number;
    queueIndexEntries: number;
    queueIndexDrift: boolean;
    queueIndexMissingEntries: number;
    queueIndexExtraEntries: number;
    oldestPendingAgeMs: number;
    oldestInFlightAgeMs: number;
  };
  journal: {
    currentFileSize: number;
    rotatedFiles: number;
    lastSeq: number;
  };
  consumers: Array<{
    consumerId: string;
    lastSeq: number;
    lagEvents: number;
    lastUpdate: number;
  }>;
  issues: string[];
}

/**
 * Recopila métricas de salud del bridge.
 */
export class BridgeDiagnostics {
  /**
   * @param paths - Gestor de paths
   * @param seq - Store de secuencias para consultar lastSeq
   * @param getOwnerId - Callback para obtener el ownerId actual
   * @param readLease - Callback para leer el lease actual
   */
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly seq: SequenceStore,
    private readonly getOwnerId: () => string,
    private readonly readLease: () => BridgeLease | null,
  ) {}

  /**
   * Recopila información completa de salud del bridge.
   * Evalúa múltiples condiciones y genera lista de issues.
   *
   * @returns Objeto BridgeHealth con métricas y estado general
   */
  collectHealth(): BridgeHealth {
    const issues: string[] = [];
    const now = Date.now();

    const ownerId = this.getOwnerId();
    const lease = this.readLease();

    let leaseActive = false;
    if (lease) {
      const isStale = !lease.expiresAt || now > lease.expiresAt;
      if (!isStale && lease.ownerId === ownerId) {
        leaseActive = true;
      }
    }

    const pendingCommands = this.countFilesInDir(this.paths.commandsDir());
    const inFlight = this.countFilesInDir(this.paths.inFlightDir());
    const results = this.countFilesInDir(this.paths.resultsDir());
    const deadLetters = this.countFilesInDir(this.paths.deadLetterDir());
    const rotatedLogs = this.countRotatedLogs();

    const queueIndex = this.readQueueIndex();
    const commandFiles = this.listCommandFiles();
    const queueIndexDrift = this.hasQueueIndexDrift(queueIndex, commandFiles);
    const queueIndexMissingEntries = this.countQueueIndexMissingEntries(queueIndex, commandFiles);
    const queueIndexExtraEntries = this.countQueueIndexExtraEntries(queueIndex, commandFiles);

    const oldestPendingAgeMs = this.oldestFileAgeMs(this.paths.commandsDir());
    const oldestInFlightAgeMs = this.oldestFileAgeMs(this.paths.inFlightDir());

    const consumers = this.getConsumerLag();

    if (!leaseActive) issues.push("Bridge lease is not active for current owner");
    if (inFlight > 10) issues.push(`${inFlight} commands stuck in-flight`);
    if (pendingCommands > 100) issues.push(`Command queue backing up: ${pendingCommands} pending`);
    if (queueIndexDrift) {
      issues.push(
        `Queue index drift detected (missing=${queueIndexMissingEntries}, extra=${queueIndexExtraEntries})`,
      );
    }
    if (oldestInFlightAgeMs > 5 * 60 * 1000) {
      issues.push(`Oldest in-flight command is ${oldestInFlightAgeMs}ms old`);
    }
    if (oldestPendingAgeMs > 5 * 60 * 1000) {
      issues.push(`Oldest queued command is ${oldestPendingAgeMs}ms old`);
    }

    for (const c of consumers) {
      if (c.lagEvents > 1000) {
        issues.push(`Consumer ${c.consumerId} lagging by ${c.lagEvents} events`);
      }
    }

    let currentFileSize = 0;
    try {
      currentFileSize = statSync(this.paths.currentEventsFile()).size;
    } catch {
      currentFileSize = 0;
    }

    return {
      status: issues.length === 0 ? "healthy" : issues.length < 3 ? "degraded" : "unhealthy",
      lease: {
        active: leaseActive,
        ownerId: lease?.ownerId ?? null,
        ageMs: lease ? now - lease.startedAt : 0,
      },
      queues: {
        pendingCommands,
        inFlight,
        results,
        deadLetters,
        queueIndexEntries: queueIndex.length,
        queueIndexDrift,
        queueIndexMissingEntries,
        queueIndexExtraEntries,
        oldestPendingAgeMs,
        oldestInFlightAgeMs,
      },
      journal: {
        currentFileSize,
        rotatedFiles: rotatedLogs,
        lastSeq: this.seq.peek(),
      },
      consumers,
      issues,
    };
  }

  private countFilesInDir(dir: string): number {
    try {
      return readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "_queue.json").length;
    } catch {
      return 0;
    }
  }

  private listCommandFiles(): string[] {
    try {
      return readdirSync(this.paths.commandsDir())
        .filter((f) => f.endsWith(".json") && f !== "_queue.json")
        .sort();
    } catch {
      return [];
    }
  }

  private readQueueIndex(): string[] {
    try {
      const queueFile = join(this.paths.commandsDir(), "_queue.json");
      if (!existsSync(queueFile)) return [];
      const raw = JSON.parse(readFileSync(queueFile, "utf8"));
      if (!Array.isArray(raw)) return [];
      return raw
        .map((entry) => String(entry).trim())
        .filter((entry) => entry !== "" && entry !== "_queue.json" && entry.endsWith(".json"))
        .sort();
    } catch {
      return [];
    }
  }

  private hasQueueIndexDrift(indexEntries: string[], commandFiles: string[]): boolean {
    if (indexEntries.length !== commandFiles.length) return true;

    const commandSet = new Set(commandFiles);
    const indexSet = new Set(indexEntries);

    for (const name of commandSet) {
      if (!indexSet.has(name)) return true;
    }
    for (const name of indexSet) {
      if (!commandSet.has(name)) return true;
    }

    return false;
  }

  private countQueueIndexMissingEntries(indexEntries: string[], commandFiles: string[]): number {
    const indexSet = new Set(indexEntries);
    let missing = 0;
    for (const name of commandFiles) {
      if (!indexSet.has(name)) missing++;
    }
    return missing;
  }

  private countQueueIndexExtraEntries(indexEntries: string[], commandFiles: string[]): number {
    const commandSet = new Set(commandFiles);
    let extra = 0;
    for (const name of indexEntries) {
      if (!commandSet.has(name)) extra++;
    }
    return extra;
  }

  private oldestFileAgeMs(dir: string): number {
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "_queue.json");
      if (files.length === 0) return 0;

      let oldestMtime = Number.MAX_SAFE_INTEGER;
      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        oldestMtime = Math.min(oldestMtime, stat.mtimeMs);
      }

      if (oldestMtime === Number.MAX_SAFE_INTEGER) return 0;
      return Math.max(0, Date.now() - oldestMtime);
    } catch {
      return 0;
    }
  }

  private countRotatedLogs(): number {
    try {
      return readdirSync(this.paths.logsDir()).filter(
        (f) =>
          f.startsWith("events.") &&
          f.endsWith(".ndjson") &&
          f !== "events.current.ndjson",
      ).length;
    } catch {
      return 0;
    }
  }

  private getConsumerLag(): BridgeHealth["consumers"] {
    const consumers: BridgeHealth["consumers"] = [];
    try {
      const consumerFiles = readdirSync(this.paths.consumerStateDir()).filter((f) =>
        f.endsWith(".json"),
      );

      for (const cf of consumerFiles) {
        const cp = JSON.parse(readFileSync(join(this.paths.consumerStateDir(), cf), "utf8"));
        const seqStore = this.seq.peek();
        consumers.push({
          consumerId: cf.replace(".json", ""),
          lastSeq: cp.lastSeq ?? 0,
          lagEvents: Math.max(0, seqStore - (cp.lastSeq ?? 0)),
          lastUpdate: cp.updatedAt ?? 0,
        });
      }
    } catch {
      // ignore
    }
    return consumers;
  }

  isLogNeededByAnyConsumer(logFile: string): boolean {
    try {
      const consumerFiles = readdirSync(this.paths.consumerStateDir()).filter((f) =>
        f.endsWith(".json"),
      );
      for (const cf of consumerFiles) {
        const cp = JSON.parse(readFileSync(join(this.paths.consumerStateDir(), cf), "utf8"));
        if (cp.currentFile === logFile) return true;
      }
    } catch {
      // ignore
    }
    return false;
  }
}
