import * as z from "zod/v4";
import type { RegisterToolContext } from "./tool-types.js";
import { ok, errorToFail, instructivo } from "./mcp-response.js";
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
            const count = Array.isArray(devices) ? devices.length : 0;
            const deviceNames = Array.isArray(devices) ? devices.map((d: any) => d.name).filter(Boolean) : [];

            return instructivo("pt_device op=list", { action: "device.list", devices, count }, {
              resumen: count > 0 ? `Se encontraron ${count} dispositivo(s) en el laboratorio.` : "No se encontraron dispositivos.",
              paso: count > 0
                ? `Usa \`pt_device op=get device="${deviceNames[0]}"\` para inspeccionar un dispositivo, o \`pt_cmd_run\` con device="${deviceNames[0]}" commands="show version" profile="fast" mode="safe".`
                : "Agrega dispositivos con `pt_device op=add name=\"Switch0\" model=\"2960\"`.",
              siguientes: [
                `pt_device op=get device="<nombre>" — detalles de un dispositivo`,
                `pt_cmd_run con device="<nombre>" commands="show version" profile="fast" — comandos IOS`,
                `pt_link op=list — revisar cableado`,
                `pt_status op=summary — estado general`,
              ],
            });
          }

          case "get": {
            const device = await controller.inspectDevice(input.device, input.includeXml);
            const ports = (device as any)?.ports ?? [];

            return instructivo("pt_device op=get", { action: "device.get", device: input.device, state: device }, {
              resumen: `Dispositivo "${input.device}" inspeccionado. ${ports.length} puerto(s) disponible(s).`,
              paso: `Usa \`pt_cmd_run device="${input.device}" commands="show ip interface brief" profile="fast"\` para ver estado IP.`,
              siguientes: [
                `pt_device op=ports device="${input.device}" — ver puertos disponibles`,
                `pt_link op=list device="${input.device}" — ver enlaces de este dispositivo`,
                `pt_cmd_run device="${input.device}" commands="show running-config" profile="audit" — ver configuración`,
              ],
            });
          }

          case "add": {
            const result = await controller.addDevice(input.name, input.model, {
              x: input.x,
              y: input.y,
            });

            return instructivo("pt_device op=add", { action: "device.add", device: input.name, model: input.model, result }, {
              resumen: `Dispositivo "${input.name}" (${input.model}) agregado al laboratorio.`,
              paso: `Verifica con \`pt_device op=list\` o \`pt_device op=get device="${input.name}"\`. Luego conecta cables con \`pt_link op=add\`.`,
              siguientes: [
                `pt_device op=get device="${input.name}" — verificar creación`,
                `pt_device op=ports device="${input.name}" — ver puertos disponibles`,
                `pt_link op=add a.device="${input.name}" a.port="<puerto>" b.device="<otro>" b.port="<puerto>" — conectar`,
              ],
            });
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

            return instructivo("pt_device op=remove", { action: "device.remove", device: input.device }, {
              resumen: `Dispositivo "${input.device}" eliminado del laboratorio.`,
              paso: "Verifica con `pt_device op=list` que ya no aparece en el inventario.",
              siguientes: [
                `pt_device op=list — verificar eliminación`,
                `pt_link op=list — revisar enlaces restantes`,
              ],
            });
          }

          case "move": {
            const result = await controller.moveDevice(input.device, input.x, input.y);

            return instructivo("pt_device op=move", { action: "device.move", device: input.device, x: input.x, y: input.y, result }, {
              resumen: `Dispositivo "${input.device}" movido a (${input.x}, ${input.y}).`,
              paso: `Verifica con \`pt_device op=get device="${input.device}"\`.`,
            });
          }

          case "ports": {
            const device = await controller.inspectDevice(input.device, false);
            const ports = (device as any)?.ports ?? [];

            return instructivo("pt_device op=ports", { action: "device.ports", device: input.device, ports }, {
              resumen: `${ports.length} puerto(s) disponible(s) en "${input.device}".`,
              paso: ports.length > 0
                ? `Usa \`pt_link op=add a.device="${input.device}" a.port="${(ports[0] as any)?.name}" b.device="<otro>" b.port="<puerto>"\` para conectar.`
                : "El dispositivo no tiene puertos disponibles para conectar.",
              siguientes: [
                `pt_link op=suggest sourceDevice="${input.device}" targetDevice="<otro>" — sugerir conexión`,
                `pt_device op=get device="${input.device}" — ver detalles completos`,
              ],
            });
          }

          case "module_slots": {
            const slots = await (controller as any).inspectModuleSlots(input.device);

            return instructivo("pt_device op=module_slots", { action: "device.module_slots", device: input.device, slots }, {
              resumen: `${Array.isArray(slots) ? slots.length : 0} slot(s) de módulo disponible(s) en "${input.device}".`,
              paso: Array.isArray(slots) && slots.length > 0
                ? `Usa \`pt_device op=module_add device="${input.device}" module="HWIC-4ESW"\` para instalar un módulo.`
                : "No hay slots disponibles para módulos adicionales.",
            });
          }

          case "module_add": {
            const slot = input.slot === "auto" ? "auto" : input.slot;
            const result = await controller.addModule(input.device, slot, input.module);

            return instructivo("pt_device op=module_add", { action: "device.module_add", device: input.device, module: input.module, slot, result }, {
              resumen: `Módulo "${input.module}" instalado en ${input.device} (slot: ${slot}).`,
              paso: `Verifica con \`pt_device op=get device="${input.device}"\` que el módulo aparezca. Luego conecta cables a los nuevos puertos.`,
            });
          }

          case "module_remove": {
            const result = await controller.removeModule(input.device, input.slot);

            return instructivo("pt_device op=module_remove", { action: "device.module_remove", device: input.device, slot: input.slot, result }, {
              resumen: `Módulo removido del slot ${input.slot} en "${input.device}".`,
              paso: `Verifica con \`pt_device op=get device="${input.device}"\`.`,
            });
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
