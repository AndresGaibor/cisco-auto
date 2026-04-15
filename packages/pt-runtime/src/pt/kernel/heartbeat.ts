// packages/pt-runtime/src/pt/kernel/heartbeat.ts
// Heartbeat writing for PT monitoring

import type { Heartbeat } from "./types";
import { safeFM } from "./safe-fm";

export interface HeartbeatManager {
  write(): void;
  start(): void;
  stop(): void;
  setActiveCommand(id: string | null): void;
  setQueuedCount(count: number): void;
}

export function createHeartbeat(config: {
  devDir: string;
  intervalMs: number;
}) {
  let interval: ReturnType<typeof setInterval> | null = null;
  let isRunning = false;
  let activeCommand: string | null = null;
  let queuedCount = 0;

  function setActiveCommand(id: string | null): void {
    activeCommand = id;
  }

  function setQueuedCount(count: number): void {
    queuedCount = count;
  }

  function write(): void {
    try {
      const s = safeFM();
      if (!s.available || !s.fm) {
        dprint("[heartbeat] fm unavailable — skipping write");
        return;
      }
      const hbPath = config.devDir + "/heartbeat.json";
      const hb: Heartbeat = {
        ts: Date.now(),
        running: isRunning,
        activeCommand,
        queued: queuedCount,
      };
      s.fm.writePlainTextToFile(hbPath, JSON.stringify(hb));
    } catch (e) {
      dprint("[heartbeat] Error: " + String(e));
    }
  }

  function start(): void {
    isRunning = true;
    write();
    interval = setInterval(() => write(), config.intervalMs);
  }

  function stop(): void {
    isRunning = false;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  return { write, start, stop, setActiveCommand, setQueuedCount };
}