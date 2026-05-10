import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";
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
            return ok({ action: "link.list", links, count: links.length });
          }

          case "suggest": {
            const snapshot = await controller.snapshot();
            return ok({
              action: "link.suggest",
              source: input.sourceDevice,
              target: input.targetDevice,
              availablePorts: [],
              hint: "Usa pt_device ports para ver puertos disponibles en cada dispositivo.",
            });
          }

          case "add": {
            const result = await controller.addLink(
              input.a.device, input.a.port,
              input.b.device, input.b.port,
              input.cableType,
            );
            return ok({ action: "link.add", a: input.a, b: input.b, cableType: input.cableType, result });
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
            return ok({ action: "link.remove", a: input.a });
          }

          case "verify": {
            const link = await (controller as any).getTopologyCache?.()?.findLinkBetween?.(
              input.a.device, input.b.device,
            );
            return ok({
              action: "link.verify",
              a: input.a,
              b: input.b,
              connected: Boolean(link),
              link,
            });
          }

          case "doctor": {
            const link = await (controller as any).getTopologyCache?.()?.findLinkBetween?.(
              input.a.device, input.b.device,
            );
            const issues: string[] = [];
            if (!link) issues.push("No hay enlace directo entre los dispositivos.");
            return ok({
              action: "link.doctor",
              a: input.a,
              b: input.b,
              connected: Boolean(link),
              issues,
              healthy: issues.length === 0,
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
