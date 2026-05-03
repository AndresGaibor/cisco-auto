#!/usr/bin/env bun
import { Command } from "commander";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FileBridgeV2 } from "@cisco-auto/file-bridge";
import { listRuntimeSnapshots, restoreRuntimeSnapshot } from "@cisco-auto/pt-runtime";
import { getDefaultDevDir } from "../../system/paths.js";

function getDevDir(): string {
  return process.env.PT_DEV_DIR ?? getDefaultDevDir();
}

function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

async function sendRuntimeControlCommand<T = unknown>(
  type: "__runtimeStatus" | "__reloadRuntime",
  payload: Record<string, unknown> = {},
  timeoutMs = 10_000,
): Promise<T> {
  const devDir = getDevDir();
  const bridge = new FileBridgeV2({
    root: devDir,
    role: "client",
    consumerId: "runtime-cli",
    enableBackpressure: false,
    resultTimeoutMs: timeoutMs,
  });

  bridge.start();
  try {
    return (await bridge.sendCommandAndWait(type, payload, timeoutMs)) as T;
  } finally {
    try {
      await bridge.stop();
    } catch {}
  }
}

function readLocalManifest(devDir: string): unknown {
  const manifestPath = join(devDir, "manifest.json");

  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    return {
      error: String(error instanceof Error ? error.message : error),
    };
  }
}

export function createRuntimeCommand(): Command {
  const runtime = new Command("runtime")
    .description("Administra main.js/runtime.js, logs y estado del bridge")
    .addHelpText(
      "after",
      `
Ejemplos:
  pt runtime status
  pt runtime status --live --json
  pt runtime logs
  pt runtime releases
  pt runtime rollback --last
  pt runtime reload --json

Si algo falla:
  pt doctor
`,
    );

  runtime
    .command("status")
    .description("Muestra estado del runtime")
    .option("--json", "Salida JSON")
    .option("--live", "Consulta Packet Tracer mediante el bridge")
    .action(async (options) => {
      const wantsJson = Boolean(options?.json || process.argv.includes("--json"));
      const wantsLive = Boolean(options?.live || process.argv.includes("--live"));
      const devDir = getDevDir();
      const local = {
        ok: existsSync(devDir),
        devDir,
        files: {
          mainJs: existsSync(join(devDir, "main.js")),
          runtimeJs: existsSync(join(devDir, "runtime.js")),
          catalogJs: existsSync(join(devDir, "catalog.js")),
          manifest: existsSync(join(devDir, "manifest.json")),
        },
        manifest: readLocalManifest(devDir),
      };

      let live: unknown = null;
      if (wantsLive) {
        try {
          live = await sendRuntimeControlCommand("__runtimeStatus", {}, 10_000);
        } catch (error) {
          live = {
            ok: false,
            error: {
              code: "RUNTIME_STATUS_FAILED",
              message: String(error instanceof Error ? error.message : error),
            },
          };
        }
      }

      const data = {
        schemaVersion: "1.0",
        ok: local.ok && (!wantsLive || (live as any)?.ok !== false),
        action: "runtime.status",
        local,
        live,
        nextSteps: [
          "pt doctor",
          "pt runtime logs",
          "pt runtime reload --json",
        ],
      };

      if (wantsJson) {
        printJson(data);
        process.exitCode = data.ok ? 0 : 1;
        return;
      }

      process.stdout.write("\nRuntime status\n");
      process.stdout.write(`  devDir: ${local.devDir}\n`);
      process.stdout.write(`  main.js: ${local.files.mainJs ? "ok" : "missing"}\n`);
      process.stdout.write(`  runtime.js: ${local.files.runtimeJs ? "ok" : "missing"}\n`);
      process.stdout.write(`  catalog.js: ${local.files.catalogJs ? "ok" : "missing"}\n`);
      process.stdout.write(`  manifest.json: ${local.files.manifest ? "ok" : "missing"}\n`);

      if (wantsLive) {
        const runtime = (live as any)?.runtime;
        process.stdout.write(`  live: ${(live as any)?.ok ? "ok" : "error"}\n`);
        process.stdout.write(`  runtimeLoaded: ${runtime?.runtimeLoaded ? "yes" : "no"}\n`);
        process.stdout.write(`  reloadCount: ${runtime?.reloadCount ?? "unknown"}\n`);
        process.stdout.write(`  pendingReload: ${runtime?.pendingReload ? "yes" : "no"}\n`);
      }

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
    .description("Solicita hot reload de runtime.js en Packet Tracer")
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const wantsJson = Boolean(options?.json || process.argv.includes("--json"));
      let result: any;

      try {
        result = await sendRuntimeControlCommand("__reloadRuntime", {
          reason: "pt-runtime-reload-cli",
          requestedAt: Date.now(),
        }, 15_000);
      } catch (error) {
        result = {
          ok: false,
          error: {
            code: "RUNTIME_RELOAD_FAILED",
            message: String(error instanceof Error ? error.message : error),
          },
        };
      }

      const data = {
        schemaVersion: "1.0",
        ok: !!result?.ok,
        action: "runtime.reload",
        result,
        nextSteps: result?.ok
          ? ["pt runtime status --live --json", "pt doctor"]
          : ["pt runtime logs", "pt runtime status --live --json", "Recarga main.js manualmente si el kernel no responde"],
      };

      if (wantsJson) {
        printJson(data);
        process.exitCode = data.ok ? 0 : 1;
        return;
      }

      if (data.ok) {
        process.stdout.write("\n✅ Runtime hot reload aplicado.\n");
        process.stdout.write(`  runtimeLoaded: ${result?.after?.runtimeLoaded ? "yes" : "unknown"}\n`);
        process.stdout.write(`  reloadCount: ${result?.after?.reloadCount ?? "unknown"}\n\n`);
      } else {
        process.stderr.write("\n✗ Runtime hot reload falló.\n");
        process.stderr.write(`  ${result?.error?.message ?? "unknown error"}\n\n`);
        process.exitCode = 1;
      }
    });

  return runtime;
}
