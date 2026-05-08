import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";

export function registerAppTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_app",
    {
      title: "Packet Tracer application control",
      description: [
        "Controla la aplicación Packet Tracer: rutas, estado, abrir, cerrar, reiniciar y esperar.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({ op: z.literal("paths") }).describe("Rutas de instalación de Packet Tracer."),
        z.object({ op: z.literal("status") }).describe("Estado del proceso de Packet Tracer."),
        z.object({
          op: z.literal("open"),
          path: z.string().min(1).describe("Ruta al archivo .pkt"),
          wait: z.boolean().default(false),
          waitTimeoutMs: z.number().int().positive().max(300_000).optional(),
          closeExisting: z.boolean().default(false),
          saveExisting: z.boolean().default(false),
        }).describe("Abrir un archivo .pkt en Packet Tracer."),
        z.object({
          op: z.literal("close"),
          save: z.boolean().default(false),
          autosave: z.boolean().default(false),
          force: z.boolean().default(false),
          timeoutMs: z.number().int().positive().max(120_000).optional(),
        }).describe("Cerrar Packet Tracer."),
        z.object({
          op: z.literal("restart"),
          save: z.boolean().default(false).describe("Guardar antes de cerrar."),
          autosave: z.boolean().default(false).describe("Autosave antes de cerrar."),
          path: z.string().optional().describe("Ruta a abrir tras reiniciar (defecto: app de PT)."),
          wait: z.boolean().default(false).describe("Esperar a que el runtime esté disponible."),
          waitTimeoutMs: z.number().int().positive().max(300_000).optional(),
        }).describe("Reinicia Packet Tracer (close + open)."),
        z.object({
          op: z.literal("wait"),
          runtime: z.boolean().default(false),
          activeFile: z.string().optional(),
          timeoutMs: z.number().int().positive().max(300_000).optional(),
        }).describe("Esperar a que Packet Tracer alcance un estado."),
      ]),
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
