import { Command } from "commander";
import { runCommand } from "../../application/run-command.js";
import { createSuccessResult } from "../../contracts/cli-result.js";
import type { CliResult } from "../../contracts/cli-result.js";
import type { CommandMeta } from "../../contracts/command-meta.js";
import { renderCommandResult } from "../../application/render-command-result.js";
import { buildFlags } from "../../flags-utils.js";
import { printExamples } from "../../ux/examples.js";
import { PT_MODULE_CATALOG } from "@cisco-auto/pt-runtime/value-objects";

type DevicePortSnapshot = { name: string; [key: string]: unknown };

interface ModuleSlotsResult {
  device: string;
  slots: Array<{ index: number; type: number; occupied: boolean; installedModule?: string | null; compatibleModules: string[] }>;
  slotCount: number;
}

interface ModuleAddResult {
  device: string;
  module: string;
  slot: number;
  wasPoweredOff: boolean;
  beforePorts: DevicePortSnapshot[];
  afterPorts: DevicePortSnapshot[];
  addedPorts: DevicePortSnapshot[];
}

interface ModuleRemoveResult {
  device: string;
  slot: number;
  beforePorts: DevicePortSnapshot[];
  afterPorts: DevicePortSnapshot[];
  removedPorts: DevicePortSnapshot[];
}

interface ModuleCatalogEntry {
  code: string;
  slotType: string;
  name: string;
}

interface ModuleSuggestResult {
  device: string;
  model: string;
  need?: string;
  suggestions: Array<{ code: string; reason: string; confidence: number }>;
}

interface ModuleProbeResult {
  device: string;
  model: string;
  slots: ModuleSlotsResult["slots"];
  ports: DevicePortSnapshot[];
}

export function listCatalogEntries(): ModuleCatalogEntry[] {
  return Object.values(PT_MODULE_CATALOG as Record<string, ModuleCatalogEntry>).map((entry) => ({
    code: entry.code,
    slotType: entry.slotType,
    name: entry.name,
  }));
}

export function suggestModulesForNeed(need: string | undefined, candidateCodes: string[]): Array<{ code: string; reason: string; confidence: number }> {
  const normalizedNeed = (need ?? "").trim().toLowerCase();
  const prioritized = candidateCodes.filter((code) => {
    if (!normalizedNeed) return true;
    if (normalizedNeed.includes("serial")) return code.includes("T");
    if (normalizedNeed.includes("ether")) return code.includes("ESW") || code.includes("1GE") || code.startsWith("NM-");
    if (normalizedNeed.includes("network")) return code.startsWith("NM-");
    return true;
  });

  return prioritized.map((code) => ({
    code,
    reason: normalizedNeed ? `Compatible with '${normalizedNeed}' requirement` : "Compatible with an available slot",
    confidence: normalizedNeed ? 1 : 0.7,
  }));
}

export function filterCatalogEntriesForSlots(
  entries: ModuleCatalogEntry[],
  slots: Array<{ index?: number; type?: number; occupied?: boolean; installedModule?: string | null; compatibleModules?: string[] }> = [],
): ModuleCatalogEntry[] {
  if (slots.length === 0) return entries;
  const compatibleCodes = new Set(slots.flatMap((slot) => slot.compatibleModules ?? []));
  return entries.filter((entry) => compatibleCodes.has(entry.code));
}

export function collectCandidateModuleCodesForSlots(
  slots: Array<{ compatibleModules?: string[] }> = [],
  entries: ModuleCatalogEntry[] = listCatalogEntries(),
): string[] {
  const compatibleCodes = new Set(slots.flatMap((slot) => slot.compatibleModules ?? []));

  if (compatibleCodes.size > 0) {
    return Array.from(compatibleCodes);
  }

  return entries.map((entry) => entry.code);
}

export function normalizeProbePorts(ports: DevicePortSnapshot[] = []): DevicePortSnapshot[] {
  return ports.map((port) => ({
    ...port,
    name: String(port.name ?? ""),
  }));
}

export const MODULE_ADD_META: CommandMeta = {
  id: "device.module.add",
  summary: "Agregar un modulo fisico a un dispositivo",
  longDescription: "Agrega un modulo HWIC/WIC/NM a un router modular de Packet Tracer. Soporta auto-discovery del slot compatible y verificacion antes/despues.",
  examples: [
    {
      command: "bun run pt device module add R1 WIC-2T",
      description: "Agregar modulo WIC-2T al primer slot compatible de R1",
    },
    {
      command: "bun run pt device module add R1 HWIC-4ESW --slot 1",
      description: "Agregar HWIC-4ESW al slot 1 de R1",
    },
    {
      command: "bun run pt device module add R1 WIC-2T --plan",
      description: "Mostrar plan sin ejecutar",
    },
  ],
  related: [
    "bun run pt device module slots",
    "bun run pt device remove",
  ],
  nextSteps: [
    "bun run pt device module slots",
  ],
  tags: ["device", "module", "add"],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

export function createDeviceModuleCommand(): Command {
  const cmd = new Command("module")
    .alias("mod")
    .description("Gestion de modulos fisicos de dispositivos");

  cmd
    .command("slots")
    .description("Inspeccionar slots modulares de un dispositivo")
    .argument("<device>", "Nombre del dispositivo")
    .option("--json", "Salida JSON")
    .action(async (device: string, options) => {
      const result = await runCommand<ModuleSlotsResult>({
        action: "device.module.slots",
        meta: {
          id: "device.module.slots",
          summary: "Inspeccionar slots modulares",
          longDescription: "Inspecciona los slots modulares de un dispositivo",
          examples: [],
          related: [],
          nextSteps: [],
          tags: ["device", "module", "slots"],
          supportsVerify: false,
          supportsJson: true,
          supportsPlan: false,
          supportsExplain: false,
        } as any,
        flags: { json: Boolean(options.json), output: options.json ? "json" : "text" } as any,
        payloadPreview: { device },
        execute: async (ctx) => {
          const response = await ctx.controller.inspectModuleSlots(device);
          if (!response.ok) {
            return createSuccessResult("device.module.slots", { device, slots: [], slotCount: 0 });
          }

          const value = response.value as { slots?: Array<{ index: number; type: number; occupied: boolean; installedModule?: string | null; compatibleModules: string[] }>; slotCount?: number } | undefined;
          return createSuccessResult("device.module.slots", {
            device,
            slots: value?.slots ?? [],
            slotCount: value?.slotCount ?? (value?.slots?.length ?? 0),
          });
        },
      });

      renderCommandResult({
        result,
        flags: { json: Boolean(options.json), output: options.json ? "json" : "text" } as any,
      });
    });

  cmd
    .command("remove")
    .description("Remover un modulo fisico de un dispositivo")
    .argument("<device>", "Nombre del dispositivo")
    .argument("<slot>", "Slot a liberar")
    .option("--plan", "Mostrar plan de ejecucion sin ejecutar", false)
    .option("--verify", "Verificar cambios post-ejecucion", true)
    .option("--no-verify", "Omitir verificacion post-ejecucion", false)
    .action(async (device: string, slot: string, options) => {
      const slotIndex = Number.parseInt(slot, 10);
      const flags = buildFlags({
        json: process.argv.includes("--json"),
        output: process.argv.includes("--json") ? "json" : "text",
        plan: Boolean(options.plan),
        verify: options.verify ?? true,
      });

      const result = await runCommand<ModuleRemoveResult>({
        action: "device.module.remove",
        meta: {
          id: "device.module.remove",
          summary: "Remover un modulo fisico",
          longDescription: "Retira un modulo de un slot de un dispositivo modular.",
          examples: [],
          related: [],
          nextSteps: [],
          tags: ["device", "module", "remove"],
          supportsVerify: true,
          supportsJson: true,
          supportsPlan: true,
          supportsExplain: false,
        } as any,
        flags,
        payloadPreview: { device, slot: slotIndex },
        execute: async (ctx): Promise<CliResult<ModuleRemoveResult>> => {
          const { controller, logPhase } = ctx;

          if (!device?.trim()) {
            return { schemaVersion: "1.0", ok: false, action: "device.module.remove", error: { code: "INVALID_DEVICE", message: "El nombre del dispositivo es requerido" } };
          }

          if (!Number.isFinite(slotIndex)) {
            return { schemaVersion: "1.0", ok: false, action: "device.module.remove", error: { code: "INVALID_SLOT", message: "El slot debe ser numerico" } };
          }

          if (flags.plan) {
            const slots = await controller.inspectModuleSlots(device);
            const slotInfo = (slots.value as { slots?: Array<{ index: number; occupied?: boolean; installedModule?: string | null }> } | undefined)?.slots?.find((candidate) => candidate.index === slotIndex);

            return createSuccessResult("device.module.remove", {
              device,
              slot: slotIndex,
              beforePorts: [],
              afterPorts: [],
              removedPorts: [],
            }, {
              advice: [
                `Plan: retiraria modulo del slot ${slotIndex} en '${device}'.`,
                slotInfo?.occupied
                  ? `Slot ocupado por '${slotInfo.installedModule ?? "desconocido"}'.`
                  : `Slot ${slotIndex} ya aparece libre o no fue encontrado.`,
              ],
            });
          }

          await logPhase("apply", { device, slot: slotIndex });

          // Fast-path: skip verification if --no-verify
          if (!flags.verify && !flags.plan && typeof (controller as any).removeModuleUnchecked === 'function') {
            const result = await (controller as any).removeModuleUnchecked(device, slotIndex);
            return createSuccessResult("device.module.remove", {
              device: result.device ?? device,
              slot: result.slot ?? slotIndex,
              beforePorts: result.beforePorts ?? [],
              afterPorts: result.afterPorts ?? [],
              removedPorts: result.removedPorts ?? [],
            }, {
              advice: [`Modulo retirado del slot ${slotIndex} en '${device}'.`],
            });
          }

          const removeResult = await controller.removeModule(device, slotIndex);

          if (!removeResult.ok) {
            return {
              schemaVersion: "1.0",
              ok: false,
              action: "device.module.remove",
              error: {
                code: removeResult.code ?? "MODULE_REMOVE_FAILED",
                message: removeResult.error ?? "Error removiendo modulo",
              },
            };
          }

          const value = removeResult.value;

          if (flags.verify) {
            await logPhase("verify", { device, slot: slotIndex });

            const removed = value.removedPorts.length > 0;

            return {
              schemaVersion: "1.0",
              ok: true,
              action: "device.module.remove",
              data: {
                device: value.device,
                slot: value.slot,
                beforePorts: value.beforePorts,
                afterPorts: value.afterPorts,
                removedPorts: value.removedPorts,
              },
              verification: {
                verified: removed,
                checks: [
                  {
                    name: "module.removed",
                    ok: removed,
                    details: { removedPorts: value.removedPorts.map((port) => port.name) },
                  },
                ],
              },
              advice: removed ? [
                `Modulo retirado del slot ${value.slot} en '${value.device}'.`,
              ] : [
                `No se detectaron puertos eliminados tras retirar el modulo.`,
              ],
            };
          }

          return createSuccessResult("device.module.remove", {
            device: value.device,
            slot: value.slot,
            beforePorts: value.beforePorts,
            afterPorts: value.afterPorts,
            removedPorts: value.removedPorts,
          });
        },
      });

      renderCommandResult({ result, flags });
    });

  cmd
    .command("catalog")
    .description("Listar catalogo de modulos disponibles")
    .argument("[device]", "Nombre opcional del dispositivo para filtrar por compatibilidad")
    .option("--json", "Salida JSON")
    .action(async (device: string | undefined, options) => {
      const flags = buildFlags({ json: Boolean(options.json), output: options.json ? "json" : "text" });
      const entries = listCatalogEntries();

      const result = await runCommand<{ device?: string; model?: string; modules: ModuleCatalogEntry[] }>({
        action: "device.module.catalog",
        meta: {
          id: "device.module.catalog",
          summary: "Listar catalogo de modulos",
          longDescription: "Muestra los modulos conocidos por el runtime y su tipo de slot.",
          examples: [],
          related: [],
          nextSteps: [],
          tags: ["device", "module", "catalog"],
          supportsVerify: false,
          supportsJson: true,
          supportsPlan: false,
          supportsExplain: false,
        } as any,
        flags,
        payloadPreview: { device },
        execute: async (ctx) => {
          if (!device?.trim()) {
            return createSuccessResult("device.module.catalog", { modules: entries });
          }

          const deviceInfo = await ctx.controller.inspect(device);
          const slotsResult = await ctx.controller.inspectModuleSlots(device);
          const slots = (slotsResult.value as { slots?: Array<{ compatibleModules?: string[] }> } | undefined)?.slots ?? [];
          const filteredEntries = filterCatalogEntriesForSlots(entries, slots);

          return createSuccessResult("device.module.catalog", {
            device,
            model: deviceInfo.model,
            modules: filteredEntries,
          });
        },
      });

      renderCommandResult({ result, flags });
    });

  cmd
    .command("suggest")
    .description("Sugerir modulos compatibles para un dispositivo")
    .argument("<device>", "Nombre del dispositivo")
    .option("--need <need>", "Necesidad a satisfacer (serial, ethernet, network)")
    .option("--json", "Salida JSON")
    .action(async (device: string, options) => {
      const flags = buildFlags({ json: Boolean(options.json), output: options.json ? "json" : "text" });
      const entries = listCatalogEntries();

      const result = await runCommand<ModuleSuggestResult>({
        action: "device.module.suggest",
        meta: {
          id: "device.module.suggest",
          summary: "Sugerir modulos compatibles",
          longDescription: "Sugiere modulos compatibles con el modelo y los slots disponibles del dispositivo.",
          examples: [],
          related: [],
          nextSteps: [],
          tags: ["device", "module", "suggest"],
          supportsVerify: false,
          supportsJson: true,
          supportsPlan: false,
          supportsExplain: false,
        } as any,
        flags,
        payloadPreview: { device, need: options.need },
        execute: async (ctx) => {
          const deviceInfo = await ctx.controller.inspect(device);
          const slotsResult = await ctx.controller.inspectModuleSlots(device);
          const slots = (slotsResult.value as { slots?: Array<{ compatibleModules?: string[] }> } | undefined)?.slots ?? [];
          const candidateCodes = collectCandidateModuleCodesForSlots(slots, entries);
          const suggestions = suggestModulesForNeed(options.need, candidateCodes);

          return createSuccessResult("device.module.suggest", {
            device,
            model: deviceInfo.model,
            need: options.need,
            suggestions,
          });
        },
      });

      renderCommandResult({ result, flags });
    });

  cmd
    .command("probe")
    .description("Inspeccionar estado de modulos y puertos de un dispositivo")
    .argument("<device>", "Nombre del dispositivo")
    .option("--json", "Salida JSON")
    .action(async (device: string, options) => {
      const flags = buildFlags({ json: Boolean(options.json), output: options.json ? "json" : "text" });

      const result = await runCommand<ModuleProbeResult>({
        action: "device.module.probe",
        meta: {
          id: "device.module.probe",
          summary: "Inspeccionar modulos y puertos",
          longDescription: "Combina la inspeccion de slots modulares con los puertos actuales del dispositivo.",
          examples: [],
          related: [],
          nextSteps: [],
          tags: ["device", "module", "probe"],
          supportsVerify: false,
          supportsJson: true,
          supportsPlan: false,
          supportsExplain: false,
        } as any,
        flags,
        payloadPreview: { device },
        execute: async (ctx) => {
          const deviceInfo = await ctx.controller.inspect(device);
          const slotsResult = await ctx.controller.inspectModuleSlots(device);
          const slots = (slotsResult.value as { slots?: ModuleSlotsResult["slots"] } | undefined)?.slots ?? [];
          const ports = normalizeProbePorts((deviceInfo.ports ?? []) as DevicePortSnapshot[]);

          return createSuccessResult("device.module.probe", {
            device,
            model: deviceInfo.model,
            slots,
            ports,
          });
        },
      });

      renderCommandResult({ result, flags });
    });

  cmd
    .command("add")
    .description("Agregar un modulo fisico a un dispositivo")
    .argument("<device>", "Nombre del dispositivo")
    .argument("<module>", "Tipo de modulo (ej: WIC-2T, HWIC-4ESW, NM-2W)")
    .option("--slot <slot>", "Slot donde instalar (use 'auto' para descubrimiento automatico)", "auto")
    .option("--examples", "Mostrar ejemplos de uso y salir", false)
    .option("--schema", "Mostrar schema JSON del resultado y salir", false)
    .option("--explain", "Explicar que hace el comando y salir", false)
    .option("--plan", "Mostrar plan de ejecucion sin ejecutar", false)
    .option("--verify", "Verificar cambios post-ejecucion", true)
    .option("--no-verify", "Omitir verificacion post-ejecucion", false)
    .option("--trace", "Activar traza estructurada de la ejecucion", false)
    .option("--trace-bundle", "Generar archivo bundle unico para debugging", false)
    .action(async (device: string, module: string, options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalSchema = process.argv.includes("--schema");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");
      const globalJson = process.argv.includes("--json");
      const globalTrace = process.argv.includes("--trace");
      const globalTraceBundle = process.argv.includes("--trace-bundle");

      const verifyEnabled = options.verify ?? true;

      if (globalExamples) {
        console.log(printExamples(MODULE_ADD_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(MODULE_ADD_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(MODULE_ADD_META.longDescription ?? MODULE_ADD_META.summary);
        return;
      }

      const slotArg = options.slot === "auto" ? "auto" : parseInt(options.slot, 10);

      const flags = buildFlags({
        json: globalJson,
        output: globalJson ? "json" : "text",
        trace: globalTrace,
        traceBundle: globalTraceBundle,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: verifyEnabled,
      });

      const result = await runCommand<ModuleAddResult>({
        action: "device.module.add",
        meta: MODULE_ADD_META,
        flags,
        payloadPreview: { device, module, slot: options.slot },
        execute: async (ctx): Promise<CliResult<ModuleAddResult>> => {
          const { controller, logPhase } = ctx;

          if (!device?.trim()) {
            return {
              schemaVersion: "1.0" as const,
              ok: false as const,
              action: "device.module.add",
              error: { code: "INVALID_DEVICE", message: "El nombre del dispositivo es requerido" },
            };
          }

          if (!module?.trim()) {
            return {
              schemaVersion: "1.0" as const,
              ok: false as const,
              action: "device.module.add",
              error: { code: "INVALID_MODULE", message: "El tipo de modulo es requerido" },
            };
          }

          if (globalPlan) {
            const plannedSlots = await controller.inspectModuleSlots(device);
            const slots = (plannedSlots.value as { slots?: Array<{ index: number; occupied?: boolean; compatibleModules?: string[] }> } | undefined)?.slots ?? [];
            const plannedSlot = typeof slotArg === "number"
              ? slotArg
              : (slots.find((candidate) => !candidate.occupied && (candidate.compatibleModules ?? []).includes(module))?.index ?? -1);

            return createSuccessResult("device.module.add", {
              device,
              module,
              slot: plannedSlot,
              wasPoweredOff: false,
              beforePorts: [],
              afterPorts: [],
              addedPorts: [],
            }, {
              advice: [
                `Plan: instalaria '${module}' en '${device}'${slotArg === "auto" ? " (auto)" : ` (slot ${slotArg})`}.`,
                plannedSlot >= 0
                  ? `Slot planificado: ${plannedSlot}.`
                  : `No se pudo determinar un slot compatible con la informacion actual.`,
              ],
            });
          }

          await logPhase("apply", { device, module, slot: slotArg });

          // Fast-path: skip verification if --no-verify
          if (!verifyEnabled && !globalPlan && typeof (controller as any).addModuleUnchecked === 'function') {
            const result = await (controller as any).addModuleUnchecked(device, slotArg as any, module);
            return createSuccessResult("device.module.add", {
              device: result.device ?? device,
              module: result.module ?? module,
              slot: result.slot ?? (typeof slotArg === "number" ? slotArg : -1),
              wasPoweredOff: result.wasPoweredOff ?? false,
              beforePorts: result.beforePorts ?? [],
              afterPorts: result.afterPorts ?? [],
              addedPorts: result.addedPorts ?? [],
            }, {
              advice: [
                `Modulo '${module}' instalado en '${device}'.`,
              ],
            });
          }

          const addResult = await controller.addModule(device, slotArg as any, module) as { ok: true; value: ModuleAddResult } | { ok: false; error: string; code: string; advice?: string[] };

          if (!addResult.ok) {
            return {
              schemaVersion: "1.0" as const,
              ok: false as const,
              action: "device.module.add",
              error: {
                code: addResult.code ?? "MODULE_ADD_FAILED",
                message: addResult.error ?? "Error agregando modulo",
              },
              advice: addResult.advice ?? [
                `Verifica que '${device}' soporte expansion modular.`,
                `Ejecuta 'bun run pt device module slots ${device}' para ver slots disponibles.`,
              ],
            };
          }

          const value = addResult.value;

          if (verifyEnabled) {
            await logPhase("verify", { device, module, slot: value.slot });

            const checks: Array<{ name: string; ok: boolean; details?: Record<string, unknown> }> = [
              {
                name: "module.added",
                ok: value.addedPorts.length > 0,
                details: { slot: value.slot, addedPorts: value.addedPorts.map((port) => port.name) },
              },
              {
                name: "module.slot-consistent",
                ok: value.afterPorts.length >= value.beforePorts.length,
                details: { beforeCount: value.beforePorts.length, afterCount: value.afterPorts.length },
              },
            ];

            const allPassed = checks.every((c) => c.ok);

            if (!allPassed && value.wasPoweredOff) {
              checks.push({
                name: "device.repowered",
                ok: true,
                details: { note: "El dispositivo fue apagado y encendido automaticamente" },
              });
            }

            const advice = allPassed
              ? [`Modulo '${value.module}' instalado en slot ${value.slot} de '${value.device}'.`]
              : [`El modulo se agrego pero no se pudo verificar el slot.`];

            return {
              schemaVersion: "1.0" as const,
              ok: true as const,
              action: "device.module.add",
              data: {
                device: value.device,
                module: value.module,
                slot: value.slot,
                wasPoweredOff: value.wasPoweredOff ?? false,
                beforePorts: value.beforePorts,
                afterPorts: value.afterPorts,
                addedPorts: value.addedPorts,
              },
              verification: {
                verified: allPassed,
                checks,
              },
              advice,
            };
          }

          return createSuccessResult("device.module.add", {
            device: value.device,
            module: value.module,
            slot: value.slot,
            wasPoweredOff: value.wasPoweredOff ?? false,
            beforePorts: value.beforePorts,
            afterPorts: value.afterPorts,
            addedPorts: value.addedPorts,
          }, {
            advice: [
              `Modulo '${value.module}' instalado en slot ${value.slot} de '${value.device}'.`,
              `Ejecuta 'bun run pt device module slots ${device}' para ver los slots.`,
            ],
          });
        },
      });

      renderCommandResult({
        result,
        flags,
        nextSteps: [
          `bun run pt device module slots ${device}`,
        ],
      });
    });

  return cmd;
}
