#!/usr/bin/env bun
import { Command } from "commander";
import { createDefaultPTController } from "../../application/controller-provider.js";

function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function wantsJson(options: { json?: boolean } | undefined): boolean {
  return Boolean(options?.json || process.argv.includes("--json"));
}

async function withController<T>(run: (controller: Awaited<ReturnType<typeof createDefaultPTController>>) => Promise<T>): Promise<T> {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    return await run(controller);
  } finally {
    await controller.stop();
  }
}

export function createAppCommand(): Command {
  const app = new Command("app")
    .description("Gestiona la aplicación Packet Tracer: abrir, cerrar, esperar y consultar estado");

  app.command("paths")
    .description("Muestra los paths resueltos de Packet Tracer")
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const result = await withController(async (controller) => {
        return await controller.app.paths();
      });
      if (wantsJson(options)) return printJson(result);
      process.stdout.write(`Plataforma: ${result.platform}\n`);
      process.stdout.write(`Origen: ${result.source}\n`);
      process.stdout.write(`Seleccionado: ${result.selected ?? "(ninguno)"}\n`);
      process.stdout.write(`Candidatos:\n`);
      for (const c of result.candidates) {
        process.stdout.write(`  - ${c}\n`);
      }
    });

  app.command("status")
    .description("Muestra el estado completo de Packet Tracer: proceso, runtime y proyecto")
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const result = await withController(async (controller) => {
        return await controller.app.status();
      });
      if (wantsJson(options)) return printJson(result);
      process.stdout.write(`Proceso: ${result.process.level}\n`);
      if (result.process.pid) process.stdout.write(`PID: ${result.process.pid}\n`);
      process.stdout.write(`Runtime: ${result.runtime.loaded ? "cargado" : "no cargado"}\n`);
      process.stdout.write(`Proyecto activo: ${result.project.hasActiveFile ? result.project.activeFile : "(ninguno)"}\n`);
    });

  app.command("open")
    .description("Abre un archivo .pkt con Packet Tracer")
    .argument("<path>", "Ruta al archivo .pkt a abrir")
    .option("--wait", "Esperar a que el runtime esté disponible", false)
    .option("--timeout <ms>", "Timeout en ms para esperar", (value) => Number(value), 60000)
    .option("--close-existing", "Cerrar instancia existente antes de abrir", false)
    .option("--save-existing", "Guardar proyecto existente antes de cerrar", false)
    .option("--autosave-existing", "Crear autosave del proyecto existente", false)
    .option("--no-runtime-wait", "No esperar a que el runtime esté listo", false)
    .option("--json", "Salida JSON")
    .action(async (path, options) => {
      const result = await withController(async (controller) => {
        return await controller.app.open(path, {
          wait: options.wait,
          waitTimeoutMs: options.timeout,
          closeExisting: options.closeExisting,
          saveExisting: options.saveExisting,
          autosaveExisting: options.autosaveExisting,
          force: options.noRuntimeWait,
        });
      });
      if (wantsJson(options)) return printJson(result);
      if (result.ok) {
        process.stdout.write(`Packet Tracer abierto con ${path}\n`);
      } else {
        process.stdout.write(`Error: ${result.error}\n`);
        process.exitCode = 1;
      }
    });

  app.command("close")
    .description("Cierra Packet Tracer de forma graceful o force")
    .option("--save", "Guardar proyecto antes de cerrar", false)
    .option("--autosave", "Crear autosave antes de cerrar", false)
    .option("--force", "Forzar cierre con kill -9", false)
    .option("--timeout <ms>", "Timeout para esperar cierre graceful", (value) => Number(value), 30000)
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const result = await withController(async (controller) => {
        return await controller.app.close({
          save: options.save,
          autosave: options.autosave,
          force: options.force,
          timeoutMs: options.timeout,
        });
      });
      if (wantsJson(options)) return printJson(result);
      if (result.ok) {
        process.stdout.write("Packet Tracer cerrado\n");
      } else {
        process.stdout.write(`Error: ${result.error}\n`);
        process.exitCode = 1;
      }
    });

  app.command("wait")
    .description("Espera a que el runtime esté listo o un archivo特定 esté activo")
    .option("--runtime", "Esperar a que el runtime esté disponible", false)
    .option("--active-file <path>", "Esperar a que un archivo específico esté activo")
    .option("--timeout <ms>", "Timeout en ms", (value) => Number(value), 60000)
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const result = await withController(async (controller) => {
        return await controller.app.wait({
          runtime: options.runtime,
          activeFile: options.activeFile,
          timeoutMs: options.timeout,
        });
      });
      if (wantsJson(options)) return printJson(result);
      if (result.ok) {
        process.stdout.write("Condición alcanzada\n");
      } else {
        process.stdout.write(`Timeout: ${result.error}\n`);
        process.exitCode = 1;
      }
    });

  app.command("restart")
    .description("Reinicia Packet Tracer guardando y reabriendo el último archivo")
    .option("--save", "Guardar antes de cerrar", false)
    .option("--autosave", "Crear autosave antes de cerrar", false)
    .option("--open-last", "Reabrir el último archivo activo", false)
    .option("--wait", "Esperar a que el runtime esté disponible", false)
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const result = await withController(async (controller) => {
        const closeResult = await controller.app.close({
          save: options.save,
          autosave: options.autosave,
          force: false,
        });
        if (!closeResult.ok) return closeResult;
        const pathsResult = await controller.app.paths();
        if (!pathsResult.selected) return { ok: false, error: "Packet Tracer no encontrado" };
        const openResult = await controller.app.open(pathsResult.selected, {
          wait: options.wait,
          waitTimeoutMs: 60000,
        });
        return openResult;
      });
      if (wantsJson(options)) return printJson(result);
      if (result.ok) {
        process.stdout.write("Packet Tracer reiniciado\n");
      } else {
        process.stdout.write(`Error: ${result.error}\n`);
        process.exitCode = 1;
      }
    });

  return app;
}