#!/usr/bin/env bun
/**
 * Comando topology clean - Elimina dispositivos de la topología
 */

import { Command } from "commander";
import chalk from "chalk";

import type { CliResult } from "../../contracts/cli-result.js";
import { createSuccessResult } from "../../contracts/cli-result.js";
import type { CommandMeta } from "../../contracts/command-meta.js";
import type { GlobalFlags } from "../../flags.js";

import { runCommand } from "../../application/run-command.js";
import { renderCliResult } from "../../ux/renderers.js";
import { printExamples } from "../../ux/examples.js";
import { buildFlags } from "../../flags-utils.js";

interface TopologyCleanResult {
  devicesRemoved: string[];
  count: number;
}

export const TOPOLOGY_CLEAN_META: CommandMeta = {
  id: "topology.clean",
  summary: "Eliminar dispositivos de la topología",
  longDescription:
    "Elimina dispositivos del canvas de Packet Tracer. Soporta eliminación individual, por tipo, o completa.",
  examples: [
    {
      command: "bun run pt topology clean",
      description: "Eliminar todos los dispositivos (con confirmación)",
    },
    {
      command: "bun run pt topology clean --list",
      description: "Mostrar dispositivos a eliminar sin ejecutar",
    },
    {
      command: "bun run pt topology clean R1 R2",
      description: "Eliminar dispositivos específicos",
    },
    {
      command: "bun run pt topology clean --type router",
      description: "Eliminar todos los routers",
    },
    {
      command: "bun run pt topology clean --type switch",
      description: "Eliminar todos los switches",
    },
  ],
  related: ["bun run pt device list", "bun run pt device add", "bun run pt topology visualize"],
  tags: ["topology", "clean", "remove", "delete"],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

export function createTopologyCleanCommand(): Command {
  const cmd = new Command("clean")
    .description("Eliminar dispositivos de la topología")
    .argument("[devices...]", "Nombres de dispositivos a eliminar")
    .option("-l, --list", "Mostrar dispositivos a eliminar sin ejecutar (dry-run)", false)
    .option(
      "-t, --type <type>",
      "Eliminar todos los dispositivos de un tipo (router, switch, pc, server)",
    )
    .option("-f, --force", "Eliminar sin confirmación", false)
    .option("--examples", "Mostrar ejemplos de uso y salir", false)
    .option("--schema", "Mostrar schema JSON del resultado y salir", false)
    .option("--explain", "Explicar qué hace el comando y salir", false)
    .option("--plan", "Mostrar plan de ejecución sin ejecutar", false)
    .option("--trace", "Activar traza estructurada de la ejecución", false)
    .option("--trace-bundle", "Generar archivo bundle único para debugging", false)
    .action(async (devices, options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalSchema = process.argv.includes("--schema");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");
      const globalTrace = process.argv.includes("--trace");
      const globalTraceBundle = process.argv.includes("--trace-bundle");
      const isDryRun = options.list ?? false;

      if (globalExamples) {
        console.log(printExamples(TOPOLOGY_CLEAN_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(TOPOLOGY_CLEAN_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(TOPOLOGY_CLEAN_META.longDescription ?? TOPOLOGY_CLEAN_META.summary);
        return;
      }

      const flags = buildFlags({
        trace: globalTrace,
        traceBundle: globalTraceBundle,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: false,
      });

      const result = await runCommand<TopologyCleanResult>({
        action: "topology.clean",
        meta: TOPOLOGY_CLEAN_META,
        flags,
        payloadPreview: {
          devices: devices.length > 0 ? devices : "all",
          type: options.type ?? "none",
          dryRun: isDryRun,
        },
        execute: async (ctx): Promise<CliResult<TopologyCleanResult>> => {
          const { controller, logPhase } = ctx;

          await logPhase("discover", {});

          const allDevices = await controller.listDevices();
          const devicesToRemove: string[] = [];

          if (options.type) {
            const typeFilter = options.type.toLowerCase();
            for (const device of allDevices) {
              if (device.type === typeFilter) {
                devicesToRemove.push(device.name);
              }
            }
          } else if (devices.length > 0) {
            for (const deviceName of devices) {
              const exists = allDevices.find((d: { name: string }) => d.name === deviceName);
              if (exists) {
                devicesToRemove.push(deviceName);
              }
            }
          } else {
            for (const device of allDevices) {
              devicesToRemove.push(device.name);
            }
          }

          if (devicesToRemove.length === 0) {
            return createSuccessResult(
              "topology.clean",
              {
                devicesRemoved: [],
                count: 0,
              },
              {
                advice: ["No hay dispositivos para eliminar"],
              },
            );
          }

          console.log(chalk.cyan(`Dispositivos encontrados: ${devicesToRemove.length}`));
          for (const name of devicesToRemove) {
            const device = allDevices.find((d: { name: string; type?: string }) => d.name === name);
            console.log(`  - ${name} (${device?.type ?? "unknown"})`);
          }

          if (isDryRun) {
            console.log(chalk.yellow("\n[DRY RUN] No se eliminó ningún dispositivo"));
            return createSuccessResult(
              "topology.clean",
              {
                devicesRemoved: [],
                count: 0,
              },
              {
                advice: ["Ejecuta sin --list para eliminar los dispositivos"],
              },
            );
          }

          if (globalPlan) {
            console.log("\nPlan de ejecución:");
            console.log(`  1. Eliminar ${devicesToRemove.length} dispositivo(s)`);
            for (const name of devicesToRemove) {
              console.log(`     - ${name}`);
            }
            return createSuccessResult("topology.clean", {
              devicesRemoved: [],
              count: 0,
            });
          }

          if (!options.force) {
            console.log(
              chalk.yellow(`\n¿Confirmas eliminar ${devicesToRemove.length} dispositivo(s)?`),
            );
            console.log(chalk.gray("Usa --force para omitir esta confirmación"));
          }

          await logPhase("apply", {
            devices: devicesToRemove,
            count: devicesToRemove.length,
          });

          const removed: string[] = [];
          for (const deviceName of devicesToRemove) {
            await controller.removeDevice(deviceName);
            removed.push(deviceName);
            console.log(`${chalk.green("✓")} Eliminado: ${deviceName}`);
          }

          return createSuccessResult(
            "topology.clean",
            {
              devicesRemoved: removed,
              count: removed.length,
            },
            {
              advice: ["Ejecuta bun run pt device list para verificar los cambios"],
            },
          );
        },
      });

      const output = renderCliResult(result, flags.output);

      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (!result.ok) {
        process.exit(1);
      }
    });

  return cmd;
}
