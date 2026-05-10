import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail } from "./mcp-response.js";
import { DeviceOutputSchema } from "./output-schemas.js";

export function registerDeviceTool(ctx: RegisterToolContext): void {
  const { controller } = ctx.control;

  ctx.server.registerTool(
    "pt_device",
    {
      title: "Packet Tracer Device Management",
      description: [
        "Lists, inspects, creates, moves, removes, and manages modules for Packet Tracer devices.",
        "Use op='list' before pt_cmd_run whenever exact device names are uncertain.",
        "Creation, removal, movement, and module operations modify the lab; inspect/list/ports/module_slots are read-only.",
      ].join(" "),
      inputSchema: z.discriminatedUnion("op", [
        z.object({
          op: z.literal("list"),
          type: z.string().optional().describe("Filtrar por tipo de dispositivo: 'router', 'switch', 'pc', 'server', 'wlc', etc. Si se omite, lista todos."),
          includePorts: z.boolean().default(false).describe("Incluir puertos de cada dispositivo en la respuesta."),
          includeLinks: z.boolean().default(false).describe("Incluir enlaces de cada puerto en la respuesta."),
          deep: z.boolean().default(false).describe("Escaneo profundo: datos detallados de cada dispositivo (más lento)."),
        }).describe("Lista dispositivos del laboratorio. Usar siempre antes de pt_cmd_run si no sabes el nombre exacto del dispositivo. Read-only."),
        z.object({
          op: z.literal("get"),
          device: z.string().min(1).describe("Nombre exacto del dispositivo, ej: 'MLS-CORE-1', 'Switch0', 'PC1'."),
          includeXml: z.boolean().default(false).describe("Incluir representación XML nativa de Packet Tracer."),
        }).describe("Inspecciona un dispositivo específico con todos sus detalles. Read-only."),
        z.object({
          op: z.literal("add"),
          name: z.string().min(1).describe("Nombre único para el nuevo dispositivo en el laboratorio."),
          model: z.string().min(1).describe("Modelo del dispositivo, ej: '2960', '4331', 'PC-PT', 'Server-PT'."),
          x: z.number().int().optional().describe("Posición X en el plano del laboratorio."),
          y: z.number().int().optional().describe("Posición Y en el plano del laboratorio."),
          verify: z.boolean().default(true).describe("Verificar que el dispositivo se haya creado correctamente."),
        }).describe("Agrega un nuevo dispositivo al laboratorio. Modifica el laboratorio."),
        z.object({
          op: z.literal("remove"),
          device: z.string().min(1).describe("Nombre exacto del dispositivo a eliminar."),
          ifExists: z.boolean().default(false).describe("Si es true, no falla si el dispositivo no existe."),
        }).describe("Elimina un dispositivo del laboratorio. Modifica el laboratorio — destructivo."),
        z.object({
          op: z.literal("move"),
          device: z.string().min(1).describe("Nombre exacto del dispositivo a mover."),
          x: z.number().int().describe("Nueva posición X."),
          y: z.number().int().describe("Nueva posición Y."),
        }).describe("Mueve un dispositivo a nuevas coordenadas. Modifica el laboratorio."),
        z.object({
          op: z.literal("ports"),
          device: z.string().min(1).describe("Nombre exacto del dispositivo."),
          refresh: z.boolean().default(false).describe("Forzar refresco desde Packet Tracer en lugar de usar caché."),
        }).describe("Lista los puertos disponibles de un dispositivo. Read-only."),
        z.object({
          op: z.literal("module_slots"),
          device: z.string().min(1).describe("Nombre exacto del dispositivo."),
        }).describe("Lista los slots de módulo disponibles en un dispositivo. Read-only."),
        z.object({
          op: z.literal("module_add"),
          device: z.string().min(1).describe("Nombre exacto del dispositivo."),
          module: z.string().min(1).describe("Nombre del módulo a insertar, ej: 'HWIC-4ESW', 'NIM-2T'."),
          slot: z.union([z.literal("auto"), z.number().int().min(0)]).default("auto").describe("Número de slot o 'auto' para el primer slot disponible."),
        }).describe("Agrega un módulo a un slot del dispositivo. Modifica el laboratorio."),
        z.object({
          op: z.literal("module_remove"),
          device: z.string().min(1).describe("Nombre exacto del dispositivo."),
          slot: z.number().int().min(0).describe("Número de slot del que remover el módulo."),
        }).describe("Remueve un módulo de un slot. Modifica el laboratorio."),
      ]),
      outputSchema: DeviceOutputSchema,
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
