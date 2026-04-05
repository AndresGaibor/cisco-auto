#!/usr/bin/env bun
/**
 * Comando acl - Gestión de Access Control Lists
 * Migrado al patrón runCommand con CliResult
 */

import { Command } from 'commander';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { renderCliResult } from '../ux/renderers.js';
import { printExamples } from '../ux/examples.js';
import { SecurityGenerator } from '@cisco-auto/core';

const ACL_EXAMPLES = [
  { command: 'pt acl create --name MiACL --type standard', description: 'Crear ACL estándar vacía' },
  { command: 'pt acl add-rule --acl MiACL --rule "permit ip any any"', description: 'Agregar regla permit' },
  { command: 'pt acl apply --acl MiACL --device R1 --interface Gi0/0 --direction in', description: 'Aplicar ACL a interfaz' },
];

const ACL_META: CommandMeta = {
  id: 'acl',
  summary: 'Gestionar Access Control Lists (ACLs)',
  longDescription: 'Comandos para crear, agregar reglas y aplicar ACLs a interfaces de dispositivos Cisco.',
  examples: ACL_EXAMPLES,
  related: ['config-ios', 'show', 'routing'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

export function createACLCommand(): Command {
  const cmd = new Command('acl')
    .description('Comandos para gestionar ACLs')
    .option('--examples', 'Mostrar ejemplos de uso', false)
    .option('--explain', 'Explicar qué hace el comando', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false);

  cmd.command('create')
    .description('Crear una ACL')
    .requiredOption('--name <name>', 'Nombre de la ACL')
    .requiredOption('--type <type>', 'Tipo de ACL (standard|extended)')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(ACL_META));
        return;
      }

      if (globalExplain) {
        console.log(ACL_META.longDescription ?? ACL_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Crear ACL ${options.name} de tipo ${options.type}`);
        console.log('  2. Generar estructura IOS');
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: false,
      };

      const result = await runCommand({
        action: 'acl.create',
        meta: ACL_META,
        flags,
        payloadPreview: { name: options.name, type: options.type },
        execute: async (): Promise<CliResult<{ name: string; type: string; commands: string[] }>> => {
          try {
            const name = options.name;
            const type = options.type === 'extended' ? 'extended' : 'standard';
            const acls = [{ name, type, entries: [] }];
            const commands = SecurityGenerator.generateACLs(acls as any);

            return createSuccessResult('acl.create', {
              name,
              type,
              commands,
            }, { advice: ['Usa pt acl add-rule para agregar reglas'] });
          } catch (error) {
            return createErrorResult('acl.create', { message: error instanceof Error ? error.message : String(error) }) as CliResult<{ name: string; type: string; commands: string[] }>;
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (result.ok) {
        console.log(chalk.blue('\n➡️  Comandos IOS:'));
        const cmds = result.data?.commands as string[] | undefined;
        cmds?.forEach(c => console.log(c));
      }
      if (!result.ok) process.exit(1);
    });

  cmd.command('add-rule')
    .description('Agregar una regla a una ACL')
    .requiredOption('--acl <name>', 'Nombre de la ACL')
    .requiredOption('--rule <rule>', 'Regla en formato: "<action> <protocol> <source> <dest>"')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(ACL_META));
        return;
      }

      if (globalExplain) {
        console.log(ACL_META.longDescription ?? ACL_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Agregar regla a ACL ${options.acl}`);
        console.log(`  2. Regla: ${options.rule}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: false,
      };

      const result = await runCommand({
        action: 'acl.add-rule',
        meta: ACL_META,
        flags,
        payloadPreview: { acl: options.acl, rule: options.rule },
        execute: async (): Promise<CliResult> => {
          try {
            const cmdLine = `access-list ${options.acl} ${options.rule}`;
            return createSuccessResult('acl.add-rule', { acl: options.acl, command: cmdLine });
          } catch (error) {
            return createErrorResult('acl.add-rule', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  cmd.command('apply')
    .description('Aplicar una ACL a una interfaz')
    .requiredOption('--acl <name>', 'Nombre o número de la ACL')
    .requiredOption('--device <device>', 'Nombre del dispositivo destino')
    .requiredOption('--interface <iface>', 'Interfaz donde aplicar la ACL')
    .requiredOption('--direction <dir>', 'Dirección de la ACL (in|out)')
    .option('--examples', 'Mostrar ejemplos', false)
    .option('--explain', 'Explicar', false)
    .option('--plan', 'Mostrar plan', false)
    .action(async (options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log(printExamples(ACL_META));
        return;
      }

      if (globalExplain) {
        console.log(ACL_META.longDescription ?? ACL_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Generar comandos para aplicar ACL ${options.acl}`);
        console.log(`  2. Aplicar a ${options.device} interfaz ${options.interface} dirección ${options.direction}`);
        return;
      }

      const flags: GlobalFlags = {
        json: false, jq: null, output: 'text', verbose: false, quiet: false,
        trace: false, tracePayload: false, traceResult: false, traceDir: null,
        traceBundle: false, traceBundlePath: null, sessionId: null,
        examples: globalExamples, schema: false, explain: globalExplain, plan: globalPlan, verify: true,
      };

      const result = await runCommand({
        action: 'acl.apply',
        meta: ACL_META,
        flags,
        payloadPreview: { acl: options.acl, device: options.device, interface: options.interface, direction: options.direction },
        execute: async (ctx): Promise<CliResult> => {
          try {
            const commands = [`interface ${options.interface}`, `ip access-group ${options.acl} ${options.direction}`];

            await ctx.controller.start();
            try {
              await ctx.controller.configIos(options.device, commands);
              await ctx.logPhase('verify', { device: options.device, interface: options.interface });
              return createSuccessResult('acl.apply', {
                acl: options.acl,
                device: options.device,
                interface: options.interface,
                direction: options.direction,
                commands,
              }, { advice: [`Usa pt show run-config ${options.device} para verificar`] });
            } finally {
              await ctx.controller.stop();
            }
          } catch (error) {
            return createErrorResult('acl.apply', { message: error instanceof Error ? error.message : String(error) });
          }
        },
      });

      const output = renderCliResult(result, flags.output);
      if (!flags.quiet || !result.ok) console.log(output);
      if (!result.ok) process.exit(1);
    });

  return cmd;
}
