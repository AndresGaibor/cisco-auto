import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { errorToFail, instructivo } from "./mcp-response.js";
import { OmniOutputSchema } from "./output-schemas.js";

export function registerOmniTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_omni",
    {
      title: "PT Omni — Experimental Runtime Access",
      description: [
        "Experimental low-level Packet Tracer runtime access for diagnostics and recovery.",
        "Use this only when pt_status, pt_project, pt_device, pt_link, and pt_cmd_run are insufficient.",
        "This tool may expose raw runtime internals and should not be used for normal IOS command execution.",
        "Prefer pt_cmd_run for all normal IOS operations. pt_omni is for advanced diagnostics only.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({ op: z.literal("status") }).describe("Estado de capacidades Omni del runtime."),
        z.object({ op: z.literal("capability") }).describe("Lista capacidades disponibles en el runtime Omni."),
        z.object({
          op: z.literal("raw"),
          code: z.string().min(1).max(50_000).describe("Código JavaScript a ejecutar directamente en el runtime de Packet Tracer. Solo para diagnóstico avanzado."),
          timeoutMs: z.number().int().positive().max(120_000).optional().describe("Timeout de ejecución en milisegundos."),
        }).describe("Ejecuta código directamente en el runtime de Packet Tracer. Experimental — puede afectar la estabilidad del entorno."),
        z.object({
          op: z.literal("result_status"),
          resultId: z.string().min(1).describe("ID del resultado previo a consultar."),
        }).describe("Estado de un resultado de operación Omni previa."),
        z.object({
          op: z.literal("read_result"),
          resultId: z.string().min(1).describe("ID del resultado a leer."),
          stream: z.enum(["stdout", "stderr"]).default("stdout").describe("Stream a leer: stdout (salida estándar) o stderr (errores)."),
          offset: z.number().int().nonnegative().default(0).describe("Línea de inicio (0-indexed) para lectura parcial."),
          limit: z.number().int().positive().max(32_000).default(6_000).describe("Número máximo de líneas a retornar."),
        }).describe("Lee la salida de un resultado de operación Omni previo."),
        z.object({
          op: z.literal("clear"),
          target: z.enum(["all", "expired"]).default("expired").describe("all: limpia todos los resultados cacheados. expired: solo los expirados."),
        }).describe("Limpia resultados en caché de operaciones Omni."),
      ]),
      outputSchema: OmniOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input: any) => {
      try {
        switch (input.op) {
          case "status": {
            return instructivo("pt_omni", { action: "omni.status", available: true });
          }

          case "capability": {
            const caps: string[] = [];
            try {
              const omni = (controller as any).omniscience;
              if (omni?.runCapability) caps.push("run_capability");
              if (omni?.evaluate) caps.push("evaluate");
            } catch {}
            return instructivo("pt_omni", { action: "omni.capability", capabilities: caps });
          }

          case "raw": {
            const omni = (controller as any).omniscience;
            if (!omni?.evaluate) {
              return {
                content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: "Omni evaluate no disponible" }) }],
                isError: true,
              };
            }
            const result = await omni.evaluate(input.code);
            return instructivo("pt_omni", { action: "omni.raw", result });
          }

          default:
            return {
              content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: `Operación no soportada: ${input.op}` }) }],
              isError: true,
            };
        }
      } catch (error) {
        return errorToFail(error, "PT_OMNI_FAILED", `Error en operación omni.${input.op}`);
      }
    },
  );
}
