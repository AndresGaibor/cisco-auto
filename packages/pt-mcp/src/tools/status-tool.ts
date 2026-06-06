import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail, instructivo } from "./mcp-response.js";
import { StatusOutputSchema } from "./output-schemas.js";
import { buildReconciledStatusFromParts } from "./status-reconciler.js";
import { globalCmdQueue } from "../queue/cmd-queue.js";

async function safeProjectStatus(controller: any): Promise<any> {
  try {
    if (typeof controller?.project?.status !== "function") {
      return {
        ok: false,
        error: "controller.project.status is not available",
      };
    }

    return await controller.project.status();
  } catch (error) {
    return {
      ok: false,
      error: String((error as Error)?.message ?? error),
    };
  }
}

async function safeDeviceInventory(controller: any): Promise<any> {
  try {
    if (typeof controller?.listDevices !== "function") {
      return {
        ok: false,
        count: 0,
        devices: [],
        error: "controller.listDevices is not available",
      };
    }

    const devices = await controller.listDevices(undefined, {
      includePorts: false,
      includeLinks: false,
      deep: false,
    });

    return {
      ok: true,
      devices,
      count: Array.isArray(devices) ? devices.length : 0,
    };
  } catch (error) {
    return {
      ok: false,
      count: 0,
      devices: [],
      error: String((error as Error)?.message ?? error),
    };
  }
}

export function registerStatusTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_status",
    {
      title: "Packet Tracer Status & Diagnostics",
      description: [
        "Use this tool as the first step when diagnosing Packet Tracer or MCP availability.",
        "Reports Packet Tracer runtime health, bridge heartbeat, lease state, project readiness, topology usability, queue status, and actionable warnings.",
        "This tool is read-only and safe to call repeatedly before using device, project, link, or command tools.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({ op: z.literal("summary") }).describe("Resumen reconciliado de salud del sistema: health, heartbeat, bridge, proyecto, inventario, cola y acciones sugeridas."),
        z.object({ op: z.literal("doctor") }).describe("Diagnóstico completo del entorno: valida que bridge, runtime y proyecto estén operativos."),
        z.object({ op: z.literal("runtime") }).describe("Estado del runtime de Packet Tracer: kernel cargado y heartbeat."),
        z.object({ op: z.literal("bridge") }).describe("Estado del bridge de comunicación por filesystem."),
      ]),
      outputSchema: StatusOutputSchema,
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

            const projectStatus = await safeProjectStatus(controller);
            const deviceInventory = await safeDeviceInventory(controller);
            const queue = globalCmdQueue.snapshot();

            const reconciled = buildReconciledStatusFromParts({
              health,
              heartbeat,
              bridge,
              context,
              projectStatus,
              deviceInventory,
              queue,
            });

            const commandReady = reconciled.reconciled?.commandReady;
            const deviceCount = reconciled.reconciled?.inventoryDeviceCount ?? 0;
            const warnings = Array.isArray(reconciled.warnings) ? reconciled.warnings : [];
            const warningCount = warnings.length;

            return instructivo("pt_status op=summary", {
              action: "status.summary",
              health: reconciled.health,
              heartbeat,
              bridge,
              context: reconciled.context,
              reconciled: reconciled.reconciled,
              warnings: reconciled.warnings,
              nextActions: reconciled.nextActions,
            }, {
              resumen: commandReady
                ? `Sistema listo. ${deviceCount} dispositivo(s) en inventario.${warningCount > 0 ? ` ${warningCount} advertencia(s).` : ""}`
                : `Sistema no listo. ${warningCount} problema(s) detectado(s) — revisa las advertencias.`,
              paso: commandReady
                ? `Usa \`pt_device op=list\` para ver dispositivos, o \`pt_cmd_run device="<nombre>" commands="show version" profile="fast"\` para comandos IOS.`
                : "Revisa las advertencias. Usa `pt_status op=doctor` para diagnóstico completo.",
              siguientes: [
                `pt_device op=list — inventario de dispositivos`,
                `pt_link op=list — enlaces del laboratorio`,
                `pt_project op=status — estado del proyecto activo`,
                `pt_status op=doctor — diagnóstico completo`,
              ],
              tips: warningCount > 0 ? ["Revisa las advertencias antes de ejecutar comandos.", "Usa pt_status op=doctor para más detalles."] : undefined,
            });
          }

          case "doctor": {
            const health = await controller.getHealthSummary();
            const heartbeat = controller.getHeartbeatHealth();
            const bridge = controller.getBridgeStatus();
            const healthy = health.bridgeReady && heartbeat.state === "ok";

            return instructivo("pt_status op=doctor", {
              action: "status.doctor",
              health,
              heartbeat,
              bridge,
              healthy,
            }, {
              resumen: healthy
                ? "Diagnóstico: sistema saludable."
                : `Diagnóstico: problemas detectados. bridgeReady=${health.bridgeReady}, heartbeat=${heartbeat.state}.`,
              paso: healthy
                ? "Usa `pt_device op=list` o `pt_cmd_run` para trabajar con el laboratorio."
                : "Usa `pt_status op=summary` para más detalles o revisa `~/pt-dev/logs/`.",
              siguientes: [
                `pt_status op=summary — resumen reconciliado`,
                `pt_device op=list — inventario`,
                `pt_runtime status --json — estado del runtime`,
              ],
            });
          }

          case "runtime": {
            const health = await controller.getHealthSummary();
            const heartbeat = controller.getHeartbeatHealth();
            const runtimeOk = heartbeat.state === "ok";

            return instructivo("pt_status op=runtime", {
              action: "status.runtime",
              health,
              heartbeat,
            }, {
              resumen: runtimeOk
                ? "Runtime de Packet Tracer operativo."
                : "Runtime no responde. Heartbeat: " + (heartbeat.state ?? "desconocido"),
              paso: runtimeOk
                ? "Procede con `pt_device op=list` o `pt_cmd_run`."
                : "Asegúrate de que Packet Tracer esté abierto y el script main.js esté cargado.",
              siguientes: [
                `pt_status op=summary — resumen completo`,
                `pt_status op=doctor — diagnóstico`,
              ],
            });
          }

          case "bridge": {
            const bridge = controller.getBridgeStatus();
            const heartbeat = controller.getHeartbeatHealth();
            const bridgeOk = Boolean(bridge?.ready) && heartbeat.state === "ok";

            return instructivo("pt_status op=bridge", {
              action: "status.bridge",
              bridge,
              heartbeat,
            }, {
              resumen: bridgeOk
                ? "Bridge de comunicación operativo."
                : "Bridge no listo. Revisa heartbeat y filesystem.",
              paso: bridgeOk
                ? "Usa `pt_device op=list` para continuar."
                : "Usa `pt_status op=doctor` para diagnóstico más profundo.",
              siguientes: [
                `pt_status op=summary — resumen reconciliado`,
                `pt_status op=runtime — estado del runtime`,
              ],
            });
          }

          default:
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    ok: false,
                    error: `Operación no soportada: ${input.op}`,
                  }),
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        return errorToFail(error, "PT_STATUS_FAILED", `Error en operación status.${input.op}`);
      }
    },
  );
}
