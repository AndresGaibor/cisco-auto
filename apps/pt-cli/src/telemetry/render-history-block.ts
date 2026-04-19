#!/usr/bin/env bun
/**
 * Renderer de bloques estilo logs para HistoryEntry.
 * Badges, flechas y box-drawing chars igual que log-summary.ts.
 */

import { formatEcuadorTime } from "./time-format.js";

export function formatSessionTime(timestamp: string): string {
  return formatEcuadorTime(timestamp);
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

export function renderHistoryHeader(sessionId: string, action: string, status: string): string {
  const statusBadge =
    status === "success"
      ? green(" OK ")
      : status === "error" || status === "failure"
        ? red(" ERR ")
        : gray(` ${status.toUpperCase().slice(0, 4)} `);

  return `${bold("╔")} ${statusBadge} ${bold(action)} ${gray(`session:${sessionId.slice(0, 8)}`)} ${bold("╗")}`;
}

export function renderHistoryRow(label: string, value: string): string {
  return `${gray("║")} ${dim(label.padEnd(14))} ${value} ${gray("║")}`;
}

export function renderHistoryDivider(): string {
  return gray("╟" + "─".repeat(52) + "╢");
}

export function renderHistorySection(label: string, lines: string[]): void {
  if (lines.length === 0) return;
  console.log(`${gray("║")}  ${bold(label)}`);
  for (const line of lines) {
    console.log(`${gray("║")}  ${dim(line)}`);
  }
}

export function renderHistoryOutcome(
  ok: boolean,
  completionReason?: string,
  commandIds?: string[],
): void {
  const parts: string[] = [];
  parts.push(ok ? green(" OK ") : red(" ERR "));
  if (completionReason) parts.push(dim(completionReason));
  if (commandIds && commandIds.length > 0) parts.push(cyan(`cmds:${commandIds.length}`));
  if (parts.length === 0) return;
  console.log(`${gray("║")}  ${gray("↳")} ${parts.join("  ")}`);
}

export function renderHistoryErrorSection(errorMessage: string, causes: string[]): void {
  console.log(`${gray("║")}  ${red("Error:")} ${errorMessage}`);
  if (causes.length > 0) {
    console.log(`${gray("║")}  ${bold("Causas probables:")}`);
    for (const c of causes) {
      console.log(`${gray("║")}  ${red("→")} ${dim(c)}`);
    }
  }
}

export function renderHistoryFooter(): void {
  console.log(gray("╚" + "═".repeat(54) + "╝"));
}

export function renderHistoryBlock(
  sessionId: string,
  action: string,
  status: string,
  startedAt: string,
  endedAt?: string,
  durationMs?: number,
  targetDevice?: string,
  commandIds?: string[],
  completionReason?: string,
  errorMessage?: string,
  causes?: string[],
): void {
  console.log("");
  console.log(renderHistoryHeader(sessionId, action, status));

  const time = formatSessionTime(startedAt);
  const durationStr =
    durationMs !== undefined
      ? durationMs < 1000
        ? `${durationMs}ms`
        : durationMs < 60000
          ? `${(durationMs / 1000).toFixed(1)}s`
          : `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
      : undefined;

  console.log(`${gray("║")}  ${dim("time:")}   ${time}`);
  if (durationStr) console.log(`${gray("║")}  ${dim("duration:")} ${durationStr}`);
  if (targetDevice) console.log(`${gray("║")}  ${dim("device:")} ${targetDevice}`);
  if (commandIds && commandIds.length > 0)
    console.log(`${gray("║")}  ${dim("cmds:")}   ${commandIds.join(", ")}`);

  if (endedAt) {
    const endTime = formatSessionTime(endedAt);
    console.log(`${gray("║")}  ${dim("end:")}    ${endTime}`);
  }

  console.log(renderHistoryDivider());

  if (errorMessage) {
    renderHistoryErrorSection(errorMessage, causes ?? []);
  } else {
    renderHistoryOutcome(status === "success", completionReason, commandIds);
  }

  console.log(renderHistoryFooter());
  console.log("");
}
