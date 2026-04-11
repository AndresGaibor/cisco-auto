#!/usr/bin/env bun
/**
 * Comando show-run: muestra la configuración running-config parseada de un dispositivo.
 * Usa el parser de Wave 3 para devolver JSON estructurado.
 */

import { Command } from 'commander';
import chalk from 'chalk';

import { runCommand } from '../application/run-command.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta, CommandExample } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';
import { formatOutput, applyJqFilter } from '../flags.js';

const SHOW_RUN_EXAMPLES: CommandExample[] = [
  { command: 'pt show-run R1', description: 'Mostrar running-config parseada de R1' },
  { command: 'pt show-run R1 --parse', description: 'Forzar parseo explícito de la configuración' },
  { command: 'pt show-run Router1 --json', description: 'Salida en formato JSON' },
  { command: 'pt show-run R1 --jq .hostname', description: 'Extraer solo el hostname' },
];

const SHOW_RUN_META: CommandMeta = {
  id: 'show-run',
  summary: 'Mostrar configuración running-config parseada de un dispositivo IOS',
  longDescription:
    'Ejecuta "show running-config" en el dispositivo y devuelve la configuración parseada en secciones estructuradas: hostname, version, interfaces, secciones de routing, ACLs, etc.',
  examples: SHOW_RUN_EXAMPLES,
  related: ['show', 'config-ios', 'history'],
  supportsVerify: false,
  supportsJson: true,
  supportsExplain: true,
};

export function createShowRunCommand(): Command {
  const showRunCmd = new Command('show-run')
    .description('Mostrar configuración running-config parseada')
    .argument('[device]', 'Nombre del dispositivo')
    .option('--parse', 'Forzar parseo explícito (comportamiento por defecto)')
    .option('--examples', 'Mostrar ejemplos de uso')
    .option('--schema', 'Mostrar schema del resultado')
    .option('--explain', 'Explicar qué hace el comando')
    .option('-j, --json', 'Salida en formato JSON')
    .option('--jq <filter>', 'Filtrar salida JSON')
    .option('-o, --output <format>', 'Formato de salida (json|yaml|table|text)', 'text')
    .action(async (device: string, options: Record<string, unknown>) => {
      if (options.examples) {
        console.log('Ejemplos de uso:');
        SHOW_RUN_EXAMPLES.forEach((ex) => {
          console.log(`  ${ex.command}`);
          console.log(`    → ${ex.description}`);
        });
        return;
      }

      if (options.schema) {
        console.log('Schema del resultado:');
        console.log(
          JSON.stringify(
            {
              type: 'object',
              properties: {
                hostname: { type: 'string' },
                version: { type: 'string' },
                sections: { type: 'array', items: { type: 'object', properties: { section: { type: 'string' }, content: { type: 'string' } } } },
                interfaces: { type: 'object', additionalProperties: { type: 'string' } },
                lines: { type: 'array', items: { type: 'string' } },
              },
            },
            null,
            2
          )
        );
        return;
      }

      if (options.explain) {
        console.log(`${SHOW_RUN_META.summary}`);
        console.log(`\n${SHOW_RUN_META.longDescription}`);
        return;
      }

      const flags: GlobalFlags = {
        json: Boolean(options.json),
        jq: options.jq as string | null,
        output: (options.output as GlobalFlags['output']) || 'text',
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: false,
        schema: false,
        explain: false,
        plan: false,
        verify: false,
        timeout: null,
        noTimeout: false,
      };

      const result = await runCommand({
        action: 'show:run',
        meta: SHOW_RUN_META,
        flags,
        payloadPreview: { device, parse: true },
        execute: async (ctx) => {
          if (!device) {
            return createErrorResult('show:run', {
              message: 'Se requiere un dispositivo. Usa: pt show-run <device>',
            });
          }

          await ctx.controller.start();

          try {
            // showRunningConfig ya parsea automáticamente la salida
            const data = await ctx.controller.showRunningConfig(device);

            if (flags.jq && data) {
              const filtered = applyJqFilter(data, flags.jq);
              return createSuccessResult('show:run', filtered, {
                entityType: 'show',
                examples: SHOW_RUN_EXAMPLES.map((ex) => ex.command),
              });
            }

            return createSuccessResult('show:run', data, {
              entityType: 'show',
              advice: [
                `Hostname detectado: ${data.hostname || 'no disponible'}`,
                `Secciones encontradas: ${data.sections?.length || 0}`,
                `Interfaces configuradas: ${Object.keys(data.interfaces || {}).length}`,
              ],
              examples: SHOW_RUN_EXAMPLES.map((ex) => ex.command),
            });
          } finally {
            await ctx.controller.stop();
          }
        },
      });

      if (result.ok) {
        if (flags.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(formatOutput(result.data, flags.output));
        }
      } else {
        console.error(`${chalk.red('✗')} Error: ${result.error?.message}`);
        process.exit(1);
      }
    });

  showRunCmd.addHelpText(
    'after',
    `
Ejemplos:
  pt show-run R1
  pt show-run R1 --json
  pt show-run Router1 --jq .hostname

Flags de información:
  --examples    Mostrar ejemplos de uso
  --schema      Mostrar schema del resultado
  --explain     Explicar el comando
  --json        Salida en JSON
  --jq <expr>   Filtrar resultado con expresión jq
`
  );

  return showRunCmd;
}
