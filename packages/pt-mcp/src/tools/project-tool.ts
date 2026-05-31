import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";
import { ProjectOutputSchema } from "./output-schemas.js";

export function registerProjectTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_project",
    {
      title: "Packet Tracer Project Management",
      description: [
        "Manages the currently opened Packet Tracer .pkt project.",
        "Use op='status' to confirm the active file, save state, device count, and link count.",
        "Use checkpoint operations before risky configuration changes. Save/recover/open operations modify project state.",
        "status and checkpoints are read-only; save, autosave, open, and recover modify the project.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({ op: z.literal("status") }).describe("Estado del proyecto activo: archivo, dispositivos, enlaces, últimos cambios."),
        z.object({ op: z.literal("save") }).describe("Guarda el archivo .pkt activo en disco. Modifica el proyecto."),
        z.object({
          op: z.literal("autosave"),
          dir: z.string().optional().describe("Directorio donde guardar el autosave. Por defecto PT_DEV_DIR/checkpoints."),
          keep: z.number().int().positive().max(100).optional().describe("Número máximo de autosaves a conservar. Los más antiguos se eliminan."),
        }).describe("Crea un backup externo del .pkt activo sin sobrescribir el original."),
        z.object({
          op: z.literal("open"),
          path: z.string().min(1).describe("Ruta absoluta al archivo .pkt que se abrirá."),
          wait: z.boolean().default(false).describe("Esperar a que el runtime confirme la carga."),
          waitTimeoutMs: z.number().int().positive().max(300_000).optional().describe("Timeout de carga si wait=true."),
        }).describe("Abre un archivo .pkt en el runtime de Packet Tracer. Modifica el proyecto activo."),
        z.object({
          op: z.literal("recover"),
          projectPath: z.string().optional().describe("Ruta del proyecto a recuperar. Si se omite, intenta recuperar el último activo."),
        }).describe("Recupera el último autosave del proyecto. Modifica el estado del proyecto."),
        z.object({
          op: z.literal("checkpoints"),
          projectPath: z.string().optional().describe("Ruta del proyecto. Si se omite, usa el proyecto activo."),
        }).describe("Lista checkpoints/autosaves disponibles para un proyecto. Read-only."),
      ]),
      outputSchema: ProjectOutputSchema,
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
            ctx.control.deviceKindCache.clear();
            const result = await controller.project.open(input.path, {
              wait: input.wait,
              waitTimeoutMs: input.waitTimeoutMs,
            });
            return ok({ action: "project.open", path: input.path, result });
          }

          case "recover": {
            ctx.control.deviceKindCache.clear();
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
