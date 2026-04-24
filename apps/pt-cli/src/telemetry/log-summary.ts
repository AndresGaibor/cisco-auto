#!/usr/bin/env bun
/**
 * Resumen de eventos para logs --live TUI.
 * Produce una línea corta por evento con todo lo necesario para decidir
 * si expandirlso o no, y guarda el contenido completo para la vista expandida.
 */

import type { SessionLogEvent } from "./session-log-store.js";
import { formatEcuadorTime } from "./time-format.js";

export interface LogSummary {
  sessionId: string;
  correlationId: string;
  timestamp: string;
  time: string;
  phase: string;
  action: string;
  icon: string;
  ok: boolean | null;
  resumen: string;
  preview: string;
  detalle: string;
}

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

function red(text: string): string {
  return color("31", text);
}

function gray(text: string): string {
  return color("90", text);
}

export function formatSessionTime(timestamp: string): string {
  return formatEcuadorTime(timestamp);
}

export function renderSessionSummaryLine(event: SessionLogEvent): string {
  const time = formatSessionTime(event.timestamp);
  const phase = event.phase?.toLowerCase?.() ?? "unknown";
  const phaseBadge =
    phase === "start"
      ? cyan(" START ")
      : phase === "end"
        ? green(" OK ")
        : phase === "error"
          ? red(" ERR ")
          : gray(` ${phase.toUpperCase().slice(0, 4)} `);

  const sessionId = event.session_id || "unknown";
  const correlationId = event.correlation_id || "";
  const metaBadge = event.metadata ? dim(" meta") : "";

  return `${gray(`[${time}]`)} ${phaseBadge} ${bold(event.action || "unknown")} ${gray(`session:${sessionId}`)} ${correlationId ? cyan(`corr:${correlationId}`) : ""}${metaBadge}`.trim();
}

export function renderSessionOutcomeLine(event: SessionLogEvent): string | null {
  const phase = event.phase?.toLowerCase?.() ?? "unknown";
  if (phase !== "end" && phase !== "error") return null;

  const meta = event.metadata ?? {};
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

export function renderSessionDetailLines(event: SessionLogEvent): string[] {
  if (!event.metadata) return [];

  const phase = event.phase?.toLowerCase?.() ?? "unknown";
  const meta = event.metadata;

  const payload: Record<string, unknown> =
    phase === "end" || phase === "error"
      ? {
          ...(meta.ok !== undefined ? { ok: meta.ok } : {}),
          ...(meta.completionReason !== undefined
            ? { completionReason: meta.completionReason }
            : {}),
          ...(meta.commandIds !== undefined ? { commandIds: meta.commandIds } : {}),
          ...(meta.resultSummary !== undefined ? { resultSummary: meta.resultSummary } : {}),
          ...(meta.error !== undefined ? { error: meta.error } : {}),
          ...(meta.interactionSummary !== undefined
            ? { interactionSummary: meta.interactionSummary }
            : {}),
        }
      : meta;

  try {
    return JSON.stringify(payload, null, 2).split("\n");
  } catch {
    return ["[metadata no serializable]"];
  }
}

export function renderSessionBlock(event: SessionLogEvent): string[] {
  const lines: string[] = [renderSessionSummaryLine(event)];
  const detailLines = renderSessionDetailLines(event);
  if (detailLines.length === 0) return lines;

  const phase = event.phase?.toLowerCase?.() ?? "unknown";
  const sectionLabel =
    phase === "end" ? green(" resultado ") : phase === "error" ? red(" error ") : dim(" meta ");

  lines.push(`${gray("      ↳")} ${sectionLabel}`);

  const outcomeLine = renderSessionOutcomeLine(event);
  if (outcomeLine) lines.push(outcomeLine);

  lines.push(`${gray("      ╭─")} ${dim(detailLines[0] ?? "{")}`);
  for (const line of detailLines.slice(1)) {
    lines.push(`${gray("      │ ")} ${dim(line)}`);
  }
  lines.push(`${gray("      ╰─")}`);

  return lines;
}

function iconFor(phase: string, ok: boolean | null): string {
  if (phase === "start") return "🔵";
  if (phase === "end" && ok === false) return "🔴";
  if (phase === "end" && ok === true) return "🟢";
  if (phase === "error") return "🔴";
  return "⚪";
}

export function truncate(str: string, max: number): string {
  if (!str) return "";
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

function summarizeValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return truncate(value, 60);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length === 1) return summarizeValue(key, value[0]);
    return `${value.length} items`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    if (keys.length === 1) {
      const [k, v] = Object.entries(obj)[0]!;
      return `${k}: ${summarizeValue(k, v)}`;
    }
    return `{${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "…" : ""}}`;
  }
  return String(value);
}

function buildResumen(event: SessionLogEvent): string {
  const meta = event.metadata;
  if (!meta) return "";

  const parts: string[] = [];

  if (meta.payloadPreview && typeof meta.payloadPreview === "object") {
    const pp = meta.payloadPreview as Record<string, unknown>;
    const entries = Object.entries(pp).slice(0, 4);
    for (const [k, v] of entries) {
      parts.push(`${k}=${summarizeValue(k, v)}`);
    }
  }

  if (meta.contextSummary && typeof meta.contextSummary === "object") {
    const cs = meta.contextSummary as Record<string, unknown>;
    if (cs.deviceCount !== undefined) parts.push(`devices:${cs.deviceCount}`);
    if (cs.linkCount !== undefined) parts.push(`links:${cs.linkCount}`);
    if (cs.bridgeReady !== undefined) parts.push(`bridge:${cs.bridgeReady ? "up" : "down"}`);
  }

  if (meta.error) parts.push(`error`);

  return parts.length > 0 ? parts.join(" · ") : "";
}

function buildPreview(event: SessionLogEvent): string {
  const meta = event.metadata;
  if (!meta) return "";

  const chunks: string[] = [];

  if (meta.ok !== undefined) chunks.push(`ok=${meta.ok}`);
  if (meta.durationMs !== undefined) chunks.push(`${meta.durationMs}ms`);
  if (meta.command_ids && Array.isArray(meta.command_ids))
    chunks.push(`cmds:${meta.command_ids.length}`);
  if (meta.interactionSummary) chunks.push(truncate(String(meta.interactionSummary), 80));

  return chunks.join(" · ");
}

function buildDetalle(event: SessionLogEvent): string {
  const meta = event.metadata;
  if (!meta) return JSON.stringify(event, null, 2);

  const sections: string[] = [];

  sections.push("=== SessionLogEvent ===");
  sections.push(`  session_id: ${event.session_id}`);
  sections.push(`  correlation_id: ${event.correlation_id}`);
  sections.push(`  timestamp: ${event.timestamp}`);
  sections.push(`  phase: ${event.phase}`);
  sections.push(`  action: ${event.action}`);

  sections.push("");
  sections.push("=== metadata ===");
  sections.push(JSON.stringify(meta, null, 2));

  return sections.join("\n");
}

export function summarizeEvent(event: SessionLogEvent): LogSummary {
  const ts = event.timestamp ? (event.timestamp.split("T")[1]?.split(".")[0] ?? "") : "";
  const phase = event.phase ?? "unknown";
  const meta = event.metadata;
  const ok =
    meta?.ok !== undefined
      ? Boolean(meta.ok)
      : meta?.verified !== undefined
        ? Boolean(meta.verified)
        : null;

  return {
    sessionId: event.session_id,
    correlationId: event.correlation_id,
    timestamp: event.timestamp,
    time: ts,
    phase,
    action: event.action,
    icon: iconFor(phase, ok),
    ok,
    resumen: buildResumen(event),
    preview: buildPreview(event),
    detalle: buildDetalle(event),
  };
}

export function summarizeEvents(events: SessionLogEvent[]): LogSummary[] {
  return events.map(summarizeEvent);
}
