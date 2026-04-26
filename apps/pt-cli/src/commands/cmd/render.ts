#!/usr/bin/env bun
import chalk from "chalk";
import type { TerminalCommandResult } from "@cisco-auto/terminal-contracts";

export interface CmdCliResult {
  schemaVersion: "1.0";
  ok: boolean;
  action: "cmd.exec";
  device: string;
  deviceKind: string;
  command: string;
  output: string;
  status: number;
  warnings: string[];
  error?: {
    code: string;
    message: string;
    phase?: string;
  };
  nextSteps: string[];
  evidence?: unknown;
}

export function toCmdCliResult(result: TerminalCommandResult): CmdCliResult {
  const nextSteps: string[] = [];

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
    output: result.output,
    status: result.status,
    warnings: result.warnings,
    error: result.error,
    nextSteps,
    evidence: result.evidence,
  };
}

export function printCmdResult(result: CmdCliResult, options: { json?: boolean; raw?: boolean; quiet?: boolean }): void {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (options.raw) {
    process.stdout.write(result.output ? `${result.output}\n` : "");
    return;
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