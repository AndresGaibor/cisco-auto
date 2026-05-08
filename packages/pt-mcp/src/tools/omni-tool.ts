import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";

export function registerOmniTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_omni",
    {
      title: "Packet Tracer Omni experimental",
      description: [
        "Acceso experimental/profundo al runtime de Packet Tracer.",
        "Usar pt_cmd_run para comandos IOS normales.",
        "pt_omni es para casos que requieren acceso directo al runtime.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({ op: z.literal("status") }).describe("Estado de capacidades Omni."),
        z.object({ op: z.literal("capability") }).describe("Lista capacidades disponibles."),
        z.object({
          op: z.literal("raw"),
          code: z.string().min(1).max(50_000).describe("Código a ejecutar en el runtime."),
          timeoutMs: z.number().int().positive().max(120_000).optional(),
        }).describe("Ejecuta código directamente en el runtime (experimental)."),
        z.object({
          op: z.literal("result_status"),
          resultId: z.string().min(1),
        }).describe("Estado de un resultado previo."),
        z.object({
          op: z.literal("read_result"),
          resultId: z.string().min(1),
          stream: z.enum(["stdout", "stderr"]).default("stdout"),
          offset: z.number().int().nonnegative().default(0),
          limit: z.number().int().positive().max(32_000).default(6_000),
        }).describe("Lee salida de un resultado previo."),
        z.object({
          op: z.literal("clear"),
          target: z.enum(["all", "expired"]).default("expired"),
        }).describe("Limpia resultados en caché."),
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
            return ok({ action: "omni.status", available: true });
          }

          case "capability": {
            const caps: string[] = [];
            try {
              const omni = (controller as any).omniscience;
              if (omni?.runCapability) caps.push("run_capability");
              if (omni?.evaluate) caps.push("evaluate");
            } catch {}
            return ok({ action: "omni.capability", capabilities: caps });
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
            return ok({ action: "omni.raw", result });
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
