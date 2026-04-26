#!/usr/bin/env bun
/**
 * Comando results - Gestionar resultados de comandos en ~/pt-dev/
 *
 * CLI delgada:
 * - parsea flags
 * - pide confirmación
 * - renderiza
 * - delega lectura/parsing/limpieza a pt-control/application/results
 */

import { Command } from "commander";
import chalk from "chalk";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {
  cleanResults,
  formatBytes,
  inspectPendingResults,
  listFailedResults,
  listResults,
  planCleanResults,
  showResult,
  viewResult,
  type ResultsCleanResult,
  type ResultsFailedResult,
  type ResultsListResult,
  type ResultsPendingResult,
  type ResultsShowResult,
  type ResultsViewResult,
} from "@cisco-auto/pt-control/application/results";

import type { CliResult } from "../contracts/cli-result.js";
import { createSuccessResult, createErrorResult } from "../contracts/cli-result.js";
import type { CommandMeta } from "../contracts/command-meta.js";
import type { GlobalFlags } from "../flags.js";

import { runCommand } from "../application/run-command.js";
import { renderCliResult } from "../ux/renderers.ts";
import { printExamples } from "../ux/examples.js";
import { getDefaultDevDir } from "../system/paths.js";
import { buildFlags } from "../flags-utils.js";

const RESULTS_EXAMPLES = [
  { command: "pt results list", description: "Listar archivos de resultados" },
  { command: "pt results list -n 50 --json", description: "Listar últimos 50 en JSON" },
  { command: "pt results clean --keep 20", description: "Mantener solo últimos 20" },
  { command: "pt results view cmd_abc123.json", description: "Ver contenido de resultado" },
];

const RESULTS_META: CommandMeta = {
  id: "results",
  summary: "Gestionar resultados de comandos",
  longDescription:
    "Lista, limpia y visualiza archivos de resultado de comandos guardados en ~/pt-dev/results.",
  examples: RESULTS_EXAMPLES,
  related: ["history", "logs", "doctor"],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: false,
};

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
  const rendered = renderCliResult(result, flags.output);

  if (!flags.quiet || !result.ok) {
    console.log(rendered);
  }

  if (!result.ok) {
    process.exit(1);
  }
}

function renderResultsList(result: CliResult<ResultsListResult>, flags: GlobalFlags): void {
  if (flags.json) {
    printResultOrExit(result, flags);
    return;
  }

  if (!result.ok || !result.data) {
    printResultOrExit(result, flags);
    return;
  }

  console.log(`\n📁 Resultados en ${result.data.resultsDir} (${result.data.total} total):\n`);

  result.data.files.forEach((file, index) => {
    const date = file.mtimeIso.slice(0, 19).replace("T", " ");
    console.log(
      `${index + 1}. ${chalk.cyan(file.name)} ${chalk.gray(date)} ${chalk.yellow(formatBytes(file.size))}`,
    );
  });

  console.log("");
}

function renderShowResult(result: CliResult<ResultsShowResult>, flags: GlobalFlags): void {
  if (flags.json) {
    printResultOrExit(result, flags);
    return;
  }

  if (!result.ok || !result.data) {
    printResultOrExit(result, flags);
    return;
  }

  const envelope = result.data.envelope;
  const value =
    envelope.value && typeof envelope.value === "object"
      ? (envelope.value as Record<string, unknown>)
      : undefined;

  console.log("");
  console.log(`═══ Resultado: ${result.data.commandId} ═══`);
  console.log(`Archivo   : ${result.data.file}`);
  console.log(`Status    : ${String(envelope.status ?? "unknown")}`);
  console.log(`OK        : ${String(envelope.ok)}`);

  if (typeof envelope.startedAt === "number") {
    console.log(`Inicio    : ${new Date(envelope.startedAt).toISOString()}`);
  }

  if (typeof envelope.completedAt === "number") {
    console.log(`Fin       : ${new Date(envelope.completedAt).toISOString()}`);
  }

  if (typeof envelope.startedAt === "number" && typeof envelope.completedAt === "number") {
    console.log(`Duración  : ${envelope.completedAt - envelope.startedAt}ms`);
  }

  if (envelope.protocolVersion) {
    console.log(`Protocolo : v${String(envelope.protocolVersion)}`);
  }

  if (value) {
    if (value.error) console.log(`Error     : ${String(value.error)}`);
    if (value.code) console.log(`Código    : ${String(value.code)}`);
    if (value.device) console.log(`Dispositivo: ${String(value.device)}`);
    if (value.source) console.log(`Fuente    : ${String(value.source)}`);

    const session = value.session && typeof value.session === "object"
      ? (value.session as Record<string, unknown>)
      : undefined;

    if (session?.mode) console.log(`Modo IOS  : ${String(session.mode)}`);
    if (session?.prompt) console.log(`Prompt    : ${String(session.prompt)}`);
  }

  if (result.data.trace) {
    console.log("\nPT-Side Trace:");
    for (const [key, value] of Object.entries(result.data.trace)) {
      console.log(`  ${key}: ${JSON.stringify(value)}`);
    }
  }

  console.log("");
}

function renderFailedResults(result: CliResult<ResultsFailedResult>, flags: GlobalFlags): void {
  if (flags.json) {
    printResultOrExit(result, flags);
    return;
  }

  if (!result.ok || !result.data) {
    printResultOrExit(result, flags);
    return;
  }

  console.log("");
  console.log(`═══ Resultados fallidos (${result.data.count}) ═══`);
  console.log("");

  for (const failed of result.data.failed) {
    const date = failed.completedAtIso?.slice(0, 19) ?? "unknown";
    console.log(`  ✗ ${failed.name}  [${date}]`);
    if (failed.error) {
      console.log(`    → ${failed.error.slice(0, 100)}`);
    }
  }

  console.log("");
}

function renderPending(result: CliResult<ResultsPendingResult>, flags: GlobalFlags): void {
  if (flags.json) {
    printResultOrExit(result, flags);
    return;
  }

  if (!result.ok || !result.data) {
    printResultOrExit(result, flags);
    return;
  }

  console.log("");
  console.log("═══ Estado de cola ═══");
  console.log("");
  console.log(`  En cola (commands/)     : ${result.data.queueCount}`);
  console.log(`  En vuelo (in-flight/)   : ${result.data.inFlightCount}`);
  console.log(`  Deferred (journal)      : ${result.data.pendingDeferred}`);
  console.log(`  Dead-letter             : ${result.data.deadLetterCount}`);

  for (const warning of result.data.warnings) {
    console.log("");
    console.log(`  ⚠️  ${warning}`);
  }

  if (result.advice?.length) {
    console.log("");
    result.advice.forEach((item) => console.log(`  → ${item}`));
  }

  console.log("");
}

async function confirmDeletion(count: number, names: string[]): Promise<boolean> {
  console.log(`\n🗑️  Se eliminarán ${count} archivos:`);

  names.slice(0, 5).forEach((name) => console.log(`   - ${name}`));

  if (count > 5) {
    console.log(`   ... y ${count - 5} más`);
  }

  console.log("");

  const rl = createInterface({ input, output });

  try {
    const answer = await rl.question("¿Continuar? (s/n): ");
    const normalized = answer.trim().toLowerCase();
    return normalized === "s" || normalized === "si" || normalized === "sí" || normalized === "y";
  } finally {
    rl.close();
  }
}

export function createResultsCommand(): Command {
  const cmd = new Command("results").description("Gestionar resultados de comandos en ~/pt-dev/");

  cmd
    .command("list")
    .description("Listar archivos de resultados")
    .option("-n, --num <number>", "Número de resultados a mostrar", "20")
    .option("-j, --json", "Salida en formato JSON")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const flags = makeFlags({ json: options.json === true });

      if (options.examples) {
        console.log(printExamples(RESULTS_META));
        return;
      }

      if (options.explain) {
        console.log(RESULTS_META.longDescription ?? RESULTS_META.summary);
        return;
      }

      if (options.plan) {
        console.log("Plan de ejecución:");
        console.log("  1. Resolver directorio pt-dev desde configuración local");
        console.log("  2. Leer directorio results/");
        console.log("  3. Filtrar archivos cmd_*.json");
        console.log("  4. Ordenar por fecha descendente");
        console.log("  5. Mostrar lista");
        return;
      }

      const result = await runCommand<ResultsListResult>({
        action: "results.list",
        meta: RESULTS_META,
        flags,
        payloadPreview: { num: options.num, json: options.json },
        execute: async (): Promise<CliResult<ResultsListResult>> => {
          const execution = await listResults({
            devDir: getDefaultDevDir(),
            limit: Number.parseInt(options.num, 10) || 20,
          });

          if (!execution.ok) {
            return createErrorResult("results.list", execution.error);
          }

          return createSuccessResult("results.list", execution.data, {
            advice: execution.advice,
          });
        },
      });

      renderResultsList(result, flags);
    });

  cmd
    .command("clean")
    .description("Limpiar archivos de resultados antiguos")
    .option("-k, --keep <number>", "Cantidad de resultados a mantener", "50")
    .option("-d, --days <number>", "Mantener solo resultados de los últimos N días")
    .option("-f, --force", "No pedir confirmación")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const flags = makeFlags();

      if (options.examples) {
        console.log(printExamples(RESULTS_META));
        return;
      }

      if (options.explain) {
        console.log("Limpia archivos cmd_*.json antiguos del directorio results/.");
        return;
      }

      const keep = Number.parseInt(options.keep, 10) || 50;
      const days = options.days ? Number.parseInt(options.days, 10) : undefined;
      const devDir = getDefaultDevDir();

      const plan = await planCleanResults({ devDir, keep, days });

      if (!plan.ok) {
        const result = createErrorResult<ResultsCleanResult>("results.clean", plan.error);
        printResultOrExit(result, flags);
        return;
      }

      if (options.plan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Directorio: ${plan.data.resultsDir}`);
        console.log(`  2. Modo: ${plan.data.mode}`);
        console.log(`  3. Archivos totales: ${plan.data.total}`);
        console.log(`  4. Archivos a eliminar: ${plan.data.candidates.length}`);
        console.log(`  5. Archivos a mantener: ${plan.data.kept}`);
        return;
      }

      if (plan.data.candidates.length === 0) {
        const result = createSuccessResult<ResultsCleanResult>(
          "results.clean",
          {
            deleted: 0,
            kept: plan.data.total,
            attempted: 0,
            skipped: 0,
            resultsDir: plan.data.resultsDir,
          },
          { advice: ["No hay archivos para eliminar"] },
        );

        printResultOrExit(result, flags);
        return;
      }

      if (!options.force) {
        const confirmed = await confirmDeletion(
          plan.data.candidates.length,
          plan.data.candidates.map((candidate) => candidate.name),
        );

        if (!confirmed) {
          const result = createErrorResult<ResultsCleanResult>("results.clean", {
            code: "RESULTS_CLEAN_CANCELLED",
            message: "Operación cancelada por el usuario",
          });

          printResultOrExit(result, flags);
          return;
        }
      }

      const result = await runCommand<ResultsCleanResult>({
        action: "results.clean",
        meta: RESULTS_META,
        flags,
        payloadPreview: { keep, days, force: options.force },
        execute: async (): Promise<CliResult<ResultsCleanResult>> => {
          const execution = await cleanResults({ devDir, keep, days });

          if (!execution.ok) {
            return createErrorResult("results.clean", execution.error);
          }

          return createSuccessResult("results.clean", execution.data, {
            advice: execution.advice,
          });
        },
      });

      printResultOrExit(result, flags);
    });

  cmd
    .command("view <file>")
    .description("Ver contenido de un archivo de resultado")
    .option("-j, --json", "Mostrar como JSON formateado")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (file: string, options) => {
      const flags = makeFlags({ json: options.json === true });

      if (options.examples) {
        console.log(printExamples(RESULTS_META));
        return;
      }

      if (options.explain) {
        console.log("Lee un archivo específico dentro de results/ y muestra su contenido.");
        return;
      }

      if (options.plan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Validar nombre de archivo: ${file}`);
        console.log("  2. Leer archivo dentro de results/");
        console.log("  3. Parsear JSON si es posible");
        console.log("  4. Mostrar contenido");
        return;
      }

      const result = await runCommand<ResultsViewResult>({
        action: "results.view",
        meta: RESULTS_META,
        flags,
        payloadPreview: { file },
        execute: async (): Promise<CliResult<ResultsViewResult>> => {
          const execution = await viewResult({
            devDir: getDefaultDevDir(),
            file,
          });

          if (!execution.ok) {
            return createErrorResult("results.view", execution.error);
          }

          return createSuccessResult("results.view", execution.data);
        },
      });

      printResultOrExit(result, flags);
    });

  cmd
    .command("show <commandId>")
    .description("Ver envelope autoritativo de un resultado")
    .option("--json", "Salida JSON", false)
    .action(async (commandId: string, options) => {
      const flags = makeFlags({ json: options.json === true });

      const result = await runCommand<ResultsShowResult>({
        action: "results.show",
        meta: RESULTS_META,
        flags,
        payloadPreview: { commandId },
        execute: async (): Promise<CliResult<ResultsShowResult>> => {
          const execution = await showResult({
            devDir: getDefaultDevDir(),
            commandId,
          });

          if (!execution.ok) {
            return createErrorResult("results.show", execution.error);
          }

          return createSuccessResult("results.show", execution.data);
        },
      });

      renderShowResult(result, flags);
    });

  cmd
    .command("failed")
    .description("Listar resultados fallidos")
    .option("-n, --limit <num>", "Máximo a mostrar", "20")
    .option("--json", "Salida JSON", false)
    .action(async (options) => {
      const flags = makeFlags({ json: options.json === true });

      const result = await runCommand<ResultsFailedResult>({
        action: "results.failed",
        meta: RESULTS_META,
        flags,
        payloadPreview: { limit: options.limit },
        execute: async (): Promise<CliResult<ResultsFailedResult>> => {
          const execution = await listFailedResults({
            devDir: getDefaultDevDir(),
            limit: Number.parseInt(options.limit, 10) || 20,
          });

          if (!execution.ok) {
            return createErrorResult("results.failed", execution.error);
          }

          return createSuccessResult("results.failed", execution.data);
        },
      });

      renderFailedResults(result, flags);
    });

  cmd
    .command("pending")
    .description("Ver estado de cola y comandos en proceso")
    .option("--json", "Salida JSON", false)
    .action(async (options) => {
      const flags = makeFlags({ json: options.json === true });

      const result = await runCommand<ResultsPendingResult>({
        action: "results.pending",
        meta: RESULTS_META,
        flags,
        payloadPreview: {},
        execute: async (): Promise<CliResult<ResultsPendingResult>> => {
          const execution = await inspectPendingResults({
            devDir: getDefaultDevDir(),
          });

          if (!execution.ok) {
            return createErrorResult("results.pending", execution.error);
          }

          return createSuccessResult("results.pending", execution.data, {
            advice: execution.advice,
          });
        },
      });

      renderPending(result, flags);
    });

  return cmd;
}
