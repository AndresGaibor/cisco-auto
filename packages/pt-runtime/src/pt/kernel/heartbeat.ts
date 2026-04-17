// packages/pt-runtime/src/pt/kernel/heartbeat.ts
// Heartbeat writing for PT monitoring

import type { Heartbeat } from "./types";
import { safeFM } from "./safe-fm";

function isDebugEnabled(): boolean {
  try {
    const scope = (typeof self !== "undefined" ? self : Function("return this")()) as any;
    return scope.PT_DEBUG === 1 || scope.PT_DEBUG === "1" || scope.PT_DEBUG === true;
  } catch {
    return false;
  }
}

function debugLog(message: string): void {
  if (!isDebugEnabled()) return;
  try {
    dprint(message);
  } catch {}
}

export interface HeartbeatManager {
  write(): void;
  start(): void;
  stop(): void;
  setActiveCommand(id: string | null): void;
  setQueuedCount(count: number): void;
}

export function createHeartbeat(config: { devDir: string; intervalMs: number }) {
  let interval: ReturnType<typeof setInterval> | null = null;
  let isRunning = false;
  let activeCommand: { id: string; seq: number; type: string; startedAt: number } | null = null;
  let activeCommandRaw: string | null = null;
  let queuedCount = 0;

  function setActiveCommand(id: string | null): void {
    debugLog("[heartbeat] setActiveCommand: " + (id || "null"));
    activeCommandRaw = id;
    activeCommand = null;
  }

  function setQueuedCount(count: number): void {
    queuedCount = count;
  }

  function write(): void {
    try {
      const s = safeFM();
      if (!s.available || !s.fm) {
        debugLog("[heartbeat] fm unavailable — skipping write");
        return;
      }
      const hbPath = config.devDir + "/heartbeat.json";
      const hb: Heartbeat = {
        ts: Date.now(),
        running: isRunning,
        activeCommand: activeCommand
          ? {
              id: activeCommand.id,
              seq: activeCommand.seq,
              type: activeCommand.type,
              startedAt: activeCommand.startedAt,
            }
          : activeCommandRaw
            ? { id: activeCommandRaw, seq: 0, type: "unknown", startedAt: 0 }
            : null,
        queued: queuedCount,
      };
      debugLog(
        "[heartbeat] WRITE path=" +
          hbPath +
          " running=" +
          isRunning +
          " active=" +
          (activeCommand || "none"),
      );
      s.fm.writePlainTextToFile(hbPath, JSON.stringify(hb));
      debugLog("[heartbeat] WRITE OK");
    } catch (e) {
      debugLog("[heartbeat] WRITE ERROR: " + String(e));
    }
  }

  function start(): void {
    debugLog("[heartbeat] START interval=" + config.intervalMs + "ms");
    isRunning = true;
    write();
    interval = setInterval(() => write(), config.intervalMs);
  }

  function stop(): void {
    debugLog("[heartbeat] STOP");
    isRunning = false;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  return { write, start, stop, setActiveCommand, setQueuedCount };
}
