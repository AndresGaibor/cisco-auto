#!/usr/bin/env bun
/**
 * Comando acl - Gestión de Access Control Lists
 * Thin CLI wrapper que delega a pt-control/application/acl
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
  executeAclCreate,
  executeAclAddRule,
  executeAclApply,
} from "@cisco-auto/pt-control/application/acl";

interface AclCreateResult {
  name: string;
  type: string;
  commands: string[];
  commandsGenerated: number;
}

interface AclApplyResult {
  acl: string;
  device: string;
  interface: string;
  direction: string;
  commands: string[];
  commandsGenerated: number;
}

const ACL_EXAMPLES = [
  { command: "pt acl create --name MiACL --type standard", description: "Crear ACL estándar vacía" },
  { command: 'pt acl add-rule --acl MiACL --rule "permit ip any any"', description: "Agregar regla permit" },
  { command: "pt acl apply --acl MiACL --device R1 --interface Gi0/0 --direction in", description: "Aplicar ACL a interfaz" },
];

const ACL_META: CommandMeta = {
  id: "acl",
  summary: "Gestionar Access Control Lists (ACLs)",
  longDescription: "Comandos para crear, agregar reglas y aplicar ACLs a interfaces de dispositivos Cisco.",
  examples: ACL_EXAMPLES,
  related: ["config-ios", "show", "vlan"],
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

export function createAclCommand(): Command {
  const command = new Command("acl").description("Gestionar ACLs");
  const { examples, explain, plan, buildFlags: bf, parseGlobalOptions: pgo } = { examples: false, explain: false, plan: false, buildFlags, parseGlobalOptions };

  const createCmd = new Command("create")
    .description("Crear una ACL")
    .requiredOption("--name <name>", "Nombre de la ACL")
    .requiredOption("--type <type>", "Tipo (standard|extended)")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(ACL_META)); return; }
      if (explain) { console.log(ACL_META.longDescription ?? ACL_META.summary); return; }
      if (plan) { console.log(`Plan: 1. Crear ACL ${options.name}, 2. Generar estructura IOS`); return; }

      const flags = buildFlags({ examples, explain, plan });
      const result = await runCommand({
        action: "acl.create", meta: ACL_META, flags,
        payloadPreview: { name: options.name, type: options.type },
        execute: async (ctx): Promise<CliResult<AclCreateResult>> => {
          const execution = await executeAclCreate(ctx.controller, { name: options.name, type: options.type as "standard" | "extended" });
          if (!execution.ok) return createErrorResult("acl.create", execution.error);
          return createSuccessResult("acl.create", execution.data, { advice: execution.advice });
        },
      });
      renderResult(result, flags);
      if (result.ok) { console.log(chalk.blue("\n➡️  Comandos IOS:")); result.data?.commands?.forEach((c: string) => console.log(c)); }
    });

  const addRuleCmd = new Command("add-rule")
    .description("Agregar regla a una ACL")
    .requiredOption("--acl <name>", "Nombre de la ACL")
    .requiredOption("--rule <rule>", "Regla (e.g., permit ip any any)")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(ACL_META)); return; }
      if (plan) { console.log(`Plan: 1. Agregar regla a ACL ${options.acl}`); return; }

      const flags = buildFlags({ examples, explain, plan });
      const result = await runCommand({
        action: "acl.add-rule", meta: ACL_META, flags,
        payloadPreview: { acl: options.acl, rule: options.rule },
        execute: async (ctx) => {
          const execution = await executeAclAddRule(ctx.controller, { aclName: options.acl, rule: options.rule });
          if (!execution.ok) return createErrorResult("acl.add-rule", execution.error);
          return createSuccessResult("acl.add-rule", execution.data);
        },
      });
      renderResult(result, flags);
    });

  const applyCmd = new Command("apply")
    .description("Aplicar ACL a una interfaz")
    .requiredOption("--acl <name>", "Nombre de la ACL")
    .requiredOption("--device <name>", "Dispositivo")
    .requiredOption("--interface <name>", "Interfaz")
    .requiredOption("--direction <dir>", "Dirección (in|out)")
    .option("--examples", "Mostrar ejemplos", false)
    .option("--explain", "Explicar", false)
    .option("--plan", "Mostrar plan", false)
    .action(async (options) => {
      const { examples, explain, plan } = parseGlobalOptions();
      if (examples) { console.log(printExamples(ACL_META)); return; }
      if (explain) { console.log(ACL_META.longDescription ?? ACL_META.summary); return; }
      if (plan) { console.log(`Plan: 1. Aplicar ACL ${options.acl} a ${options.device} ${options.interface} ${options.direction}`); return; }

      const flags = buildFlags({ examples, explain, plan });
      const result = await runCommand({
        action: "acl.apply", meta: ACL_META, flags,
        payloadPreview: { acl: options.acl, device: options.device, interface: options.interface, direction: options.direction },
        execute: async (ctx): Promise<CliResult<AclApplyResult>> => {
const execution = await executeAclApply(ctx.controller, {
            aclName: options.acl,
            deviceName: options.device,
            interface: options.interface,
            direction: options.direction as "in" | "out"
          });
          if (!execution.ok) return createErrorResult("acl.apply", execution.error);
          return createSuccessResult("acl.apply", execution.data, { advice: execution.advice });
        },
      });
      renderResult(result, flags);
    });

  command.addCommand(createCmd);
  command.addCommand(addRuleCmd);
  command.addCommand(applyCmd);
  return command;
}

export const createACLCommand = createAclCommand;
