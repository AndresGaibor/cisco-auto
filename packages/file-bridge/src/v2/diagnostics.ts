/**
 * Diagnostics - Health and diagnostics for FileBridge V2
 * Collects queue stats, lease info, and detects issues
 */

import { join } from "node:path";
import { readdirSync, readFileSync, statSync } from "node:fs";
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

export class BridgeDiagnostics {
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly seq: SequenceStore,
    private readonly ownerId: string,
    private readonly lease: BridgeLease | null,
  ) {}

  collectHealth(): BridgeHealth {
    const issues: string[] = [];
    const now = Date.now();

    let leaseActive = false;
    if (this.lease) {
      const isStale = !this.lease.expiresAt || now > this.lease.expiresAt;
      if (!isStale && this.lease.ownerId === this.ownerId) {
        leaseActive = true;
      }
    }

    const pendingCommands = this.countFilesInDir(this.paths.commandsDir());
    const inFlight = this.countFilesInDir(this.paths.inFlightDir());
    const results = this.countFilesInDir(this.paths.resultsDir());
    const rotatedLogs = this.countRotatedLogs();

    const consumers = this.getConsumerLag();

    // Detect issues
    if (inFlight > 10) issues.push(`${inFlight} commands stuck in-flight`);
    if (pendingCommands > 100) issues.push(`Command queue backing up: ${pendingCommands} pending`);
    for (const c of consumers) {
      if (c.lagEvents > 1000) issues.push(`Consumer ${c.consumerId} lagging by ${c.lagEvents} events`);
    }

    let currentFileSize = 0;
    try {
      currentFileSize = statSync(this.paths.currentEventsFile()).size;
    } catch {
      // ignore
    }

    return {
      status: issues.length === 0 ? "healthy" : issues.length < 3 ? "degraded" : "unhealthy",
      lease: {
        active: leaseActive,
        ownerId: this.lease?.ownerId ?? null,
        ageMs: this.lease ? now - this.lease.startedAt : 0,
      },
      queues: { pendingCommands, inFlight, results },
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
      return readdirSync(dir).filter((f) => f.endsWith(".json")).length;
    } catch {
      return 0;
    }
  }

  private countRotatedLogs(): number {
    try {
      return readdirSync(this.paths.logsDir())
        .filter((f) => f.startsWith("events.") && f.endsWith(".ndjson"))
        .length;
    } catch {
      return 0;
    }
  }

  private getConsumerLag(): BridgeHealth["consumers"] {
    const consumers: BridgeHealth["consumers"] = [];
    try {
      const consumerFiles = readdirSync(this.paths.consumerStateDir())
        .filter((f) => f.endsWith(".json"));
      for (const cf of consumerFiles) {
        const cp = JSON.parse(
          readFileSync(join(this.paths.consumerStateDir(), cf), "utf8")
        );
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
      const consumerFiles = readdirSync(this.paths.consumerStateDir())
        .filter((f) => f.endsWith(".json"));
      for (const cf of consumerFiles) {
        const cp = JSON.parse(
          readFileSync(join(this.paths.consumerStateDir(), cf), "utf8")
        );
        if (cp.currentFile === logFile) return true;
      }
    } catch {
      // ignore
    }
    return false;
  }
}
