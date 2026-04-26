#!/usr/bin/env bun
import { Command } from "commander";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { listRuntimeSnapshots, restoreRuntimeSnapshot } from "@cisco-auto/pt-runtime";

function getDevDir(): string {
  return process.env.PT_DEV_DIR ?? resolve(import.meta.dirname, "../../../../../../pt-dev");
}

function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function createRuntimeCommand(): Command {
  const runtime = new Command("runtime")
    .description("Administra main.js/runtime.js, logs y estado del bridge")
    .addHelpText(
      "after",
      `
Ejemplos:
  pt runtime status
  pt runtime logs
  pt runtime releases
  pt runtime rollback --last

Si algo falla:
  pt doctor
`,
    );

  runtime
    .command("status")
    .description("Muestra estado local del runtime")
    .option("--json", "Salida JSON")
    .action((options) => {
      const devDir = getDevDir();
      const data = {
        ok: existsSync(devDir),
        devDir,
        files: {
          mainJs: existsSync(join(devDir, "main.js")),
          runtimeJs: existsSync(join(devDir, "runtime.js")),
          commandJson: existsSync(join(devDir, "command.json")),
          resultJson: existsSync(join(devDir, "result.json")),
        },
        nextSteps: [
          "pt doctor",
          "pt runtime logs",
        ],
      };

      if (options.json) {
        printJson(data);
        return;
      }

      process.stdout.write("\nRuntime status\n");
      process.stdout.write(`  devDir: ${data.devDir}\n`);
      process.stdout.write(`  main.js: ${data.files.mainJs ? "ok" : "missing"}\n`);
      process.stdout.write(`  runtime.js: ${data.files.runtimeJs ? "ok" : "missing"}\n`);
      process.stdout.write(`  command.json: ${data.files.commandJson ? "ok" : "missing"}\n`);
      process.stdout.write(`  result.json: ${data.files.resultJson ? "ok" : "missing"}\n`);
      process.stdout.write("\n");
    });

  runtime
    .command("logs")
    .description("Muestra logs locales del runtime si existen")
    .option("--json", "Salida JSON")
    .action((options) => {
      const devDir = getDevDir();
      const logsDir = join(devDir, "logs");

      const files = existsSync(logsDir) ? readdirSync(logsDir).slice(-20) : [];
      const data = { ok: existsSync(logsDir), logsDir, files };

      if (options.json) {
        printJson(data);
        return;
      }

      process.stdout.write(`\nLogs: ${logsDir}\n`);
      for (const file of files) {
        process.stdout.write(`  ${file}\n`);
      }
      process.stdout.write("\n");
    });

  runtime
    .command("releases")
    .description("Lista snapshots locales del runtime")
    .action(() => {
      const snapshots = listRuntimeSnapshots(getDevDir());
      if (snapshots.length === 0) {
        process.stdout.write("No hay snapshots disponibles.\n");
        return;
      }
      for (const snapshot of snapshots) {
        process.stdout.write(`${snapshot}\n`);
      }
    });

  runtime
    .command("rollback")
    .description("Restaura artefactos del runtime desde un snapshot")
    .option("--last", "Restaurar el último snapshot", true)
    .option("--snapshot <name>", "Nombre específico del snapshot")
    .action((options) => {
      const restored = restoreRuntimeSnapshot(getDevDir(), options.snapshot);
      if (!restored) {
        process.stderr.write("No hay snapshot disponible para restaurar.\n");
        process.exitCode = 1;
        return;
      }
      process.stdout.write(`Restaurado: ${restored}\n`);
    });

  runtime
    .command("reload")
    .description("Instrucciones para recargar runtime en Packet Tracer")
    .action(() => {
      process.stdout.write("\nRecarga runtime:\n");
      process.stdout.write("  1. Ejecuta: bun run pt build\n");
      process.stdout.write("  2. En Packet Tracer, recarga el script main.js si aplica\n");
      process.stdout.write("  3. Valida: pt doctor\n\n");
    });

  return runtime;
}