import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";
import { AppOutputSchema } from "./output-schemas.js";

export function registerAppTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_app",
    {
      title: "Packet Tracer Application Control",
      description: [
        "Controls or inspects the Packet Tracer desktop application.",
        "Use op='status' or op='paths' before opening projects or running IOS commands.",
        "Use op='open' only when you have an explicit .pkt path. Use op='close' carefully because it can close the active Packet Tracer session.",
        "op='restart' and op='close' modify the application state; paths, status, and wait are read-only.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({ op: z.literal("paths") }).describe("Lista rutas de instalación de Packet Tracer disponibles en el sistema."),
        z.object({ op: z.literal("status") }).describe("Estado del proceso y runtime de Packet Tracer."),
        z.object({
          op: z.literal("open"),
          path: z.string().min(1).describe("Ruta absoluta al archivo .pkt que se abrirá en Packet Tracer."),
          wait: z.boolean().default(false).describe("Si es true, espera a que el runtime esté listo antes de responder."),
          waitTimeoutMs: z.number().int().positive().max(300_000).optional().describe("Tiempo máximo de espera en milisegundos si wait=true."),
          closeExisting: z.boolean().default(false).describe("Cierra el proyecto activo antes de abrir el nuevo."),
          saveExisting: z.boolean().default(false).describe("Guarda el proyecto activo antes de cerrarlo."),
        }).describe("Abre un archivo .pkt en Packet Tracer. Modifica el estado de la aplicación."),
        z.object({
          op: z.literal("close"),
          save: z.boolean().default(false).describe("Guarda el proyecto activo antes de cerrar."),
          autosave: z.boolean().default(false).describe("Crea un autosave antes de cerrar."),
          force: z.boolean().default(false).describe("Fuerza el cierre incluso si hay cambios sin guardar."),
          timeoutMs: z.number().int().positive().max(120_000).optional().describe("Tiempo máximo de espera para el cierre."),
        }).describe("Cierra Packet Tracer. Modifica el estado de la aplicación — usar con cuidado."),
        z.object({
          op: z.literal("restart"),
          save: z.boolean().default(false).describe("Guarda antes de cerrar."),
          autosave: z.boolean().default(false).describe("Autosave antes de cerrar."),
          path: z.string().optional().describe("Ruta .pkt a abrir tras reiniciar. Si se omite, abre la app de PT sin proyecto."),
          wait: z.boolean().default(false).describe("Esperar a que el runtime esté disponible tras el reinicio."),
          waitTimeoutMs: z.number().int().positive().max(300_000).optional().describe("Timeout de espera si wait=true."),
        }).describe("Reinicia Packet Tracer (close + open). Modifica el estado de la aplicación."),
        z.object({
          op: z.literal("wait"),
          runtime: z.boolean().default(false).describe("Espera a que el runtime JS esté cargado."),
          activeFile: z.string().optional().describe("Espera a que un archivo .pkt específico esté activo."),
          timeoutMs: z.number().int().positive().max(300_000).optional().describe("Tiempo máximo de espera."),
        }).describe("Espera a que Packet Tracer alcance un estado deseado. Read-only."),
      ]),
      outputSchema: AppOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input: any) => {
      try {
        switch (input.op) {
          case "paths": {
            const paths = await controller.app.paths();
            return ok({ action: "app.paths", paths });
          }

          case "status": {
            const status = await controller.app.status();
            return ok({ action: "app.status", status });
          }

          case "open": {
            const result = await controller.app.open(input.path, {
              wait: input.wait,
              waitTimeoutMs: input.waitTimeoutMs,
              closeExisting: input.closeExisting,
              saveExisting: input.saveExisting,
            });
            return ok({ action: "app.open", path: input.path, result });
          }

          case "close": {
            const result = await controller.app.close({
              save: input.save,
              autosave: input.autosave,
              force: input.force,
              timeoutMs: input.timeoutMs,
            });
            return ok({ action: "app.close", result });
          }

          case "restart": {
            const closeResult = await controller.app.close({
              save: input.save,
              autosave: input.autosave,
              force: false,
            });
            if (!closeResult.ok) {
              return ok({ action: "app.restart", closeResult, openResult: null, error: "close_failed" });
            }
            const targetPath = input.path;
            if (!targetPath) {
              const pathsResult = await controller.app.paths();
              if (!pathsResult.selected) {
                return ok({ action: "app.restart", closeResult, openResult: null, error: "pt_not_found", paths: pathsResult });
              }
              const openResult = await controller.app.open(pathsResult.selected, {
                wait: input.wait,
                waitTimeoutMs: input.waitTimeoutMs ?? 60_000,
              });
              return ok({ action: "app.restart", closeResult, openResult, targetPath: pathsResult.selected });
            }
            const openResult = await controller.app.open(targetPath, {
              wait: input.wait,
              waitTimeoutMs: input.waitTimeoutMs ?? 60_000,
            });
            return ok({ action: "app.restart", closeResult, openResult, targetPath });
          }

          case "wait": {
            const result = await controller.app.wait({
              runtime: input.runtime,
              activeFile: input.activeFile,
              timeoutMs: input.timeoutMs,
            });
            return ok({ action: "app.wait", result });
          }

          default:
            return { content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: `Operación no soportada: ${input.op}` }) }], isError: true };
        }
      } catch (error) {
        return errorToFail(error, "PT_APP_FAILED", `Error en operación app.${input.op}`);
      }
    },
  );
}
