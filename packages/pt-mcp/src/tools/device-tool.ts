import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";

export function registerDeviceTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_device",
    {
      title: "Packet Tracer device management",
      description: [
        "Gestiona dispositivos en el laboratorio de Packet Tracer.",
        "Soporta listar, inspeccionar, crear, mover, eliminar y gestionar módulos.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({
          op: z.literal("list"),
          type: z.string().optional(),
          includePorts: z.boolean().default(false),
          includeLinks: z.boolean().default(false),
          deep: z.boolean().default(false),
        }),
        z.object({
          op: z.literal("get"),
          device: z.string().min(1),
          includeXml: z.boolean().default(false),
        }),
        z.object({
          op: z.literal("add"),
          name: z.string().min(1),
          model: z.string().min(1),
          x: z.number().int().optional(),
          y: z.number().int().optional(),
          verify: z.boolean().default(true),
        }),
        z.object({
          op: z.literal("remove"),
          device: z.string().min(1),
          ifExists: z.boolean().default(false),
        }),
        z.object({
          op: z.literal("move"),
          device: z.string().min(1),
          x: z.number().int(),
          y: z.number().int(),
        }),
        z.object({
          op: z.literal("ports"),
          device: z.string().min(1),
          refresh: z.boolean().default(false),
        }),
        z.object({
          op: z.literal("module_slots"),
          device: z.string().min(1),
        }),
        z.object({
          op: z.literal("module_add"),
          device: z.string().min(1),
          module: z.string().min(1),
          slot: z.union([z.literal("auto"), z.number().int().min(0)]).default("auto"),
        }),
        z.object({
          op: z.literal("module_remove"),
          device: z.string().min(1),
          slot: z.number().int().min(0),
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
            const devices = await controller.listDevices(input.type, {
              includePorts: input.includePorts,
              includeLinks: input.includeLinks,
              deep: input.deep,
            });
            return ok({ action: "device.list", devices, count: Array.isArray(devices) ? devices.length : 0 });
          }

          case "get": {
            const device = await controller.inspectDevice(input.device, input.includeXml);
            return ok({ action: "device.get", device: input.device, state: device });
          }

          case "add": {
            const result = await controller.addDevice(input.name, input.model, {
              x: input.x,
              y: input.y,
            });
            return ok({ action: "device.add", device: input.name, model: input.model, result });
          }

          case "remove": {
            if (input.ifExists) {
              try {
                await controller.removeDevice(input.device);
              } catch {
                return ok({ action: "device.remove", device: input.device, skipped: true });
              }
            } else {
              await controller.removeDevice(input.device);
            }
            return ok({ action: "device.remove", device: input.device });
          }

          case "move": {
            const result = await controller.moveDevice(input.device, input.x, input.y);
            return ok({ action: "device.move", device: input.device, x: input.x, y: input.y, result });
          }

          case "ports": {
            const device = await controller.inspectDevice(input.device, false);
            const ports = (device as any)?.ports ?? [];
            return ok({ action: "device.ports", device: input.device, ports });
          }

          case "module_slots": {
            const slots = await (controller as any).inspectModuleSlots(input.device);
            return ok({ action: "device.module_slots", device: input.device, slots });
          }

          case "module_add": {
            const slot = input.slot === "auto" ? "auto" : input.slot;
            const result = await controller.addModule(input.device, slot, input.module);
            return ok({ action: "device.module_add", device: input.device, module: input.module, slot, result });
          }

          case "module_remove": {
            const result = await controller.removeModule(input.device, input.slot);
            return ok({ action: "device.module_remove", device: input.device, slot: input.slot, result });
          }

          default:
            return { content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: `Operación no soportada: ${input.op}` }) }], isError: true };
        }
      } catch (error) {
        return errorToFail(error, "PT_DEVICE_FAILED", `Error en operación device.${input.op}`);
      }
    },
  );
}
