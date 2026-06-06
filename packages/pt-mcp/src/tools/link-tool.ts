import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail, instructivo } from "./mcp-response.js";
import { LinkOutputSchema } from "./output-schemas.js";

const endpointSchema = z.object({
  device: z.string().min(1).describe("Nombre del dispositivo, ej: 'Switch0', 'Router1', 'PC0'."),
  port: z.string().min(1).describe("Nombre del puerto, ej: 'FastEthernet0/1', 'GigabitEthernet0/0'."),
});

export function registerLinkTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_link",
    {
      title: "Packet Tracer Link/Cable Management",
      description: [
        "Lists, verifies, diagnoses, adds, or removes Packet Tracer cables and links.",
        "Use list/verify/diagnose for topology validation before changing cabling.",
        "Add/remove operations modify the lab and can break connectivity, so use them only when explicitly requested.",
        "list, verify, and doctor are read-only; add and remove modify the lab.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({
          op: z.literal("list"),
          deep: z.boolean().default(false).describe("Escaneo profundo: datos detallados de cada enlace."),
          device: z.string().optional().describe("Filtrar enlaces por dispositivo. Si se omite, lista todos."),
        }).describe("Lista todos los enlaces/cables del laboratorio. Read-only."),
        z.object({
          op: z.literal("suggest"),
          sourceDevice: z.string().min(1).describe("Dispositivo origen."),
          targetDevice: z.string().min(1).describe("Dispositivo destino."),
        }).describe("Sugiere puertos disponibles para conectar dos dispositivos."),
        z.object({
          op: z.literal("add"),
          a: endpointSchema.describe("Extremo A del cable."),
          b: endpointSchema.describe("Extremo B del cable."),
          cableType: z.enum([
            "auto", "straight", "cross", "serial", "console",
            "fiber", "phone", "coaxial", "cable", "usb", "wireless", "roll",
          ]).default("auto").describe("Tipo de cable. 'auto' elige el tipo adecuado según los puertos."),
          verify: z.boolean().default(true).describe("Verificar que el enlace se haya creado correctamente."),
        }).describe("Agrega un cable/enlace entre dos puertos. Modifica el laboratorio."),
        z.object({
          op: z.literal("remove"),
          a: endpointSchema.describe("Extremo A del cable a remover."),
          b: endpointSchema.optional().describe("Extremo B (opcional — si se omite, remueve todos los cables de A)."),
          ifExists: z.boolean().default(false).describe("Si es true, no falla si el enlace no existe."),
          verify: z.boolean().default(true).describe("Verificar que el enlace se haya eliminado."),
        }).describe("Remueve un cable/enlace entre dos puertos. Modifica el laboratorio — destructivo."),
        z.object({
          op: z.literal("verify"),
          a: endpointSchema.describe("Extremo A."),
          b: endpointSchema.describe("Extremo B."),
        }).describe("Verifica si existe un enlace entre dos extremos. Read-only."),
        z.object({
          op: z.literal("doctor"),
          a: endpointSchema.describe("Extremo A."),
          b: endpointSchema.optional().describe("Extremo B (opcional — si se omite, diagnóstica todos los enlaces de A)."),
        }).describe("Diagnóstico de conectividad entre extremos. Read-only."),
      ]),
      outputSchema: LinkOutputSchema,
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
          case "list": {
            const devices = await controller.listDevices(input.device, {
              includePorts: true,
              includeLinks: true,
              deep: input.deep,
            });
            const links: Array<Record<string, unknown>> = [];
            if (Array.isArray(devices)) {
              for (const d of devices) {
                const ports = (d as any)?.ports ?? [];
                for (const p of ports) {
                  if (p.link) {
                    links.push({ device: (d as any).name, port: p.name, link: p.link });
                  }
                }
              }
            }
            const count = links.length;

            return instructivo("pt_link op=list", { action: "link.list", links, count }, {
              resumen: count > 0
                ? `Se encontraron ${count} enlace(s) en el laboratorio.`
                : "No hay enlaces en el laboratorio.",
              paso: count > 0
                ? `Usa \`pt_link op=verify a.device="${(links[0] as any)?.device}" a.port="${(links[0] as any)?.port}" ...\` para verificar un enlace específico.`
                : "Usa `pt_link op=add` para conectar dispositivos.",
              siguientes: [
                `pt_link op=verify a.device="<dev>" a.port="<port>" b.device="<dev>" b.port="<port>" — verificar enlace`,
                `pt_link op=doctor a.device="<dev>" a.port="<port>" — diagnosticar conectividad`,
                `pt_device op=list — inventario de dispositivos`,
              ],
            });
          }

          case "suggest": {
            const snapshot = await controller.snapshot();

            return instructivo("pt_link op=suggest", {
              action: "link.suggest",
              source: input.sourceDevice,
              target: input.targetDevice,
              availablePorts: [],
            }, {
              resumen: `Buscando puertos disponibles entre "${input.sourceDevice}" y "${input.targetDevice}".`,
              paso: `Usa \`pt_device op=ports device="${input.sourceDevice}"\` para ver puertos disponibles.`,
              siguientes: [
                `pt_device op=ports device="${input.sourceDevice}" — puertos de origen`,
                `pt_device op=ports device="${input.targetDevice}" — puertos de destino`,
                `pt_link op=add a.device="${input.sourceDevice}" ... b.device="${input.targetDevice}" ... — conectar`,
              ],
            });
          }

          case "add": {
            const result = await controller.addLink(
              input.a.device, input.a.port,
              input.b.device, input.b.port,
              input.cableType,
            );

            return instructivo("pt_link op=add", { action: "link.add", a: input.a, b: input.b, cableType: input.cableType, result }, {
              resumen: `Enlace creado entre ${input.a.device}:${input.a.port} y ${input.b.device}:${input.b.port} (${input.cableType}).`,
              paso: `Verifica con \`pt_link op=verify a.device="${input.a.device}" a.port="${input.a.port}" b.device="${input.b.device}" b.port="${input.b.port}"\`.`,
              siguientes: [
                `pt_link op=verify — verificar enlace`,
                `pt_link op=list — listar todos los enlaces`,
                `pt_cmd_run — ver conectividad con comandos show`,
              ],
            });
          }

          case "remove": {
            if (input.ifExists) {
              try {
                await controller.removeLink(input.a.device, input.a.port);
              } catch {
                return ok({ action: "link.remove", a: input.a, skipped: true });
              }
            } else {
              await controller.removeLink(input.a.device, input.a.port);
            }

            return instructivo("pt_link op=remove", { action: "link.remove", a: input.a }, {
              resumen: `Enlace removido de ${input.a.device}:${input.a.port}.`,
              paso: "Verifica con `pt_link op=list` que el enlace ya no aparece.",
            });
          }

          case "verify": {
            const link = await (controller as any).getTopologyCache?.()?.findLinkBetween?.(
              input.a.device, input.b.device,
            );
            const connected = Boolean(link);

            return instructivo("pt_link op=verify", {
              action: "link.verify",
              a: input.a,
              b: input.b,
              connected,
              link,
            }, {
              resumen: connected
                ? `Enlace CONFIRMADO entre ${input.a.device}:${input.a.port} y ${input.b.device}:${input.b.port}.`
                : `NO hay enlace directo entre ${input.a.device}:${input.a.port} y ${input.b.device}:${input.b.port}.`,
              paso: connected
                ? `Usa \`pt_cmd_run\` para verificar conectividad IP con comandos show.`
                : `Usa \`pt_link op=add\` para crear el enlace.`,
              siguientes: [
                `pt_link op=doctor — diagnóstico de conectividad`,
                `pt_cmd_run device="${input.a.device}" commands="show ip interface brief" profile="fast"`,
                `pt_link op=list — todos los enlaces`,
              ],
            });
          }

          case "doctor": {
            const link = await (controller as any).getTopologyCache?.()?.findLinkBetween?.(
              input.a.device, input.b.device,
            );
            const issues: string[] = [];
            if (!link) issues.push("No hay enlace directo entre los dispositivos.");
            const healthy = issues.length === 0;

            return instructivo("pt_link op=doctor", {
              action: "link.doctor",
              a: input.a,
              b: input.b,
              connected: Boolean(link),
              issues,
              healthy,
            }, {
              resumen: healthy
                ? `Conectividad OK entre ${input.a.device} y ${input.b.device}.`
                : `Problemas detectados: ${issues.join("; ")}`,
              paso: healthy
                ? `Usa \`pt_cmd_run\` para verificar conectividad IP.`
                : `Usa \`pt_link op=add\` o revisa los nombres de puertos con \`pt_device op=ports\`.`,
              siguientes: [
                `pt_link op=verify — verificar enlace específico`,
                `pt_cmd_run device="${input.a.device}" commands="show ip interface brief" profile="fast"`,
                `pt_device op=ports — ver puertos disponibles`,
              ],
            });
          }

          default:
            return { content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: `Operación no soportada: ${input.op}` }) }], isError: true };
        }
      } catch (error) {
        return errorToFail(error, "PT_LINK_FAILED", `Error en operación link.${input.op}`);
      }
    },
  );
}
