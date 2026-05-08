import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";

const endpointSchema = z.object({
  device: z.string().min(1),
  port: z.string().min(1),
});

export function registerLinkTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_link",
    {
      title: "Packet Tracer link management",
      description: [
        "Gestiona cables/enlaces entre dispositivos en Packet Tracer.",
        "Soporta listar, agregar, remover, verificar y diagnosticar enlaces.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({
          op: z.literal("list"),
          deep: z.boolean().default(false),
          device: z.string().optional(),
        }),
        z.object({
          op: z.literal("suggest"),
          sourceDevice: z.string().min(1),
          targetDevice: z.string().min(1),
        }),
        z.object({
          op: z.literal("add"),
          a: endpointSchema,
          b: endpointSchema,
          cableType: z.enum([
            "auto", "straight", "cross", "serial", "console",
            "fiber", "phone", "coaxial", "cable", "usb", "wireless", "roll",
          ]).default("auto"),
          verify: z.boolean().default(true),
        }),
        z.object({
          op: z.literal("remove"),
          a: endpointSchema,
          b: endpointSchema.optional(),
          ifExists: z.boolean().default(false),
          verify: z.boolean().default(true),
        }),
        z.object({
          op: z.literal("verify"),
          a: endpointSchema,
          b: endpointSchema,
        }),
        z.object({
          op: z.literal("doctor"),
          a: endpointSchema,
          b: endpointSchema.optional(),
        }),
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
