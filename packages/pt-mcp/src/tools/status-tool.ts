import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";

export function registerStatusTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_status",
    {
      title: "Packet Tracer status and diagnostics",
      description: [
        "Diagnóstico completo del entorno Packet Tracer: health summary, runtime, bridge y doctor.",
        "No modifica el laboratorio; solo inspecciona el estado del sistema.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({ op: z.literal("summary") }).describe("Resumen de salud del sistema."),
        z.object({ op: z.literal("doctor") }).describe("Diagnóstico completo del entorno."),
        z.object({ op: z.literal("runtime") }).describe("Estado del runtime de Packet Tracer."),
        z.object({ op: z.literal("bridge") }).describe("Estado del bridge de comunicación."),
      ]),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input: any) => {
      try {
        switch (input.op) {
          case "summary": {
            const health = await controller.getHealthSummary();
            const heartbeat = controller.getHeartbeatHealth();
            const bridge = controller.getBridgeStatus();
            const context = controller.getSystemContext();
            return ok({ action: "status.summary", health, heartbeat, bridge, context });
          }

          case "doctor": {
            const health = await controller.getHealthSummary();
            const heartbeat = controller.getHeartbeatHealth();
            const bridge = controller.getBridgeStatus();
            return ok({ action: "status.doctor", health, heartbeat, bridge, healthy: health.bridgeReady && heartbeat.state === "ok" });
          }

          case "runtime": {
            const health = await controller.getHealthSummary();
            const heartbeat = controller.getHeartbeatHealth();
            return ok({ action: "status.runtime", health, heartbeat });
          }

          case "bridge": {
            const bridge = controller.getBridgeStatus();
            const heartbeat = controller.getHeartbeatHealth();
            return ok({ action: "status.bridge", bridge, heartbeat });
          }

          default:
            return { content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: `Operación no soportada: ${input.op}` }) }], isError: true };
        }
      } catch (error) {
        return errorToFail(error, "PT_STATUS_FAILED", `Error en operación status.${input.op}`);
      }
    },
  );
}
