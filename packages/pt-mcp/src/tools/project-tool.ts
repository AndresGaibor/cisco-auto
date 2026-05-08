import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";

export function registerProjectTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_project",
    {
      title: "Packet Tracer project management",
      description: [
        "Gestiona el proyecto/archivo .pkt abierto en Packet Tracer.",
        "Soporta status, save, autosave, open, recover y checkpoints.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({ op: z.literal("status") }).describe("Estado del proyecto activo."),
        z.object({ op: z.literal("save") }).describe("Guarda el archivo .pkt activo."),
        z.object({
          op: z.literal("autosave"),
          dir: z.string().optional().describe("Directorio de autosave."),
          keep: z.number().int().positive().max(100).optional().describe("Número de autosaves a conservar."),
        }).describe("Crea un backup externo del .pkt activo."),
        z.object({
          op: z.literal("open"),
          path: z.string().min(1).describe("Ruta al archivo .pkt"),
          wait: z.boolean().default(false),
          waitTimeoutMs: z.number().int().positive().max(300_000).optional(),
        }).describe("Abre un archivo .pkt en Packet Tracer."),
        z.object({
          op: z.literal("recover"),
          projectPath: z.string().optional(),
        }).describe("Recupera el último autosave de un proyecto."),
        z.object({
          op: z.literal("checkpoints"),
          projectPath: z.string().optional(),
        }).describe("Lista checkpoints/autosaves disponibles."),
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
          case "status": {
            const status = await controller.project.status();
            return ok({ action: "project.status", status });
          }

          case "save": {
            const result = await controller.project.save();
            return ok({ action: "project.save", result });
          }

          case "autosave": {
            const result = await controller.project.autosave({ dir: input.dir, keep: input.keep });
            return ok({ action: "project.autosave", result });
          }

          case "open": {
            const result = await controller.project.open(input.path, {
              wait: input.wait,
              waitTimeoutMs: input.waitTimeoutMs,
            });
            return ok({ action: "project.open", path: input.path, result });
          }

          case "recover": {
            const result = await controller.project.recover(input.projectPath);
            return ok({ action: "project.recover", projectPath: input.projectPath, result });
          }

          case "checkpoints": {
            const result = await controller.project.checkpoints(input.projectPath);
            return ok({ action: "project.checkpoints", projectPath: input.projectPath, checkpoints: result });
          }

          default:
            return { content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: `Operación no soportada: ${input.op}` }) }], isError: true };
        }
      } catch (error) {
        return errorToFail(error, "PT_PROJECT_FAILED", `Error en operación project.${input.op}`);
      }
    },
  );
}
