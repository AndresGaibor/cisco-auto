#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { FileBridgeV2 } from "@cisco-auto/file-bridge";
import { getDefaultDevDir } from "../system/paths.js";

function getDevDir(): string {
  return process.env.PT_DEV_DIR ?? getDefaultDevDir();
}

interface AutosaveResult {
  ok: boolean;
  saved: boolean;
  error?: string;
}

async function sendSaveProject(timeoutMs = 15_000): Promise<AutosaveResult> {
  const devDir = getDevDir();
  const bridge = new FileBridgeV2({
    root: devDir,
    role: "client",
    consumerId: "autosave-cli",
    enableBackpressure: false,
    resultTimeoutMs: timeoutMs,
  });

  bridge.start();
  try {
    const envelope: any = await bridge.sendCommandAndWait("saveProject", {}, timeoutMs);
    return {
      ok: envelope.value?.ok === true,
      saved: envelope.value?.saved === true,
      error: envelope.value?.error?.message || envelope.error?.message,
    };
  } finally {
    try {
      await bridge.stop();
    } catch {}
  }
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp(): string {
  return new Date().toLocaleTimeString("es-EC", { hour12: false });
}

export function createAutosaveCommand(): Command {
  return new Command("autosave")
    .description("Guarda el archivo .pkt actual cada N minutos (por defecto cada 5)")
    .option("--once", "Solo un guardado, sin bucle", false)
    .option("-i, --interval <minutes>", "Intervalo en minutos entre guardados", "5")
    .option("--json", "Salida JSON")
    .action(async (options: { once?: boolean; interval?: string; json?: boolean }) => {
      const wantsJson = Boolean(options?.json || process.argv.includes("--json"));
      const intervalMin = Math.max(1, parseInt(options?.interval ?? "5", 10) || 5);
      const intervalMs = intervalMin * 60 * 1000;
      const oneShot = options?.once === true;

      let savedCount = 0;
      let failedCount = 0;
      let running = true;

      process.on("SIGINT", () => {
        running = false;
      });

      if (!wantsJson && !oneShot) {
        const plural = intervalMin === 1 ? "minuto" : "minutos";
        process.stdout.write(
          chalk.cyan(`\n⏺ Autosave cada ${intervalMin} ${plural}. Ctrl+C para detener.\n\n`),
        );
      }

      while (running) {
        let result: AutosaveResult;
        try {
          result = await sendSaveProject(15_000);
        } catch (error) {
          result = {
            ok: false,
            saved: false,
            error: String(error instanceof Error ? error.message : error),
          };
        }

        if (result.saved) savedCount++;
        else failedCount++;

        if (wantsJson) {
          const entry = {
            ts: new Date().toISOString(),
            ok: result.ok && result.saved,
            saved: result.saved,
            error: result.ok ? undefined : {
              code: "AUTOSAVE_FAILED",
              message: result.error || "No se pudo guardar el proyecto",
            },
            stats: { savedCount, failedCount },
          };
          process.stdout.write(`${JSON.stringify(entry)}\n`);
        } else {
          const mark = result.saved ? chalk.green("✓") : chalk.red("✖");
          const msg = result.saved
            ? "Guardado"
            : `Error: ${result.error || "desconocido"}`;
          process.stdout.write(`  [${timestamp()}] ${mark} ${msg}\n`);
        }

        if (oneShot) break;

        if (running) {
          await sleepMs(intervalMs);
        }
      }

      if (!oneShot && !wantsJson && !running) {
        const total = savedCount + failedCount;
        process.stdout.write(
          chalk.dim(`\n  Detenido. ${savedCount}/${total} guardados correctamente.\n\n`),
        );
      }
    });
}
