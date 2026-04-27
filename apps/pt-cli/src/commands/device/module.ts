import { Command } from "commander";
import { runCommand } from "../../application/run-command.js";
import { createSuccessResult, createVerifiedResult, createErrorResult } from "../../contracts/cli-result.js";
import type { CliResult } from "../../contracts/cli-result.js";
import type { CommandMeta } from "../../contracts/command-meta.js";
import { renderCommandResult } from "../../application/render-command-result.js";
import { renderCliResult } from "../../ux/renderers.js";
import { buildFlags } from "../../flags-utils.js";
import { printExamples } from "../../ux/examples.js";

interface ModuleSlotsResult {
  device: string;
  slots: Array<{ index: number; type: number }>;
  slotCount: number;
}

interface ModuleAddResult {
  device: string;
  module: string;
  slot: number;
  wasPoweredOff: boolean;
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

          const value = response.value as { slots?: Array<{ index: number; type: number }>; slotCount?: number } | undefined;
          return createSuccessResult("device.module.slots", {
            device,
            slots: value?.slots ?? [],
            slotCount: value?.slotCount ?? (value?.slots?.length ?? 0),
          });
        },
      });

      console.log(renderCliResult(result, options.json ? "json" : "text"));
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

          await controller.start();

          try {
            if (!device?.trim()) {
              return createErrorResult<ModuleAddResult>("device.module.add", {
                code: "INVALID_DEVICE",
                message: "El nombre del dispositivo es requerido",
              });
            }

            if (!module?.trim()) {
              return createErrorResult<ModuleAddResult>("device.module.add", {
                code: "INVALID_MODULE",
                message: "El tipo de modulo es requerido",
              });
            }

            if (globalPlan) {
              return createSuccessResult("device.module.add", {
                device,
                module,
                slot: typeof slotArg === "number" ? slotArg : -1,
                wasPoweredOff: false,
              }, {
                advice: [
                  `Plan: instalaria '${module}' en '${device}'${slotArg === "auto" ? " (auto)" : ` (slot ${slotArg})`}.`,
                  slotArg === "auto"
                    ? `Auto-descubriria el primer slot compatible en '${device}'.`
                    : `Usaria slot '${slotArg}' en '${device}'.`,
                ],
              });
            }

            await logPhase("apply", { device, module, slot: slotArg });

            const addResult = await controller.addModule(device, slotArg as any, module) as { ok: true; value: { device: string; module: string; slot: number; wasPoweredOff: boolean } } | { ok: false; error: string; code: string; advice?: string[] };

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

              const slotsAfter = await controller.inspectModuleSlots(device);
              const slotInfo = (slotsAfter.value as any)?.slots?.find((s: any) => s.index === value.slot);

              const checks: Array<{ name: string; ok: boolean; details?: Record<string, unknown> }> = [
                {
                  name: "module.added",
                  ok: slotInfo !== undefined,
                  details: { slot: value.slot, found: slotInfo !== undefined },
                },
              ];

              const allPassed = checks.every((c) => c.ok);

              if (!allPassed && value.wasPoweredOff) {
                checks.push({
                  name: "device.repowered",
                  ok: true,
                  details: { message: "El dispositivo fue apagado y encendido automaticamente" },
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
            }, {
              advice: [
                `Modulo '${value.module}' instalado en slot ${value.slot} de '${value.device}'.`,
                `Ejecuta 'bun run pt device module slots ${device}' para ver los slots.`,
              ],
            });
          } finally {
            await controller.stop();
          }
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
