#!/usr/bin/env bun
/**
 * Seguimiento en vivo para `bun run pt logs --live`.
 *
 * Esta vista sigue el log de debug de PT (`pt-debug.current.ndjson`),
 * que es la fuente que escribe el runtime/kernel.
 */

import {
  createDebugLogStream,
  type DebugLogEntry,
  type DebugLogStream,
} from "./debug-log-stream.js";
import { formatDebugLogMessage, shouldRenderDebugLogEntry } from "./debug-log-view.js";
import { sessionLogStore, type SessionLogEvent } from "./session-log-store.js";
import { createCommandTraceTracker } from "./pt-command-trace.js";
import { formatEcuadorTime } from "./time-format.js";
import { getPtDebugLogPath } from "../system/paths.js";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TAIL_LINES = 50;
const LIVE_FLUSH_DELAY_MS = 125;

type DebugTimelineItem = {
  kind: "debug";
  timestamp: string;
  seq: number;
  entry: DebugLogEntry;
  order: number;
};

type SessionTimelineItem = {
  kind: "session";
  timestamp: string;
  entry: SessionLogEvent;
  order: number;
};

type TimelineItem = DebugTimelineItem | SessionTimelineItem;

type TimelineItemInput = Omit<DebugTimelineItem, "order"> | Omit<SessionTimelineItem, "order">;

function color(code: string, text: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

function bold(text: string): string {
  return color("1", text);
}

function dim(text: string): string {
  return color("2", text);
}

function cyan(text: string): string {
  return color("36", text);
}

function green(text: string): string {
  return color("32", text);
}

function yellow(text: string): string {
  return color("33", text);
}

function red(text: string): string {
  return color("31", text);
}

function gray(text: string): string {
  return color("90", text);
}

function getScopeColor(scope: string): string {
  const lower = scope.toLowerCase();
  if (lower.includes("kernel")) return cyan(scope);
  if (lower.includes("loader")) return yellow(scope);
  if (lower.includes("runtime")) return green(scope);
  if (lower.includes("bridge")) return color("35", scope);
  if (lower.includes("cli")) return color("34", scope);
  return gray(scope);
}

function formatLocalTime(timestamp: string): string {
  return formatEcuadorTime(timestamp);
}

function renderDebugEntry(entry: DebugLogEntry): string {
  const time = formatLocalTime(entry.timestamp);
  const scope = getScopeColor(entry.scope.padEnd(10));
  const level = entry.level.toLowerCase();
  const levelBadge =
    level === "error"
      ? red(" ERR ")
      : level === "warn"
        ? yellow(" WARN ")
        : level === "info"
          ? green(" INFO ")
          : gray(` ${level.toUpperCase().slice(0, 4)} `);

  return `${gray(`[${time}]`)} ${scope} ${levelBadge} ${formatDebugLogMessage(entry)}`;
}

function getSessionLogs(): SessionLogEvent[] {
  const sessionsDir = sessionLogStore.dir;

  try {
    const files = readdirSync(sessionsDir)
      .filter((file) => file.endsWith(".ndjson"))
      .sort();

    const events: SessionLogEvent[] = [];
    for (const file of files) {
      try {
        const content = readFileSync(join(sessionsDir, file), "utf-8");
        for (const line of content.split("\n").filter(Boolean)) {
          try {
            events.push(JSON.parse(line) as SessionLogEvent);
          } catch {
            // Ignorar líneas inválidas.
          }
        }
      } catch {
        // Ignorar archivos que no se pueden leer.
      }
    }

    return events.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  } catch {
    return [];
  }
}

function renderSessionSummary(entry: SessionLogEvent): string {
  const time = formatLocalTime(entry.timestamp);
  const phase = entry.phase?.toLowerCase?.() ?? "unknown";
  const phaseBadge =
    phase === "start"
      ? cyan(" START ")
      : phase === "end"
        ? green(" OK ")
        : phase === "error"
          ? red(" ERR ")
          : gray(` ${phase.toUpperCase().slice(0, 4)} `);

  const sessionId = entry.session_id || "unknown";
  const correlationId = entry.correlation_id || "";
  const metaBadge = entry.metadata ? dim(" meta") : "";

  return `${gray(`[${time}]`)} ${phaseBadge} ${bold(entry.action || "unknown")} ${gray(`session:${sessionId}`)} ${correlationId ? cyan(`corr:${correlationId}`) : ""}${metaBadge}`.trim();
}

function buildSessionDetailPayload(entry: SessionLogEvent): Record<string, unknown> | null {
  if (!entry.metadata) return null;

  const phase = entry.phase?.toLowerCase?.() ?? "unknown";
  if (phase !== "end" && phase !== "error") {
    return entry.metadata;
  }

  const payload: Record<string, unknown> = {};
  const meta = entry.metadata;

  if (meta.ok !== undefined) payload.ok = meta.ok;
  if (meta.completionReason !== undefined) payload.completionReason = meta.completionReason;
  if (meta.commandIds !== undefined) payload.commandIds = meta.commandIds;
  if (meta.resultSummary !== undefined) payload.resultSummary = meta.resultSummary;
  if (meta.error !== undefined) payload.error = meta.error;
  if (meta.interactionSummary !== undefined) payload.interactionSummary = meta.interactionSummary;

  return Object.keys(payload).length > 0 ? payload : meta;
}

function renderSessionMetadata(entry: SessionLogEvent): string[] {
  const payload = buildSessionDetailPayload(entry);
  if (!payload) return [];
  try {
    return JSON.stringify(payload, null, 2).split("\n");
  } catch {
    return ["[metadata no serializable]"];
  }
}

function renderSessionOutcomeLine(entry: SessionLogEvent): string | null {
  const phase = entry.phase?.toLowerCase?.() ?? "unknown";
  if (phase !== "end" && phase !== "error") return null;

  const meta = entry.metadata ?? {};
  const parts: string[] = [];

  if (typeof meta.ok === "boolean") {
    parts.push(meta.ok ? green(" OK ") : red(" ERR "));
  }
  if (meta.completionReason) {
    parts.push(dim(String(meta.completionReason)));
  }
  if (Array.isArray(meta.commandIds) && meta.commandIds.length > 0) {
    parts.push(cyan(`cmds:${meta.commandIds.length}`));
  }

  if (parts.length === 0) return null;

  return `${gray("      ↳")} ${parts.join("  ")}`;
}

function renderSessionBlock(entry: SessionLogEvent): void {
  console.log(renderSessionSummary(entry));
  const lines = renderSessionMetadata(entry);
  if (lines.length === 0) return;

  const phase = entry.phase?.toLowerCase?.() ?? "unknown";
  const sectionLabel =
    phase === "end" ? green(" resultado ") : phase === "error" ? red(" error ") : dim(" meta ");

  console.log(`${gray("      ↳")} ${sectionLabel}`);
  const outcomeLine = renderSessionOutcomeLine(entry);
  if (outcomeLine) {
    console.log(outcomeLine);
  }
  console.log(`${gray("      ╭─")} ${dim(lines[0] ?? "{")}`);
  for (const line of lines.slice(1)) {
    console.log(`${gray("      │ ")} ${dim(line)}`);
  }
  console.log(`${gray("      ╰─")}`);
}

function compareTimelineItems(a: TimelineItem, b: TimelineItem): number {
  const timeDiff = Date.parse(a.timestamp) - Date.parse(b.timestamp);
  if (timeDiff !== 0) return timeDiff;

  const rankFor = (item: TimelineItem): number => {
    if (item.kind === "debug") return 1;

    const phase = item.entry.phase?.toLowerCase?.() ?? "unknown";
    if (phase === "start") return 0;
    if (phase === "end" || phase === "error") return 2;
    return 1;
  };

  const rankDiff = rankFor(a) - rankFor(b);
  if (rankDiff !== 0) return rankDiff;

  if (a.kind === "debug" && b.kind === "debug") {
    return a.seq - b.seq;
  }

  return a.order - b.order;
}

function printHeader(): void {
  console.log(bold(" bun run pt logs --live "));
  console.log(dim(" Seguimiento en vivo de PT · Ctrl+C para salir "));
  console.log(gray("─".repeat(84)));
  console.log(
    `${cyan(" PT ")} kernel/runtime  ${green(" INFO ")} info  ${yellow(" WARN ")} warn  ${red(" ERR ")} error`,
  );
  console.log(gray("─".repeat(84)) + "\n");
}

function printEntry(
  entry: DebugLogEntry,
  verbose: boolean,
  tracker: ReturnType<typeof createCommandTraceTracker>,
): void {
  const traceLines = tracker.consume(entry);
  if (traceLines.length > 0) {
    for (const line of traceLines) console.log(line);
    return;
  }

  if (!shouldRenderDebugLogEntry(entry, { verbose })) return;
  console.log(renderDebugEntry(entry));
}

export interface LiveDebugLogFollower {
  start(): Promise<void>;
  stop(): void;
}

export interface LiveDebugLogFollowerOptions {
  stream: DebugLogStream;
  sessionReader?: () => SessionLogEvent[];
  sinceMs?: number;
  verbose?: boolean;
}

export function createLiveDebugLogFollower(
  options: LiveDebugLogFollowerOptions,
): LiveDebugLogFollower {
  let stopFollow: (() => void) | null = null;
  let resolveStop: (() => void) | null = null;
  let started = false;
  let lastSeq = -1;
  let seenSessionKeys = new Set<string>();
  let pendingTimeline: TimelineItem[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let finalizeTimer: ReturnType<typeof setTimeout> | null = null;
  let itemOrder = 0;
  const verbose = options.verbose ?? false;
  const sessionReader = options.sessionReader ?? getSessionLogs;
  const sinceMs = options.sinceMs ?? 0;
  const commandTraceTracker = createCommandTraceTracker();

  const sessionKey = (entry: SessionLogEvent): string =>
    `${entry.session_id}|${entry.correlation_id}|${entry.timestamp}|${entry.phase}|${entry.action}`;

  const isRecent = (timestamp: string): boolean => {
    const ts = Date.parse(timestamp);
    return Number.isNaN(ts) ? true : ts >= sinceMs;
  };

  const queueTimelineItem = (item: TimelineItemInput): void => {
    if (item.kind === "debug") {
      pendingTimeline.push({
        kind: "debug",
        timestamp: item.timestamp,
        seq: item.seq,
        entry: item.entry,
        order: itemOrder++,
      });
    } else {
      pendingTimeline.push({
        kind: "session",
        timestamp: item.timestamp,
        entry: item.entry,
        order: itemOrder++,
      });
    }
    if (flushTimer !== null) return;

    flushTimer = setTimeout(() => {
      flushTimer = null;

      if (pendingTimeline.length === 0) return;

      const items = [...pendingTimeline].sort(compareTimelineItems);
      pendingTimeline = [];

      for (const current of items) {
        if (current.kind === "debug") {
          if (current.seq > lastSeq) {
            printEntry(current.entry, verbose, commandTraceTracker);
            lastSeq = current.seq;
          }
          continue;
        }

        renderSessionBlock(current.entry);
      }
    }, LIVE_FLUSH_DELAY_MS);
  };

  const collectNewSessionEntries = (): void => {
    const entries = sessionReader();
    for (const entry of entries) {
      if (!isRecent(entry.timestamp)) continue;
      const key = sessionKey(entry);
      if (seenSessionKeys.has(key)) continue;
      seenSessionKeys.add(key);
      queueTimelineItem({ kind: "session", timestamp: entry.timestamp, entry });
    }
  };

  const printInitialTimeline = (): void => {
    const timeline: TimelineItem[] = [];

    for (const entry of options.stream.tail(TAIL_LINES)) {
      if (!isRecent(entry.timestamp)) continue;
      timeline.push({
        kind: "debug",
        timestamp: entry.timestamp,
        seq: entry.seq,
        entry,
        order: itemOrder++,
      });
    }

    for (const entry of sessionReader()) {
      if (!isRecent(entry.timestamp)) continue;
      const key = sessionKey(entry);
      if (seenSessionKeys.has(key)) continue;
      seenSessionKeys.add(key);
      timeline.push({ kind: "session", timestamp: entry.timestamp, entry, order: itemOrder++ });
    }

    timeline.sort(compareTimelineItems);

    for (const item of timeline) {
      if (item.kind === "debug") {
        if (item.seq > lastSeq) {
          printEntry(item.entry, verbose, commandTraceTracker);
          lastSeq = item.seq;
        }
        continue;
      }

      renderSessionBlock(item.entry);
    }
  };

  return {
    async start(): Promise<void> {
      if (started) return;
      started = true;

      printHeader();

      printInitialTimeline();

      stopFollow = options.stream.follow(
        (entry) => {
          if (entry.seq <= lastSeq) return;
          queueTimelineItem({
            kind: "debug",
            timestamp: entry.timestamp,
            seq: entry.seq,
            entry,
          });
        },
        (error) => {
          console.error(gray(`Error en stream de debug: ${error.message}`));
        },
      );

      const sessionPoll = setInterval(() => {
        collectNewSessionEntries();
      }, 100);

      const originalStopFollow = stopFollow;
      stopFollow = () => {
        clearInterval(sessionPoll);
        if (flushTimer !== null) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        if (finalizeTimer !== null) return;
        finalizeTimer = setTimeout(() => {
          finalizeTimer = null;
          if (pendingTimeline.length > 0) {
            const items = [...pendingTimeline].sort(compareTimelineItems);
            pendingTimeline = [];
            for (const current of items) {
              if (current.kind === "debug") {
                if (current.seq > lastSeq) {
                  printEntry(current.entry, verbose, commandTraceTracker);
                  lastSeq = current.seq;
                }
                continue;
              }
              renderSessionBlock(current.entry);
            }
          }
          resolveStop?.();
        }, 0);
        originalStopFollow?.();
      };

      await new Promise<void>((resolve) => {
        resolveStop = resolve;
      });
    },

    stop(): void {
      stopFollow?.();
      stopFollow = null;
      if (finalizeTimer === null) {
        resolveStop?.();
        resolveStop = null;
      }
    },
  };
}

export async function runLiveTui(): Promise<void> {
  const startedAt = Date.now();
  const stream = createDebugLogStream(getPtDebugLogPath());
  const follower = createLiveDebugLogFollower({
    stream,
    sessionReader: getSessionLogs,
    sinceMs: startedAt,
    verbose: process.argv.includes("--verbose"),
  });

  const stop = (): void => {
    follower.stop();
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    console.log("\nDetenido.");
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  await follower.start();
}
