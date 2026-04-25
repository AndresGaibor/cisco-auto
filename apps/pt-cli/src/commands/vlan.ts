#!/usr/bin/env bun
/**
 * Comando vlan - Gestión de VLANs en Packet Tracer
 * Thin CLI wrapper que delega a pt-control/application/vlan
 */

import { Command } from "commander";
import chalk from "chalk";

import type { CliResult } from "../contracts/cli-result.js";
import { createSuccessResult, createErrorResult } from "../contracts/cli-result.js";
import type { CommandMeta } from "../contracts/command-meta.js";
import type { GlobalFlags } from "../flags.js";

import { runCommand } from "../application/run-command.js";
import { renderCliResult } from "../ux/renderers.js";
import { printExamples } from "../ux/examples.js";

import {
  buildVlanCreateCommands,
  executeVlanApply,
  executeVlanConfigInterfaces,
  executeVlanEnsure,
  executeVlanTrunk,
  type VlanApplyResult,
  type VlanConfigInterfacesResult,
  type VlanCreateResult,
  type VlanEnsureResult,
  type VlanTrunkResult,
} from "@cisco-auto/pt-control/application/vlan";

const VLAN_EXAMPLES = [
  {
    command: "pt vlan create --name SERVIDORES --id 100",
    description: "Crear VLAN 100 llamada SERVIDORES",
  },
  {
    command: "pt vlan apply --device Switch1 --vlans 10,20,30",
    description: "Aplicar VLANs a un switch",
  },
  {
    command: "pt vlan trunk --device Switch1 --interface Gi0/1 --allowed 10,20",
    description: "Configurar trunk con VLANs permitidas",
  },
];

const VLAN_META: CommandMeta = {
  id: "vlan",
  summary: "Gestionar VLANs en Packet Tracer",
  longDescription: "Comandos para crear, aplicar y configurar VLANs en switches Cisco.",
  examples: VLAN_EXAMPLES,
  related: ["config-ios", "show", "etherchannel"],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

function createLabVlanCommand(): Command {
  const command = new Command("vlan").description("Comandos para gestionar VLANs");

  command
    .command("create")
    .description("Generar comandos IOS para crear una VLAN")
    .requiredOption("--name <name>", "Nombre de la VLAN")
    .requiredOption("--id <id>", "ID de la VLAN (1-4094)")
    .option("--description <text>", "Descripción opcional de la VLAN")
    .action(async (options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalSchema = process.argv.includes("--schema");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");

      if (globalExamples) {
        console.log(printExamples(VLAN_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(VLAN_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(VLAN_META.longDescription ?? VLAN_META.summary);
        return;
      }

      if (globalPlan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Crear VLAN ${options.id} con nombre "${options.name}"`);
        console.log("  2. Generar comandos IOS");
        return;
      }

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: "text",
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: false,
        timeout: null,
        noTimeout: false,
      };

      const result = await runCommand({
        action: "vlan.create",
        meta: VLAN_META,
        flags,
        payloadPreview: { name: options.name, id: options.id },
        execute: async (): Promise<CliResult<VlanCreateResult>> => {
          try {
            const id = Number(options.id);
            if (Number.isNaN(id) || id < 1 || id > 4094) {
              return createErrorResult("vlan.create", {
                message: "El ID de VLAN debe ser un número entre 1 y 4094",
              }) as CliResult<VlanCreateResult>;
            }

            const commands = buildVlanCreateCommands(options.name, id, options.description);

            return createSuccessResult(
              "vlan.create",
              {
                vlanId: id,
                name: options.name,
                description: options.description,
                commands,
              },
              {
                advice: ["Usa pt config-ios <device> para aplicar estos comandos"],
              },
            );
          } catch (error) {
            return createErrorResult("vlan.create", {
              message: error instanceof Error ? error.message : String(error),
            }) as CliResult<VlanCreateResult>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (result.ok) {
        console.log(chalk.blue("\n➡️  Comandos VLAN generados:"));
        const cmds = result.data?.commands as string[] | undefined;
        cmds?.forEach((cmd) => console.log(cmd));
      }

      if (!result.ok) process.exit(1);
    });

  command
    .command("apply")
    .description("Aplicar VLANs a un switch")
    .requiredOption("--device <name>", "Nombre del dispositivo destino")
    .requiredOption("--vlans <list>", "Lista de IDs de VLAN separadas por comas")
    .action(async (options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");

      if (globalExamples) {
        console.log(printExamples(VLAN_META));
        return;
      }

      if (globalExplain) {
        console.log(VLAN_META.longDescription ?? VLAN_META.summary);
        return;
      }

      if (globalPlan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Validar lista de VLANs: ${options.vlans}`);
        console.log(`  2. Generar comandos IOS para crear VLANs`);
        console.log(`  3. Aplicar al dispositivo ${options.device}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: "text",
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: false,
        explain: globalExplain,
        plan: globalPlan,
        verify: true,
        timeout: null,
        noTimeout: false,
      };

      const result = await runCommand({
        action: "vlan.apply",
        meta: VLAN_META,
        flags,
        payloadPreview: { device: options.device, vlans: options.vlans },
        execute: async (ctx): Promise<CliResult<VlanApplyResult>> => {
          const execution = await executeVlanApply(ctx.controller, {
            deviceName: options.device,
            vlansRaw: options.vlans,
          });

          if (!execution.ok) {
            return createErrorResult("vlan.apply", execution.error) as CliResult<VlanApplyResult>;
          }

          return createSuccessResult("vlan.apply", {
            device: execution.data.device,
            vlanIds: execution.data.vlanIds,
            commands: execution.data.commands,
            commandsGenerated: execution.data.commandsGenerated,
          }, {
            advice: execution.advice,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (!result.ok) process.exit(1);
    });

  command
    .command("trunk")
    .description("Configurar un enlace trunk en un switch")
    .requiredOption("--device <name>", "Dispositivo objetivo")
    .requiredOption("--interface <iface>", "Interfaz que será trunk")
    .requiredOption("--allowed <list>", "Lista de VLANs permitidas")
    .action(async (options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");

      if (globalExamples) {
        console.log(printExamples(VLAN_META));
        return;
      }

      if (globalExplain) {
        console.log(VLAN_META.longDescription ?? VLAN_META.summary);
        return;
      }

      if (globalPlan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Configurar interfaz ${options.interface} como trunk`);
        console.log(`  2. Permitir VLANs: ${options.allowed}`);
        console.log("  3. Generar comandos IOS");
        return;
      }

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: "text",
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: false,
        explain: globalExplain,
        plan: globalPlan,
        verify: false,
        timeout: null,
        noTimeout: false,
      };

      const result = await runCommand({
        action: "vlan.trunk",
        meta: VLAN_META,
        flags,
        payloadPreview: {
          device: options.device,
          interface: options.interface,
          allowed: options.allowed,
        },
        execute: async (ctx): Promise<CliResult<VlanTrunkResult>> => {
          const execution = await executeVlanTrunk(ctx.controller, {
            deviceName: options.device,
            iface: options.interface,
            allowedRaw: options.allowed,
          });

          if (!execution.ok) {
            return createErrorResult("vlan.trunk", execution.error) as CliResult<VlanTrunkResult>;
          }

          return createSuccessResult("vlan.trunk", execution.data, {
            advice: execution.advice,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (result.ok) {
        console.log(chalk.blue("\n➡️  Comandos para configurar trunk:"));
        const cmds = result.data?.commands as string[] | undefined;
        cmds?.forEach((cmd) => console.log(cmd));
      }

      if (!result.ok) process.exit(1);
    });

  command
    .command("ensure")
    .description("Crear VLANs en un dispositivo")
    .argument("<device>", "Nombre del dispositivo (ej: Switch1)")
    .option(
      "--vlan <id,name...>",
      "VLAN a crear en formato id,nombre (ej: 10,ADMIN). Puede especificarse múltiples veces",
    )
    .option("--examples", "Mostrar ejemplos de uso y salir", false)
    .option("--schema", "Mostrar schema JSON del resultado y salir", false)
    .option("--explain", "Explicar qué hace el comando y salir", false)
    .option("--plan", "Mostrar plan de ejecución sin ejecutar", false)
    .action(async (deviceName, options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalSchema = process.argv.includes("--schema");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");

      if (globalExamples) {
        const ensureExamples: CommandMeta = {
          ...VLAN_META,
          examples: [
            {
              command: "pt vlan ensure Switch1 --vlan 10,ADMIN --vlan 20,USERS",
              description: "Crear VLANs 10 y 20 en Switch1",
            },
            {
              command: "pt vlan ensure Router1 --vlan 100,SERVIDORES",
              description: "Crear VLAN 100 en Router1",
            },
          ],
        };
        console.log(printExamples(ensureExamples));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(VLAN_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log("Crea VLANs en un dispositivo. Cada --vlan acepta formato id,nombre.");
        return;
      }

      if (globalPlan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Validar dispositivo: ${deviceName}`);
        console.log("  2. Parsear lista de VLANs");
        console.log("  3. Ejecutar comandos IOS para crear VLANs");
        return;
      }

      const vlansOption = options.vlan;
      if (!vlansOption || (Array.isArray(vlansOption) && vlansOption.length === 0)) {
        console.error("Debes especificar al menos una VLAN con --vlan");
        process.exit(1);
      }

      const vlans = Array.isArray(vlansOption) ? vlansOption : [vlansOption];

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: "text",
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: true,
        timeout: null,
        noTimeout: false,
      };

      const result = await runCommand<VlanEnsureResult>({
        action: "vlan.ensure",
        meta: VLAN_META,
        flags,
        payloadPreview: { device: deviceName, vlans },
        execute: async (ctx): Promise<CliResult<VlanEnsureResult>> => {
          const execution = await executeVlanEnsure(ctx.controller, {
            deviceName,
            vlanSpecsRaw: vlans,
          });

          if (!execution.ok) {
            return createErrorResult("vlan.ensure", execution.error) as CliResult<VlanEnsureResult>;
          }

          return createSuccessResult("vlan.ensure", execution.data, {
            advice: execution.advice,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (!result.ok) process.exit(1);
    });

  command
    .command("config-interfaces")
    .description("Configurar interfaces SVI VLAN en un dispositivo")
    .argument("<device>", "Nombre del dispositivo (ej: Router1)")
    .option(
      "--interface <vlanId,ip,mask...>",
      "SVI a configurar en formato vlanId,ip,mask (ej: 10,192.168.10.1,255.255.255.0). Puede especificarse múltiples veces",
    )
    .option("--examples", "Mostrar ejemplos de uso y salir", false)
    .option("--schema", "Mostrar schema JSON del resultado y salir", false)
    .option("--explain", "Explicar qué hace el comando y salir", false)
    .option("--plan", "Mostrar plan de ejecución sin ejecutar", false)
    .action(async (deviceName, options) => {
      const globalExamples = process.argv.includes("--examples");
      const globalSchema = process.argv.includes("--schema");
      const globalExplain = process.argv.includes("--explain");
      const globalPlan = process.argv.includes("--plan");

      if (globalExamples) {
        const ifExamples: CommandMeta = {
          ...VLAN_META,
          examples: [
            {
              command:
                'pt vlan config-interfaces Router1 --interface "10,192.168.10.1,255.255.255.0"',
              description: "Configurar SVI para VLAN 10",
            },
            {
              command:
                'pt vlan config-interfaces Router1 --interface "10,192.168.10.1,255.255.255.0" --interface "20,192.168.20.1,255.255.255.0"',
              description: "Configurar múltiples SVIs",
            },
          ],
        };
        console.log(printExamples(ifExamples));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(VLAN_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(
          "Configura interfaces SVI (Switch Virtual Interface) para VLANs en un dispositivo router.",
        );
        return;
      }

      if (globalPlan) {
        console.log("Plan de ejecución:");
        console.log(`  1. Validar dispositivo: ${deviceName}`);
        console.log("  2. Parsear lista de interfaces SVI");
        console.log("  3. Ejecutar comandos IOS para configurar interfaces con VLANs");
        return;
      }

      const interfacesOption = options.interface;
      if (!interfacesOption || (Array.isArray(interfacesOption) && interfacesOption.length === 0)) {
        console.error("Debes especificar al menos una interfaz con --interface");
        process.exit(1);
      }

      const sviSpecs = Array.isArray(interfacesOption) ? interfacesOption : [interfacesOption];

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: "text",
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: false,
        timeout: null,
        noTimeout: false,
      };

      const result = await runCommand<VlanConfigInterfacesResult>({
        action: "vlan.config-interfaces",
        meta: VLAN_META,
        flags,
        payloadPreview: { device: deviceName, interfaces: sviSpecs },
        execute: async (ctx): Promise<CliResult<VlanConfigInterfacesResult>> => {
          const execution = await executeVlanConfigInterfaces(ctx.controller, {
            deviceName,
            interfaceSpecsRaw: sviSpecs,
          });

          if (!execution.ok) {
            return createErrorResult(
              "vlan.config-interfaces",
              execution.error,
            ) as CliResult<VlanConfigInterfacesResult>;
          }

          return createSuccessResult("vlan.config-interfaces", execution.data, {
            advice: execution.advice,
          });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (!result.ok) process.exit(1);
    });

  return command;
}

export { createLabVlanCommand };