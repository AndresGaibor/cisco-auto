/**
 * Bridge stats and cleaning service for CLI observability.
 */

import { existsSync, readdirSync, statSync, unlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BridgeStats, QueueStats, BridgeCleanResult } from "../bench-types.js";
import { resolvePtDevDir } from "../../system/paths.js";
import {
  isQueueIndexFile,
  isDeadLetterCommandFile,
} from "@cisco-auto/file-bridge";

export function getBridgeStats(ptDevDir: string): BridgeStats {
  const commandsDir = join(ptDevDir, "commands");
  const inFlightDir = join(ptDevDir, "in-flight");
  const deadLetterDir = join(ptDevDir, "dead-letter");

  return {
    schemaVersion: "1.0",
    ptDevDir,
    commands: scanQueue(commandsDir),
    inFlight: scanQueue(inFlightDir),
    deadLetter: scanQueue(deadLetterDir),
  };
}

function scanQueue(dir: string): QueueStats {
  if (!existsSync(dir)) {
    return { count: 0 };
  }

  const files = readdirSync(dir).filter((f) => isQueueIndexFile(f) || isDeadLetterCommandFile(f));
  let oldest: string | undefined;
  let newest: string | undefined;

  if (files.length > 0) {
    const withMtime = files.map((name) => {
      const mtime = statSync(join(dir, name)).mtimeMs;
      return { name, mtime };
    });
    const sorted = withMtime.sort((a, b) => a.mtime - b.mtime);
    oldest = new Date(sorted[0]!.mtime).toISOString();
    newest = new Date(sorted[sorted.length - 1]!.mtime).toISOString();
  }

  return {
    count: files.length,
    oldest,
    newest,
  };
}

export function cleanBridge(dryRun: boolean, ptDevDir: string): BridgeCleanResult {
  const removed: string[] = [];
  const errors: string[] = [];

  const deadLetterDir = join(ptDevDir, "dead-letter");
  if (!existsSync(deadLetterDir)) {
    return { schemaVersion: "1.0", action: "bridge.clean", dryRun, removed, errors };
  }

  const files = readdirSync(deadLetterDir).filter(isDeadLetterCommandFile);

  for (const file of files) {
    try {
      if (!dryRun) {
        unlinkSync(join(deadLetterDir, file));
      }
      removed.push(file);
    } catch (e) {
      errors.push(`Error cleaning ${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { schemaVersion: "1.0", action: "bridge.clean", dryRun, removed, errors };
}

export function cleanStaleInFlight(ptDevDir: string, maxAgeMs = 300_000): BridgeCleanResult {
  const removed: string[] = [];
  const errors: string[] = [];
  const inFlightDir = join(ptDevDir, "in-flight");

  if (!existsSync(inFlightDir)) {
    return { schemaVersion: "1.0", action: "bridge.clean", dryRun: false, removed, errors };
  }

  const now = Date.now();
  const files = readdirSync(inFlightDir).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    try {
      const filePath = join(inFlightDir, file);
      const mtimeMs = statSync(filePath).mtimeMs;
      if (now - mtimeMs > maxAgeMs) {
        if (!file.startsWith("._")) {
          unlinkSync(filePath);
          removed.push(file);
        }
      }
    } catch (e) {
      errors.push(`Error cleaning ${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { schemaVersion: "1.0", action: "bridge.clean", dryRun: false, removed, errors };
}

export function getRuntimeTrace(lastN: number): { id: string; type: string; completedAt: number; ok?: boolean; ts?: number; status?: string; commandType?: string }[] {
  const logFile = join(resolvePtDevDir(), "logs", "session.log");

  if (!existsSync(logFile)) {
    return [];
  }

  const content = readFileSync(logFile, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  const entries: { id: string; type: string; completedAt: number; ok?: boolean; ts?: number; status?: string; commandType?: string }[] = [];

  for (const line of lines.slice(-lastN * 2)) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.phase === "end" || parsed.type === "command") {
        entries.push({
          id: parsed.correlation_id ?? parsed.id ?? "",
          type: parsed.action ?? parsed.type ?? "",
          completedAt: new Date(parsed.timestamp ?? Date.now()).getTime(),
          ok: parsed.ok,
          ts: parsed.timestamp ? new Date(parsed.timestamp).getTime() : undefined,
          status: parsed.completionReason ?? parsed.status,
          commandType: parsed.commandType,
        });
      }
    } catch {
      // skip non-JSON lines
    }
  }

  return entries.slice(-lastN);
}
