#!/usr/bin/env bun
/**
 * Comando vlan - Gestión de VLANs en Packet Tracer
 * Thin CLI wrapper que genera comandos VLAN
 */

import { Command } from "commander";
import chalk from "chalk";

import type { CliResult } from "../contracts/cli-result.js";
import { createSuccessResult, createErrorResult } from "../contracts/cli-result.js";
import type { CommandMeta } from "../contracts/command-meta.js";

import { runCommand } from "../application/run-command.js";
import { renderCliResult } from "../ux/renderers.ts";
import { printExamples } from "../ux/examples.js";
import { buildFlags, parseGlobalOptions } from "../flags-utils.js";

import {
  buildVlanCreateCommands,
  buildVlanApplyCommands,
  buildVlanEnsureCommands,
  buildVlanTrunkCommands,
} from "@cisco-auto/pt-control/application/vlan";

const VLAN_EXAMPLES = [
  { command: "pt vlan create --name SERVIDORES --id 100", description: "Crear VLAN 100 llamada SERVIDORES" },
  { command: "pt vlan apply --device Switch1 --vlans 10,20,30", description: "Aplicar VLANs a un switch" },
  { command: "pt vlan trunk --device Switch1 --interface Gi0/1 --allowed 10,20", description: "Configurar trunk con VLANs permitidas" },
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

function renderResult(result: CliResult, flags: { quiet: boolean; output: "text" | "json" | "table" | "raw" }): void {
  const output = renderCliResult(result, flags.output);
  if (!flags.quiet || !result.ok) console.log(output);
  if (!result.ok) process.exit(1);
}

export function createVlanCommand(): Command {
  const command = new Command("vlan").description("Comandos para gestionar VLANs");

  // vlan create
  const createCmd = new Command("create")
    .description("Generar comandos IOS para crear una VLAN")
    .requiredOption("--name <name>", "Nombre de la VLAN")
    .requiredOption("--id <id>", "ID de la VLAN (1-4094)")
    .option("--description <text>", "Descripción opcional de la VLAN")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .option("--schema", "Mostrar schema JSON", false)
    .action(async (options) => {
      const { examples, explain, plan, schema } = parseGlobalOptions();
      if (examples) { console.log(printExamples(VLAN_META)); return; }
      if (schema) { console.log(JSON.stringify(VLAN_META, null, 2)); return; }
      if (explain) { console.log(VLAN_META.longDescription ?? VLAN_META.summary); return; }
      if (plan) { console.log(`Plan: 1. Crear VLAN ${options.id} "${options.name}", 2. Generar comandos IOS`); return; }

      const flags = buildFlags({ examples, explain, plan, verify: false });
      const result = await runCommand({
        action: "vlan.create", meta: VLAN_META, flags,
        payloadPreview: { name: options.name, id: options.id },
        execute: async () => {
          try {
            const id = Number(options.id);
            if (Number.isNaN(id) || id < 1 || id > 4094) {
              return createErrorResult("vlan.create", { message: "El ID de VLAN debe ser un número entre 1 y 4094" });
            }
            const commands = buildVlanCreateCommands(options.name, id, options.description);
            return createSuccessResult("vlan.create", { vlanId: id, name: options.name, description: options.description, commands }, {
              advice: ["Usa pt config-ios <device> para aplicar estos comandos"],
            });
          } catch (error) {
            return createErrorResult("vlan.create", { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      renderResult(result, flags);
      if (result.ok) {
        console.log(chalk.blue("\n➡️  Comandos VLAN generados:"));
        result.data?.commands?.forEach((cmd: string) => console.log(cmd));
      }
    });

  // vlan apply
  const applyCmd = new Command("apply")
    .description("Generar comandos para aplicar VLANs a un switch")
    .requiredOption("--device <name>", "Nombre del dispositivo destino")
    .requiredOption("--vlans <list>", "Lista de IDs de VLAN separadas por comas")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(VLAN_META)); return; }
      if (explain) { console.log(VLAN_META.longDescription ?? VLAN_META.summary); return; }
      if (plan) { console.log(`Plan: 1. Validar ${options.vlans}, 2. Generar IOS, 3. Aplicar a ${options.device}`); return; }

      const flags = buildFlags({ examples, explain, plan, verify: true });
      const result = await runCommand({
        action: "vlan.apply", meta: VLAN_META, flags,
        payloadPreview: { device: options.device, vlans: options.vlans },
        execute: async (ctx) => {
          try {
            const vlanIds = options.vlans.split(",").map((v: string) => Number(v.trim())).filter((n: number) => !Number.isNaN(n));
            const commands = buildVlanApplyCommands(vlanIds as any, {} as any).slice(1);
            await ctx.controller.configIos(options.device, commands);
            return createSuccessResult("vlan.apply", { device: options.device, vlanIds, commands, commandsGenerated: commands.length });
          } catch (error) {
            return createErrorResult("vlan.apply", { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });
      renderResult(result, flags);
    });

  // vlan trunk
  const trunkCmd = new Command("trunk")
    .description("Generar comandos para configurar VLANs en-trunk")
    .requiredOption("--device <name>", "Nombre del switch")
    .requiredOption("--interface <name>", "Interfaz (e.g., Gi0/1)")
    .option("--allowed <list>", "VLANs permitidas (e.g., 10,20)")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(VLAN_META)); return; }
      if (explain) { console.log(VLAN_META.longDescription ?? VLAN_META.summary); return; }
      if (plan) { console.log(`Plan: 1. Generar comandos trunk para ${options.interface}`); return; }

      const flags = buildFlags({ examples, explain, plan, verify: true });
      const result = await runCommand({
        action: "vlan.trunk", meta: VLAN_META, flags,
        payloadPreview: { device: options.device, interface: options.interface, allowed: options.allowed },
        execute: async (ctx) => {
          try {
            const vlanIds = options.allowed?.split(",").map((v: string) => Number(v.trim())).filter((n: number) => !Number.isNaN(n)) ?? [];
            const commands = buildVlanTrunkCommands(options.interface, vlanIds as any, {} as any);
            await ctx.controller.configIos(options.device, commands.slice(1));
            return createSuccessResult("vlan.trunk", { device: options.device, interface: options.interface, allowedVlans: vlanIds, commands: commands.slice(1) });
          } catch (error) {
            return createErrorResult("vlan.trunk", { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });
      renderResult(result, flags);
    });

  command.addCommand(createCmd);
  command.addCommand(applyCmd);
  command.addCommand(trunkCmd);

  return command;
}
