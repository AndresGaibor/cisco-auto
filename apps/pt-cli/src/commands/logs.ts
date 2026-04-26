#!/usr/bin/env bun
/**
 * Comando logs - Visor de trazas para debugging
 * Delega lectura/parsing/clasificación a pt-control/application/logs
 */

import { Command } from "commander";
import { existsSync } from "node:fs";

import type { CliResult } from "../contracts/cli-result.js";
import { createSuccessResult, createErrorResult } from "../contracts/cli-result.js";
import type { CommandMeta } from "../contracts/command-meta.js";
import type { GlobalFlags } from "../flags.js";

import { runCommand } from "../application/run-command.js";
import { renderCliResult } from "../ux/renderers.js";
import { printExamples } from "../ux/examples.js";
import {
  getLogsDir,
  getCommandLogsDir,
  getResultsDir,
  getSessionLogsDir,
  getEventsPath,
  getBundlesDir,
  getPtDebugLogPath,
} from "../system/paths.js";
import { createDebugLogStream } from "../telemetry/debug-log-stream.js";
import { formatDebugLogMessage, shouldRenderDebugLogEntry } from "../telemetry/debug-log-view.js";
import { runLiveTui } from "../telemetry/log-live-tui.js";
import { renderSessionBlock, formatSessionTime } from "../telemetry/log-summary.js";
import { formatEcuadorTime } from "../telemetry/time-format.js";

import {
  findRecentLogErrors,
  generateLogBundle,
  inspectCommandLogs,
  isSessionLogLike,
  listIosLogEntries,
  readLogSession,
  tailLogs,
  type LogsBundleResult,
  type LogsCommandResult,
  type LogsErrorsResult,
  type LogsIosResult,
  type LogsSessionResult,
  type LogsTailResult,
} from "@cisco-auto/pt-control/application/logs";

import {
  createCliLogBundleWriter,
  createCliLogSessionRepository,
} from "../adapters/logs-repository.js";

const SCOPE_COLORS: Record<string, string> = {
  kernel: "\x1b[36m",
  loader: "\x1b[33m",
  runtime: "\x1b[32m",
  bridge: "\x1b[35m",
  cli: "\x1b[34m",
};

function getScopeColor(scope: string): string {
  const lower = scope.toLowerCase();
  for (const [key, color] of Object.entries(SCOPE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "\x1b[37m";
}

function color(code: string, text: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

function gray(text: string): string {
  return color("90", text);
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

function bold(text: string): string {
  return color("1", text);
}

function renderGenericTailLine(entry: Record<string, unknown>): string {
  const timestamp = typeof entry.timestamp === "string" ? formatSessionTime(entry.timestamp) : "";
  const phase = typeof entry.phase === "string" ? entry.phase.toLowerCase() : "unknown";
  const action =
    typeof entry.action === "string"
      ? entry.action
      : typeof entry.message === "string"
        ? entry.message
        : "evento";
  const sessionId =
    typeof entry.session_id === "string"
      ? entry.session_id
      : typeof entry.sessionId === "string"
        ? entry.sessionId
        : "unknown";
  const ok = entry.ok;

  const badge =
    phase === "start"
      ? cyan(" START ")
      : phase === "end" && ok === true
        ? green(" OK ")
        : phase === "end" && ok === false
          ? red(" ERR ")
          : phase === "error"
            ? red(" ERR ")
            : yellow(` ${phase.toUpperCase().slice(0, 4)} `);

  return `${gray(`[${timestamp}]`)} ${badge} ${bold(action)} ${gray(`session:${sessionId}`)}`.trim();
}

async function renderLiveDebugLog(lines: number): Promise<void> {
  const debugLogPath = getPtDebugLogPath();
  const verbose = process.argv.includes("--verbose") || process.argv.includes("--debug");

  if (!existsSync(debugLogPath)) {
    console.log("Esperando logs...");
    console.log(
      "(El archivo de debug log aún no existe. Asegúrate de que Packet Tracer esté corriendo.)",
    );
    return;
  }

  const stream = createDebugLogStream(debugLogPath);
  const initialEntries = stream.tail(lines);

  console.log(`\n=== Eventos relevantes de debug (últimas ${lines} entradas crudas) ===\n`);
  if (!verbose) {
    console.log(
      "Nota: se muestran solo eventos relevantes. Usa --verbose para ver el detalle completo.\n",
    );
  }
  for (const entry of initialEntries) {
    if (!shouldRenderDebugLogEntry(entry, { verbose })) continue;
    const time = formatLocalTime(entry.timestamp);
    const scopeColor = getScopeColor(entry.scope);
    const message = formatDebugLogMessage(entry);
    console.log(`[${time}] ${scopeColor}${entry.scope.padEnd(10)}\x1b[0m ${message}`);
  }

  console.log("\n⏳ Listening for new entries... (Ctrl+C para salir)\n");

  const stopFollow = stream.follow(
    (entry) => {
      if (!shouldRenderDebugLogEntry(entry, { verbose })) return;
      const time = formatLocalTime(entry.timestamp);
      const scopeColor = getScopeColor(entry.scope);
      const message = formatDebugLogMessage(entry);
      console.log(`[${time}] ${scopeColor}${entry.scope.padEnd(10)}\x1b[0m ${message}`);
    },
    (err) => {
      console.error("Error en stream de debug:", err.message);
    },
  );

  process.on("SIGINT", () => {
    stopFollow();
    console.log("\n\nDetenido.");
    process.exit(0);
  });
}

const LOGS_EXAMPLES = [
  { command: "pt logs tail", description: "Mostrar últimos eventos" },
  { command: "pt logs tail -f", description: "Seguir eventos en tiempo real" },
  { command: "pt logs errors", description: "Buscar errores recientes" },
  { command: "pt logs session abc123", description: "Ver timeline de sesión" },
  { command: "pt logs bundle abc123", description: "Generar bundle de debugging" },
];

const LOGS_META: CommandMeta = {
  id: "logs",
  summary: "Inspeccionar trazas de ejecución",
  longDescription: "Proporciona inspección de logs de CLI, bridge y PT-side para debugging.",
  examples: LOGS_EXAMPLES,
  related: ["history", "results", "doctor"],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: false,
};

export function createLogsCommand(): Command {
  const cmd = new Command("logs");

  cmd.option("-l, --live", "Seguir logs en tiempo real", false);

  cmd.description("Inspeccionar trazas de ejecución").hook("preAction", async () => {
    const logsDir = getLogsDir();
    if (!existsSync(logsDir)) {
      console.log("Directorio de logs no existe. Ejecuta algunos comandos primero.");
    }
  });

  cmd.action(async function (this: Command) {
    const options = this.opts() as { live?: boolean };

    if (options.live) {
      await runLiveTui();
      return;
    }

    this.help({ error: false });
  });

  const tailCmd = cmd
    .command("tail")
    .description("Mostrar los últimos N eventos del log actual")
    .argument("[lines]", "Número de líneas (default: 20)", "20")
    .option("-f, --follow", "Seguir nuevos eventos en tiempo real", false)
    .option("-l, --live", "Seguir logs en tiempo real", false)
    .option("--errors-only", "Mostrar solo errores", false)
    .option("--bridge", "Incluir eventos del bridge", false)
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (linesArg: string, options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");

      if (globalExamples) {
        console.log(printExamples(LOGS_META));
        return;
      }

      if (globalExplain) {
        console.log(LOGS_META.longDescription ?? LOGS_META.summary);
        return;
      }

      if (globalPlan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Leer últimos ${linesArg} eventos de logs`);
        if (options.follow) console.log("  2. Seguir nuevos eventos en tiempo real");
        if (options.errorsOnly) console.log("  3. Filtrar solo errores");
        return;
      }

      const lines = parseInt(linesArg, 10) || 20;

      if (options.live) {
        await runLiveTui();
        return;
      }

      if (options.follow) {
        console.log("\n⏳ Follow simple todavía vive en CLI. Usa 'pt logs --live' para TUI completo.");
        return;
      }

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: "text",
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: false,
        explain: globalExplain,
        plan: globalPlan,
        verify: false,
      };

      const result = await runCommand<LogsTailResult>({
        action: "logs.tail",
        meta: LOGS_META,
        flags,
        payloadPreview: {
          lines,
          errorsOnly: options.errorsOnly,
          bridge: options.bridge,
        },
        execute: async (): Promise<CliResult<LogsTailResult>> => {
          const execution = await tailLogs({
            logsDir: getLogsDir(),
            lines,
            errorsOnly: options.errorsOnly,
          });

          if (!execution.ok) {
            return createErrorResult("logs.tail", execution.error);
          }

          return createSuccessResult("logs.tail", execution.data, {
            advice: execution.advice,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (result.ok && result.data) {
        console.log(`\n=== Últimos ${lines} eventos ===\n`);

        for (const rawEntry of result.data.entries) {
          const entry = rawEntry as Record<string, unknown>;
          if (isSessionLogLike(entry)) {
            for (const line of renderSessionBlock(entry)) {
              console.log(line);
            }
          } else {
            console.log(renderGenericTailLine(entry));
          }
        }
      }

      if (!result.ok) process.exit(1);
    });

  cmd
    .command("session")
    .description("Mostrar timeline de una sesión")
    .argument("<sessionId>", "ID de la sesión")
    .option("--json", "Salida en JSON", false)
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (sessionId: string, options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");

      if (globalExamples) {
        console.log(printExamples(LOGS_META));
        return;
      }

      if (globalPlan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Buscar sesión: ${sessionId}`);
        console.log("  2. Mostrar eventos en timeline");
        return;
      }

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: "text",
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: false,
        explain: globalExplain,
        plan: globalPlan,
        verify: false,
      };

      const result = await runCommand<LogsSessionResult>({
        action: "logs.session",
        meta: LOGS_META,
        flags,
        payloadPreview: { sessionId },
        execute: async (): Promise<CliResult<LogsSessionResult>> => {
          const execution = await readLogSession(createCliLogSessionRepository(), {
            sessionId,
          });

          if (!execution.ok) {
            return createErrorResult("logs.session", execution.error);
          }

          return createSuccessResult("logs.session", execution.data, {
            advice: execution.advice,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (result.ok && result.data) {
        console.log("");
        console.log(`═══ Timeline: Sesión ${result.data.sessionId} ═══`);
        console.log(`Eventos: ${result.data.count}`);
        console.log("");

        if (result.data.events.length === 0) {
          console.log("  No se encontraron eventos para esta sesión.");
        } else {
          for (const evt of result.data.events) {
            for (const line of renderSessionBlock(evt)) {
              console.log(`  ${line}`);
            }
          }
        }
        console.log("");
      }

      if (!result.ok) process.exit(1);
    });

  cmd
    .command("command")
    .description("Fusionar bridge events + PT trace + resultado de un comando")
    .argument("<commandId>", "ID del comando")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (commandId: string, options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");

      if (globalExamples || globalExplain || globalPlan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Buscar trace de comando: ${commandId}`);
        console.log("  2. Buscar resultado");
        console.log("  3. Buscar eventos del bridge");
        return;
      }

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: "text",
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: false,
        explain: globalExplain,
        plan: globalPlan,
        verify: false,
      };

      const result = await runCommand<LogsCommandResult>({
        action: "logs.command",
        meta: LOGS_META,
        flags,
        payloadPreview: { commandId },
        execute: async (): Promise<CliResult<LogsCommandResult>> => {
          const execution = await inspectCommandLogs({
            commandId,
            commandLogsDir: getCommandLogsDir(),
            resultsDir: getResultsDir(),
            eventsPath: getEventsPath(),
          });

          if (!execution.ok) {
            return createErrorResult("logs.command", execution.error);
          }

          return createSuccessResult("logs.command", execution.data, {
            advice: execution.advice,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (result.ok && result.data) {
        console.log(`\n=== Comando: ${commandId} ===\n`);

        if (result.data.trace) {
          console.log("--- PT-Side Trace ---");
          console.log(JSON.stringify(result.data.trace, null, 2));
          console.log();
        }

        if (result.data.result) {
          console.log("--- Resultado ---");

          const value = result.data.result as Record<string, unknown>;
          const verification =
            value.verification && typeof value.verification === "object"
              ? (value.verification as Record<string, unknown>)
              : undefined;

          if (verification) {
            console.log("Verification:");
            if (typeof verification.executed !== "undefined") {
              console.log(`  executed: ${verification.executed}`);
            }
            if (typeof verification.verified !== "undefined") {
              console.log(`  verified: ${verification.verified}`);
            }
            if (verification.partiallyVerified) {
              console.log("  partiallyVerified: true");
            }
            if (Array.isArray(verification.verificationSource)) {
              console.log(`  source: ${verification.verificationSource.join(", ")}`);
            }
            if (Array.isArray(verification.warnings)) {
              console.log(`  warnings: ${verification.warnings.join("; ")}`);
            }
            if (Array.isArray(verification.checks)) {
              console.log("  checks:");
              for (const check of verification.checks) {
                const c = check as { name?: string; ok?: boolean; details?: unknown };
                console.log(
                  `    - ${c.name}: ${c.ok} ${c.details ? JSON.stringify(c.details) : ""}`,
                );
              }
            }
            console.log();
          }

          console.log(JSON.stringify(result.data.result, null, 2));
          console.log();
        }

        if (result.data.bridgeEvents.length > 0) {
          console.log("--- Bridge Events (recientes) ---");
          console.log(JSON.stringify(result.data.bridgeEvents, null, 2));
          console.log();
        }

        if (!result.data.foundAny) {
          console.log("No se encontró información para este comando.");
          console.log("Los archivos de trace se crean cuando --trace está habilitado.");
        }
      }

      if (!result.ok) process.exit(1);
    });

  cmd
    .command("errors")
    .description("Buscar sesiones fallidas recientes")
    .option("-n, --limit <num>", "Número de errores a mostrar", "10")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalPlan = process.argv.includes("--plan");

      if (globalExamples) {
        console.log(printExamples(LOGS_META));
        return;
      }

      if (globalPlan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Buscar últimos ${options.limit} errores`);
        console.log("  2. Mostrar timestamp, sesión y mensaje");
        return;
      }

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: "text",
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: false,
        explain: false,
        plan: globalPlan,
        verify: false,
      };

      const limit = parseInt(options.limit) || 10;
      const result = await runCommand<LogsErrorsResult>({
        action: "logs.errors",
        meta: LOGS_META,
        flags,
        payloadPreview: { limit },
        execute: async (): Promise<CliResult<LogsErrorsResult>> => {
          const execution = await findRecentLogErrors({
            logsDir: getLogsDir(),
            limit,
          });

          if (!execution.ok) {
            return createErrorResult("logs.errors", execution.error);
          }

          return createSuccessResult("logs.errors", execution.data, {
            advice: execution.advice,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (result.ok && result.data) {
        console.log("");
        console.log(`═══ Errores recientes (${result.data.count}) ═══`);
        console.log("");

        if (result.data.errors.length === 0) {
          console.log("  No se encontraron errores recientes.");
        } else {
          const byLayer: Record<string, typeof result.data.errors> = {
            bridge: [],
            pt: [],
            ios: [],
            verification: [],
            other: [],
          };
          for (const err of result.data.errors) {
            byLayer[err.layer]!.push(err);
          }

          for (const [layer, errs] of Object.entries(byLayer)) {
            if (errs.length === 0) continue;
            console.log(`  ── ${layer.toUpperCase()} (${errs.length}) ──`);
            for (const e of errs) {
              console.log(`  [${e.timestamp}] ${e.action}`);
              if (e.error) console.log(`    → ${e.error.slice(0, 100)}`);
            }
            console.log("");
          }
        }
      }

      if (!result.ok) process.exit(1);
    });

  cmd
    .command("bundle")
    .description("Generar bundle de depuración para una sesión")
    .argument("<sessionId>", "ID de la sesión")
    .option("-o, --output <path>", "Ruta de salida del bundle")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (sessionId: string, options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");

      if (globalExamples) {
        console.log(printExamples(LOGS_META));
        return;
      }

      if (globalPlan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Generar bundle para sesión: ${sessionId}`);
        console.log("  2. Guardar en bundle-writer");
        return;
      }

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: "text",
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: false,
        explain: globalExplain,
        plan: globalPlan,
        verify: false,
      };

      const result = await runCommand<LogsBundleResult>({
        action: "logs.bundle",
        meta: LOGS_META,
        flags,
        payloadPreview: { sessionId, outputPath: options.output },
        execute: async (): Promise<CliResult<LogsBundleResult>> => {
          const execution = await generateLogBundle(createCliLogBundleWriter(), {
            sessionId,
            outputPath: options.output,
          });

          if (!execution.ok) {
            return createErrorResult("logs.bundle", execution.error);
          }

          return createSuccessResult("logs.bundle", execution.data, {
            advice: execution.advice,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (!result.ok) process.exit(1);
    });

  cmd
    .command("ios [device]")
    .description("Buscar logs de operaciones IOS (config, exec, show) por dispositivo")
    .option("--device <name>", "Filtrar por nombre de dispositivo")
    .option("-n, --limit <num>", "Máximo de entradas", "20")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (deviceArg: string | undefined, options) => {
      const globalExamples = process.argv.includes("--examples");
      if (globalExamples) {
        console.log(printExamples(LOGS_META));
        return;
      }

      const device = options.device ?? deviceArg;
      const limit = parseInt(options.limit) || 20;

      const result = await listIosLogEntries({
        logsDir: getLogsDir(),
        device,
        limit,
      });

      if (!result.ok) {
        console.error(`Error: ${result.error.message}`);
        process.exit(1);
      }

      const entries = result.data.entries;

      console.log("");
      console.log(`═══ Operaciones IOS${device ? ` (dispositivo: ${device})` : ""} ═══`);
      console.log(`Entradas: ${entries.length}`);
      console.log("");

      for (const e of entries) {
        const ts = e.timestamp ? (e.timestamp.split("T")[1]?.split(".")[0] ?? "") : "";
        console.log(
          `  [${ts}] ${e.action.padEnd(25)} device: ${e.device ?? "n/a"}  session: ${e.sessionId.slice(0, 12)}`,
        );
      }
      console.log("");
    });

  return cmd;
}

function formatLocalTime(timestamp: string): string {
  try {
    return formatEcuadorTime(timestamp);
  } catch {
    return "";
  }
}