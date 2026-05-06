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

export function createProjectCommand(): Command {
  const project = new Command("project")
    .description("Gestiona archivo .pkt activo, guardado, autosaves y recuperación");

  project.command("status")
    .description("Muestra metadata del proyecto abierto en Packet Tracer")
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const result = await withController(async (controller) => {
        return await controller.project.status();
      });
      if (wantsJson(options)) return printJson(result);
      process.stdout.write(`Archivo activo: ${result.activeFile || "(sin guardar)"}\n`);
      process.stdout.write(`Guardado en disco: ${result.isSavedToDisk ? "sí" : "no"}\n`);
      process.stdout.write(`Archivo de actividad: ${result.isActivityFile ? "sí" : "no"}\n`);
      if (result.defaultSaveLocation) process.stdout.write(`Ubicación por defecto: ${result.defaultSaveLocation}\n`);
      if (result.deviceCount !== null) process.stdout.write(`Dispositivos: ${result.deviceCount}\n`);
      if (result.linkCount !== null) process.stdout.write(`Enlaces: ${result.linkCount}\n`);
    });

  project.command("save")
    .description("Guarda el archivo .pkt activo con fileSave()")
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const result = await withController(async (controller) => {
        return await controller.project.save();
      });
      if (wantsJson(options)) return printJson(result);
      process.stdout.write(result.saved ? "Proyecto guardado\n" : "No se pudo guardar el proyecto\n");
      process.exitCode = result.saved ? 0 : 1;
    });

  project.command("autosave")
    .description("Crea un autosave externo usando fileSaveToBytes()")
    .option("--dir <path>", "Directorio de autosaves")
    .option("--keep <count>", "Cantidad de autosaves a conservar", (value) => Number(value), 20)
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const result = await withController(async (controller) => {
        return await controller.project.autosave({ dir: options.dir, keep: options.keep });
      });
      if (wantsJson(options)) return printJson(result);
      process.stdout.write(`Autosave: ${result.autosavePath}\n`);
      process.stdout.write(`Bytes: ${result.bytes}, SHA256: ${result.sha256.slice(0, 16)}...\n`);
    });

  project.command("open")
    .description("Abre un archivo .pkt en Packet Tracer")
    .argument("<path>", "Ruta al archivo .pkt")
    .option("--wait", "Esperar a que PT esté listo")
    .option("--wait-timeout <ms>", "Timeout de espera", (value) => Number(value), 30000)
    .option("--json", "Salida JSON")
    .action(async (path, options) => {
      const result = await withController(async (controller) => {
        return await controller.project.open(path, { wait: options.wait, waitTimeoutMs: options.waitTimeout });
      });
      if (wantsJson(options)) return printJson(result);
      if (!result.ok) {
        process.stdout.write(`Error: ${result.error}\n`);
        process.exitCode = 1;
        return;
      }
      process.stdout.write(`Proyecto abierto: ${result.activeFile}\n`);
    });

  project.command("recover")
    .description("Recupera el proyecto desde el último autosave")
    .option("--project-path <path>", "Ruta del proyecto original (para filtrar autosaves)")
    .option("--json", "Salida JSON")
    .action(async (options) => {
      const result = await withController(async (controller) => {
        return await controller.project.recover(options.projectPath);
      });
      if (wantsJson(options)) return printJson(result);
      if (!result.ok) {
        process.stdout.write(`Error: ${result.error}\n`);
        process.exitCode = 1;
        return;
      }
      process.stdout.write(`Recuperado desde: ${result.recoveredFrom}\n`);
      process.stdout.write(`Archivo activo: ${result.activeFile}\n`);
    });

  project.command("checkpoints")
    .description("Lista los checkpoints/autosaves disponibles para el proyecto")
    .argument("[path]", "Ruta del proyecto (opcional)")
    .option("--json", "Salida JSON")
    .action(async (path, options) => {
      const result = await withController(async (controller) => {
        return await controller.project.checkpoints(path);
      });
      if (wantsJson(options)) return printJson(result);
      if (result.length === 0) {
        process.stdout.write("No hay checkpoints disponibles\n");
        return;
      }
      process.stdout.write(`Checkpoints: ${result.length}\n`);
      for (const cp of result) {
        process.stdout.write(`  ${cp.createdAt}  ${cp.autosavePath}\n`);
        process.stdout.write(`    Bytes: ${cp.bytes}  SHA256: ${cp.sha256.slice(0, 16)}...\n`);
      }
    });

  return project;
}