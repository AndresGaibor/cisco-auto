#!/usr/bin/env bun
/**
 * Comando stp - Spanning Tree Protocol
 * Thin CLI wrapper que delega a pt-control/application/stp
 */

import { Command } from "commander";
import chalk from "chalk";

import type { CliResult } from "../contracts/cli-result.js";
import { createSuccessResult, createErrorResult } from "../contracts/cli-result.js";
import type { CommandMeta } from "../contracts/command-meta.js";

import { runCommand } from "../application/run-command.js";
import { renderCliResult } from "../ux/renderers.js";
import { printExamples } from "../ux/examples.js";
import { buildFlags, parseGlobalOptions } from "../flags-utils.js";

import {
  executeStpApply,
  executeStpSetRoot,
  parseVlanIdsFromString,
  parsePriority,
  type StpApplyResult,
  type StpRootResult,
} from "@cisco-auto/pt-control/application/stp";

const STP_EXAMPLES = [
  { command: "pt stp configure --device Switch1 --mode rapid-pvst", description: "Configurar modo STP" },
  { command: "pt stp set-root --device Switch1 --vlan 1", description: "Configurar como root bridge" },
  { command: "pt stp configure --device Switch1 --mode pvst --dry-run", description: "Ver comandos sin aplicar" },
];

const STP_META: CommandMeta = {
  id: "stp",
  summary: "Configurar Spanning Tree Protocol (STP)",
  longDescription: "Comandos para configurar STP en switches Cisco: modo STP y root bridge.",
  examples: STP_EXAMPLES,
  related: ["vlan", "config-ios", "etherchannel"],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

export function createStpCommand(): Command {
  const cmd = new Command("stp")
    .description("Comandos para configurar Spanning Tree Protocol (STP)")
    .option("--examples", "Mostrar ejemplos de uso", false)
    .option("--explain", "Explicar qué hace el comando", false)
    .option("--plan", "Mostrar plan de ejecución sin ejecutar", false);

  cmd.command("configure")
    .description("Configurar modo STP en un dispositivo")
    .requiredOption("--device <name>", "Nombre del dispositivo target")
    .requiredOption("--mode <mode>", "Modo STP (pvst|rapid-pvst|mst)")
    .option("--dry-run", "Imprimir comandos en lugar de enviarlos", false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(STP_META)); return; }
      if (explain) { console.log(STP_META.longDescription ?? STP_META.summary); return; }
      if (plan) { console.log("Plan: 1. Configurar modo STP, 2. Aplicar al dispositivo"); return; }

      const flags = buildFlags({ verify: true, explain, plan });
      const result = await runCommand({
        action: "stp.configure",
        meta: STP_META,
        flags,
        payloadPreview: { device: options.device, mode: options.mode },
        execute: async (ctx): Promise<CliResult<StpApplyResult>> => {
          const execution = await executeStpApply(
            ctx.controller,
            { deviceName: options.device, mode: options.mode as "pvst" | "rapid-pvst" | "mst" },
            options.dryRun,
          );
          if (!execution.ok) return createErrorResult("stp.configure", execution.error) as CliResult<StpApplyResult>;
          return createSuccessResult("stp.configure", execution.data, { advice: execution.advice });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (result.ok && options.dryRun && result.data?.commands) {
        console.log(chalk.cyan("\n[DRY-RUN] Comandos STP:\n"));
        result.data.commands.forEach((c, i) => console.log(`  ${i + 1}. ${chalk.green(c)}`));
        console.log();
      }
      if (!result.ok) process.exit(1);
    });

  cmd.command("set-root")
    .description("Configurar root bridge para una o más VLANs")
    .requiredOption("--device <name>", "Nombre del dispositivo target")
    .option("--vlan <id>", "ID de VLAN (múltiples separadas por coma)")
    .option("--priority <value>", "Prioridad (múltiplo de 4096)")
    .option("--root-primary", "Configurar como root primary", false)
    .option("--root-secondary", "Configurar como root secondary", false)
    .option("--file <path>", "Archivo de configuración YAML/JSON")
    .option("--dry-run", "Imprimir comandos en lugar de enviarlos", false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(STP_META)); return; }
      if (plan) {
        console.log("Plan: 1. Configurar root bridge, 2. Aplicar al dispositivo");
        return;
      }
      if (!options.vlan) { console.error(chalk.red("Error: --vlan requerido")); process.exit(1); }

      const vlanIds = parseVlanIdsFromString(options.vlan);
      if (vlanIds.length === 0) { console.error(chalk.red("Error: VLANs inválidas")); process.exit(1); }

      const flags = buildFlags({ verify: true, explain, plan });
      const result = await runCommand({
        action: "stp.set-root",
        meta: STP_META,
        flags,
        payloadPreview: { device: options.device, vlan: options.vlan, priority: options.priority },
        execute: async (ctx): Promise<CliResult<StpRootResult>> => {
          const execution = await executeStpSetRoot(ctx.controller, {
            deviceName: options.device,
            vlanIds,
            priority: parsePriority(options.priority),
            rootPrimary: options.rootPrimary,
            rootSecondary: options.rootSecondary,
          }, options.dryRun);
          if (!execution.ok) return createErrorResult("stp.set-root", execution.error) as CliResult<StpRootResult>;
          return createSuccessResult("stp.set-root", execution.data, { advice: execution.advice });
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);

      if (result.ok && options.dryRun && result.data?.commands) {
        console.log(chalk.cyan("\n[DRY-RUN] Comandos STP root:\n"));
        result.data.commands.forEach((c, i) => console.log(`  ${i + 1}. ${chalk.green(c)}`));
        console.log();
      }
      if (!result.ok) process.exit(1);
    });

  return cmd;
}