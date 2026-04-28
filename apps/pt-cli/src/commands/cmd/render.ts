#!/usr/bin/env bun
import chalk from "chalk";
import type { BridgeResultTimings } from "@cisco-auto/types";
import type { TerminalCommandResult } from "@cisco-auto/terminal-contracts";
import { cleanCmdOutput } from "./output-cleaner.js";

export interface CmdCliResult {
  schemaVersion: "1.0";
  ok: boolean;
  action: "cmd.exec";
  device: string;
  deviceKind: string;
  command: string;
  output: string;
  rawOutput?: string;
  status: number;
  warnings: string[];
  error?: {
    code: string;
    message: string;
    phase?: string;
  };
  nextSteps: string[];
  evidence?: unknown;
  timings?: BridgeResultTimings;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

function formatTimingsSummary(timings: BridgeResultTimings): string {
  const parts = [`total ${formatDuration(timings.waitMs)}`];

  if (typeof timings.queueLatencyMs === "number") {
    parts.push(`queue ${formatDuration(timings.queueLatencyMs)}`);
  }

  if (typeof timings.execLatencyMs === "number") {
    parts.push(`exec ${formatDuration(timings.execLatencyMs)}`);
  }

  return `Timings: ${parts.join(" | ")}`;
}

export function toCmdCliResult(
  result: TerminalCommandResult,
  options: { includeSyslogs?: boolean } = {},
): CmdCliResult {
  const nextSteps: string[] = [];
  const timings =
    typeof result.evidence === "object" && result.evidence !== null
      ? ((result.evidence as { timings?: BridgeResultTimings }).timings ?? undefined)
      : undefined;
  const cleaned = cleanCmdOutput({
    command: result.command,
    output: result.output,
    deviceKind: result.deviceKind,
    includeSyslogs: options.includeSyslogs,
  });
  const mergedWarnings = [...(result.warnings ?? []), ...cleaned.warnings];

  if (result.deviceKind === "ios") {
    nextSteps.push(`pt cmd ${result.device} "show running-config"`);
    nextSteps.push(`pt cmd ${result.device} "show ip interface brief"`);
  }

  if (result.deviceKind === "host") {
    nextSteps.push(`pt cmd ${result.device} "ipconfig"`);
    nextSteps.push(`pt verify ping ${result.device} <target-ip>`);
  }

  if (!result.ok) {
    nextSteps.unshift("pt doctor");
  }

  return {
    schemaVersion: "1.0",
    ok: result.ok,
    action: "cmd.exec",
    device: result.device,
    deviceKind: result.deviceKind,
    command: result.command,
    output: cleaned.output,
    rawOutput: result.rawOutput ?? cleaned.rawOutput,
    status: result.status,
    warnings: mergedWarnings,
    error: result.error,
    nextSteps,
    evidence: result.evidence,
    timings,
  };
}

export function printCmdResult(result: CmdCliResult, options: { json?: boolean; raw?: boolean; quiet?: boolean }): void {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (options.raw) {
    process.stdout.write(result.rawOutput ? `${result.rawOutput}\n` : result.output ? `${result.output}\n` : "");
    return;
  }

  if (result.timings && !options.quiet) {
    process.stdout.write(`${formatTimingsSummary(result.timings)}\n`);
  }

  if (!result.ok) {
    process.stderr.write("\n");
    process.stderr.write(`${chalk.red("✗")} Error ejecutando comando en ${chalk.bold(result.device)}\n`);
    process.stderr.write(`Código: ${result.error?.code ?? "UNKNOWN"}\n`);
    process.stderr.write(`Mensaje: ${result.error?.message ?? "Error desconocido"}\n`);

    if (result.output.trim()) {
      process.stderr.write("\nSalida capturada:\n");
      process.stderr.write("────────────────────────────────────────\n");
      process.stderr.write(`${result.output}\n`);
      process.stderr.write("────────────────────────────────────────\n");
    }

    process.stderr.write("\nSiguientes pasos sugeridos:\n");
    for (const step of result.nextSteps) {
      process.stderr.write(`  ${step}\n`);
    }
    process.stderr.write("\n");
    return;
  }

  if (options.quiet) return;

  process.stdout.write("\n");
  process.stdout.write(`${chalk.green("✓")} ${result.device} (${result.deviceKind}) ejecutó:\n`);
  process.stdout.write(`  ${chalk.bold(result.command)}\n`);
  process.stdout.write("\nSalida:\n");
  process.stdout.write("────────────────────────────────────────\n");
  if (result.output.trim()) {
    process.stdout.write(`${result.output.trimEnd()}\n`);
  } else {
    process.stdout.write(chalk.gray("(salida vacía)\n"));
  }
  process.stdout.write("────────────────────────────────────────\n");

  if (result.warnings.length > 0) {
    process.stdout.write("\nWarnings:\n");
    for (const warning of result.warnings) {
      process.stdout.write(`  ${chalk.yellow("⚠")} ${warning}\n`);
    }
  }

  process.stdout.write("\nSiguientes comandos útiles:\n");
  for (const step of result.nextSteps.slice(0, 3)) {
    process.stdout.write(`  ${step}\n`);
  }
  process.stdout.write("\n");
}
