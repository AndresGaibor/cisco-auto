#!/usr/bin/env bun
/**
 * Comando history - Historial de ejecuciones de comandos.
 *
 * CLI delgada:
 * - parsea flags
 * - renderiza
 * - delega lectura/análisis/clasificación a pt-control/application/history
 * - mantiene rerun porque re-ejecutar createProgram() es responsabilidad de la app CLI
 */

import { Command } from "commander";

import {
  explainHistory,
  formatHistoryDuration,
  getHistoryCommandIds,
  getHistoryDuration,
  getHistoryErrorMessage,
  getHistorySessionId,
  getHistoryStatus,
  getHistoryTargetDevice,
  getLastHistory,
  listHistory,
  prepareHistoryRerun,
  showHistory,
  type HistoryEntry,
  type HistoryExplainResult,
  type HistoryListResult,
  type HistoryRerunPlan,
  type HistoryShowResult,
} from "@cisco-auto/pt-control/application/history";

import type { CliResult } from "../contracts/cli-result.js";
import { createSuccessResult, createErrorResult } from "../contracts/cli-result.js";
import type { CommandMeta } from "../contracts/command-meta.js";
import type { GlobalFlags } from "../flags.js";

import { runCommand } from "../application/run-command.js";
import { renderCliResult } from "../ux/renderers.ts";
import { printExamples } from "../ux/examples.js";
import { renderHistoryBlock } from "../telemetry/render-history-block.js";
import { createCliHistoryRepository } from "../adapters/history-repository.js";
import { buildFlags } from "../flags-utils.js";

const HISTORY_EXAMPLES = [
  { command: "pt history list", description: "Listar últimas ejecuciones" },
  {
    command: "pt history list --limit 20 --failed",
    description: "Listar últimos 20 comandos fallidos",
  },
  { command: "pt history show abc123", description: "Ver detalle de una sesión" },
  { command: "pt history last", description: "Ver última ejecución" },
  { command: "pt history rerun abc123", description: "Re-ejecutar sesión anterior" },
  { command: "pt history explain abc123", description: "Explicar error de una sesión" },
];

const HISTORY_META: CommandMeta = {
  id: "history",
  summary: "Historial de ejecuciones de comandos",
  longDescription: "Lista y muestra detalles de ejecuciones anteriores de comandos de la CLI.",
  examples: HISTORY_EXAMPLES,
  related: ["logs", "results", "doctor"],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: false,
};

function colorFn(code: string, text: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

function bold(text: string): string {
  return colorFn("1", text);
}

function dim(text: string): string {
  return colorFn("2", text);
}

function red(text: string): string {
  return colorFn("31", text);
}

function green(text: string): string {
  return colorFn("32", text);
}

function cyan(text: string): string {
  return colorFn("36", text);
}

function makeFlags(overrides: Partial<GlobalFlags> = {}): GlobalFlags {
  const json = overrides.json ?? process.argv.includes("--json") ?? false;

  return buildFlags({
    json,
    output: json ? "json" : "text",
    verbose: process.argv.includes("--verbose"),
    quiet: process.argv.includes("--quiet"),
    trace: process.argv.includes("--trace"),
    examples: process.argv.includes("--examples"),
    explain: process.argv.includes("--explain"),
    plan: process.argv.includes("--plan"),
    verify: false,
    ...overrides,
  });
}

function printResultOrExit<T>(result: CliResult<T>, flags: GlobalFlags): void {
  const output = renderCliResult(result, flags.output);

  if (!flags.quiet || !result.ok) {
    console.log(output);
  }

  if (!result.ok) {
    process.exit(1);
  }
}

function renderEntryDetail(entry: HistoryEntry, causes?: string[]): void {
  const status = getHistoryStatus(entry);
  const errorMessage = getHistoryErrorMessage(entry);

  renderHistoryBlock(
    getHistorySessionId(entry),
    entry.action,
    status,
    entry.startedAt,
    entry.endedAt,
    getHistoryDuration(entry),
    getHistoryTargetDevice(entry),
    getHistoryCommandIds(entry),
    entry.completionReason,
    errorMessage,
    causes,
  );

  const ctx = entry.contextSummary;
  if (ctx) {
    console.log("  Contexto:");
    if (typeof ctx.bridgeReady === "boolean") {
      console.log(`    bridge: ${ctx.bridgeReady ? "ready" : "not ready"}`);
    }

    if (typeof ctx.topologyMaterialized === "boolean") {
      console.log(`    topology: ${ctx.topologyMaterialized ? "materialized" : "warming"}`);
    }

    if (typeof ctx.deviceCount === "number") {
      console.log(`    devices: ${ctx.deviceCount}`);
    }

    if (typeof ctx.linkCount === "number") {
      console.log(`    links: ${ctx.linkCount}`);
    }
  }

  if (entry.warnings && entry.warnings.length > 0) {
    console.log("  Warnings:");
    for (const warning of entry.warnings) {
      console.log(`    - ${warning}`);
    }
  }

  if (entry.interactionSummary) {
    const summary =
      typeof entry.interactionSummary === "object"
        ? (entry.interactionSummary as Record<string, unknown>).summary
        : entry.interactionSummary;

    if (summary) {
      console.log(`  Interacción: ${summary}`);
    }
  }

  console.log("  Comandos relacionados:");
  console.log(`    pt logs session ${getHistorySessionId(entry)}  - Timeline completo`);

  const commandIds = getHistoryCommandIds(entry);
  if (commandIds && commandIds.length > 0) {
    console.log(`    pt logs command ${commandIds[0]}    - Trace del comando`);
  }

  console.log("    pt results list         - Resultados");
  console.log("    pt doctor               - Diagnóstico");
  console.log("");
}

function renderHistoryList(result: CliResult<HistoryListResult>, flags: GlobalFlags): void {
  if (flags.json) {
    printResultOrExit(result, flags);
    return;
  }

  if (!result.ok || !result.data) {
    printResultOrExit(result, flags);
    return;
  }

  const output = renderCliResult(result, flags.output);
  if (!flags.quiet) {
    console.log(output);
  }

  console.log("\nÚltimas ejecuciones\n");
  console.log("  Sesión    Acción              Duración  Detalles");
  console.log("  " + "-".repeat(56));

  for (const row of result.data.rows) {
    console.log(row);
  }

  console.log(`\nTotal: ${result.data.count} entradas`);
}

function renderHistoryShow(result: CliResult<HistoryShowResult>, flags: GlobalFlags): void {
  if (flags.json) {
    printResultOrExit(result, flags);
    return;
  }

  if (!result.ok || !result.data) {
    printResultOrExit(result, flags);
    return;
  }

  const output = renderCliResult(result, flags.output);
  if (!flags.quiet) {
    console.log(output);
  }

  if (result.data.entry) {
    renderEntryDetail(result.data.entry, result.data.causes);
    return;
  }

  console.error("No se encontró la sesión solicitada.");

  if (result.data.availableSessions?.length) {
    console.error("\nSesiones disponibles:");
    result.data.availableSessions.slice(0, 20).forEach((sessionId) => {
      console.error(`  - ${sessionId}`);
    });
  }

  process.exit(1);
}

function renderHistoryExplain(result: CliResult<HistoryExplainResult>, flags: GlobalFlags): void {
  if (flags.json) {
    printResultOrExit(result, flags);
    return;
  }

  if (!result.ok || !result.data) {
    printResultOrExit(result, flags);
    return;
  }

  const output = renderCliResult(result, flags.output);
  if (!flags.quiet) {
    console.log(output);
  }

  const { sessionId, error, duration, causes } = result.data;

  console.log("");
  console.log(`  ${bold("Explicación de sesión")} ${dim(`(${sessionId.slice(0, 8)})`)}`);
  console.log("");

  if (error) {
    console.log(`  ${red("✗")}  Error: ${error}`);
  }

  if (typeof duration === "number") {
    console.log(`  ${dim("⏱")}  Duración: ${formatHistoryDuration(duration)}`);
  }

  if (causes.length > 0) {
    console.log("");
    console.log(`  ${bold("Causas probables:")}`);
    for (const cause of causes) {
      console.log(`    ${red("→")}  ${cause}`);
    }
  }

  console.log("");
}

function renderRerunPlan(plan: HistoryRerunPlan): void {
  console.log("");
  renderHistoryBlock(
    plan.sessionId,
    plan.entry.action,
    plan.status,
    plan.entry.startedAt,
    plan.entry.endedAt,
    plan.entry.durationMs,
    plan.targetDevice,
    getHistoryCommandIds(plan.entry),
    plan.entry.completionReason,
  );
}

export function createHistoryCommand(): Command {
  const cmd = new Command("history").description("Historial de ejecuciones de comandos");

  cmd
    .command("list")
    .description("Lista las últimas ejecuciones")
    .option("-n, --limit <num>", "Número de entradas a mostrar", "10")
    .option("--failed", "Mostrar solo ejecuciones fallidas", false)
    .option("-a, --action <prefix>", "Filtrar por prefijo de acción")
    .option("--json", "Salida JSON", false)
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const flags = makeFlags({ json: options.json === true });

      if (options.examples) {
        console.log(printExamples(HISTORY_META));
        return;
      }

      if (options.explain) {
        console.log(HISTORY_META.longDescription ?? HISTORY_META.summary);
        return;
      }

      if (options.plan) {
        console.log("Plan de ejecución:");
        console.log("  1. Leer entradas desde el repositorio de historial");
        console.log("  2. Filtrar por limit, failed, action");
        console.log("  3. Normalizar campos legacy");
        console.log("  4. Renderizar tabla o JSON");
        return;
      }

      const repository = createCliHistoryRepository();

      const result = await runCommand<HistoryListResult>({
        action: "history.list",
        meta: HISTORY_META,
        flags,
        payloadPreview: { limit: options.limit, failed: options.failed, action: options.action },
        execute: async (): Promise<CliResult<HistoryListResult>> => {
          const execution = await listHistory(repository, {
            limit: Number.parseInt(options.limit, 10) || 10,
            failedOnly: options.failed,
            actionPrefix: options.action,
          });

          if (!execution.ok) {
            return createErrorResult("history.list", execution.error);
          }

          return createSuccessResult("history.list", execution.data, {
            advice: execution.advice,
          });
        },
      });

      renderHistoryList(result, flags);
    });

  cmd
    .command("show")
    .description("Muestra detalle de una ejecución")
    .argument("<sessionId>", "ID de la sesión")
    .option("--json", "Salida en JSON", false)
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (sessionId: string, options) => {
      const flags = makeFlags({ json: options.json === true });

      if (options.examples) {
        console.log(printExamples(HISTORY_META));
        return;
      }

      if (options.explain) {
        console.log(HISTORY_META.longDescription ?? HISTORY_META.summary);
        return;
      }

      if (options.plan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Buscar sesión: ${sessionId}`);
        console.log("  2. Si no existe, listar sesiones disponibles");
        console.log("  3. Inferir causas probables si falló");
        console.log("  4. Mostrar detalle completo");
        return;
      }

      const repository = createCliHistoryRepository();

      const result = await runCommand<HistoryShowResult>({
        action: "history.show",
        meta: HISTORY_META,
        flags,
        payloadPreview: { sessionId },
        execute: async (): Promise<CliResult<HistoryShowResult>> => {
          const execution = await showHistory(repository, { sessionId });

          if (!execution.ok) {
            return createErrorResult("history.show", execution.error);
          }

          return createSuccessResult("history.show", execution.data);
        },
      });

      renderHistoryShow(result, flags);
    });

  cmd
    .command("last")
    .description("Muestra la última ejecución")
    .option("--json", "Salida en JSON", false)
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const flags = makeFlags({ json: options.json === true });

      if (options.examples) {
        console.log(printExamples(HISTORY_META));
        return;
      }

      if (options.explain || options.plan) {
        console.log("Plan de ejecución:");
        console.log("  1. Obtener última entrada del historial");
        console.log("  2. Inferir causas si aplica");
        console.log("  3. Mostrar detalle");
        return;
      }

      const repository = createCliHistoryRepository();

      const result = await runCommand<HistoryShowResult>({
        action: "history.last",
        meta: HISTORY_META,
        flags,
        payloadPreview: {},
        execute: async (): Promise<CliResult<HistoryShowResult>> => {
          const execution = await getLastHistory(repository);

          if (!execution.ok) {
            return createErrorResult("history.last", execution.error);
          }

          return createSuccessResult("history.last", execution.data);
        },
      });

      renderHistoryShow(result, flags);
    });

  cmd
    .command("rerun")
    .description("Re-ejecuta una sesión anterior si es rerunnable")
    .argument("<sessionId>", "ID de la sesión")
    .option("--force", "Forzar re-ejecución sin verificar si es rerunnable", false)
    .option("--dry-run", "Solo mostrar qué se re-ejecutaría", false)
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (sessionId: string, options) => {
      if (options.examples) {
        console.log(printExamples(HISTORY_META));
        return;
      }

      if (options.explain) {
        console.log("Re-ejecuta una sesión anterior preservando los argumentos originales.");
        console.log("Solo comandos de lectura idempotentes son rerunnables por defecto.");
        return;
      }

      if (options.plan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Leer sesión: ${sessionId}`);
        console.log("  2. Clasificar si es rerunnable");
        console.log("  3. Si es rerunnable o --force, re-ejecutar argv original");
        return;
      }

      const repository = createCliHistoryRepository();
      const execution = await prepareHistoryRerun(repository, {
        sessionId,
        force: options.force,
      });

      if (!execution.ok) {
        const reason = execution.error.details?.reason;
        console.error(`  ${red("✗")} ${execution.error.message}`);

        if (reason) {
          console.error(`    Razón: ${String(reason)}`);
        }

        if (execution.error.code === "HISTORY_RERUN_UNSAFE") {
          console.error("");
          console.error("  Usa --force para forzar la re-ejecución:");
          console.error(`    pt history rerun ${sessionId} --force`);
        }

        process.exit(1);
      }

      renderRerunPlan(execution.data);

      if (options.force && !execution.data.classification.rerunnable) {
        console.log(`  ${dim("⚠")} Forzando re-ejecución`);
        console.log(`    Razón: ${execution.data.classification.reason}`);
      }

      if (options.dryRun) {
        console.log(`  ${dim("─")} Dry run ${dim("─")}`);
        console.log(`  ${dim("Comando que se ejecutaría:")}`);
        console.log(`    ${cyan(execution.data.argv?.join(" ") ?? "")}`);
        console.log("");
        return;
      }

      console.log(`  ${green("▶")} Re-ejecutando...`);
      console.log(`    ${cyan(execution.data.argv?.join(" ") ?? "")}`);
      console.log("");

      const { createProgram } = await import("../program.js");

      try {
        const program = createProgram();
        program.parse(execution.data.argsToParse ?? [], { from: "user" });
      } catch (error) {
        console.error(`  ${red("✗")} Error durante re-ejecución:`);
        console.error(`    ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  cmd
    .command("explain")
    .description("Explica el error de una sesión fallida")
    .argument("<sessionId>", "ID de la sesión")
    .option("--json", "Salida JSON", false)
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (sessionId: string, options) => {
      const flags = makeFlags({ json: options.json === true });

      if (options.examples) {
        console.log(printExamples(HISTORY_META));
        return;
      }

      if (options.explain) {
        console.log("Analiza una sesión fallida y propone causas probables.");
        return;
      }

      if (options.plan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Buscar sesión: ${sessionId}`);
        console.log("  2. Validar que falló");
        console.log("  3. Analizar error, warnings, contexto y completionReason");
        console.log("  4. Proponer próximos pasos");
        return;
      }

      const repository = createCliHistoryRepository();

      const result = await runCommand<HistoryExplainResult>({
        action: "history.explain",
        meta: HISTORY_META,
        flags,
        payloadPreview: { sessionId },
        execute: async (): Promise<CliResult<HistoryExplainResult>> => {
          const execution = await explainHistory(repository, { sessionId });

          if (!execution.ok) {
            return createErrorResult("history.explain", execution.error);
          }

          return createSuccessResult("history.explain", execution.data, {
            advice: execution.advice,
          });
        },
      });

      renderHistoryExplain(result, flags);
    });

  return cmd;
}
