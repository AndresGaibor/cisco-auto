#!/usr/bin/env bun
/**
 * Comando link add - Migrado a runCommand
 * Crea un enlace entre dos dispositivos en Packet Tracer
 */

import { Command } from 'commander';
import type { PTController } from '@cisco-auto/pt-control';
import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';

import type { CliResult } from '../../contracts/cli-result.js';
import { createSuccessResult, createVerifiedResult } from '../../contracts/cli-result.js';
import type { GlobalFlags } from '../../flags.js';

import { runCommand } from '../../application/run-command.js';
import { verifyLink, buildLinkVerificationChecks } from '../../application/verify-link.js';
import { renderCliResult } from '../../ux/renderers.js';
import { printExamples } from '../../ux/examples.js';
import { formatNextSteps } from '../../ux/next-steps.js';
import { fetchDeviceList, formatDevice } from '../../utils/device-utils.js';
import { parsePortSpec } from '../../utils/port-parser.js';
import { LINK_ADD_META } from './meta.js';

interface LinkAddResult {
  endpointA: string;
  portA: string;
  endpointB: string;
  portB: string;
  linkType: string;
}

export function createLinkAddCommand(): Command {
  const cmd = new Command('add')
    .description('Agregar una conexión entre dos dispositivos')
    .argument('[device1]', 'Primer dispositivo (ej: R1)')
    .argument('[port1]', 'Puerto del primer dispositivo (ej: Gi0/0)')
    .argument('[device2]', 'Segundo dispositivo (ej: S1)')
    .argument('[port2]', 'Puerto del segundo dispositivo (ej: Fa0/1)')
    .option('-t, --type <type>', 'Tipo de conexión (auto, copper_straight, copper_crossover)', 'auto')
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false)
    .option('--verify', 'Verificar cambios post-ejecución', true)
    .option('--no-verify', 'Omitir verificación post-ejecución', false)
    .option('--trace', 'Activar traza estructurada de la ejecución', false)
    .option('--trace-bundle', 'Generar archivo bundle único para debugging', false)
    .action(async (device1, port1, device2, port2, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');
      const globalTrace = process.argv.includes('--trace');
      const globalTraceBundle = process.argv.includes('--trace-bundle');

      const verifyEnabled = options.verify ?? true;

      if (globalExamples) {
        console.log(printExamples(LINK_ADD_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(LINK_ADD_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(LINK_ADD_META.longDescription ?? LINK_ADD_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Conectar ${device1 ?? '<device1>'}:${port1 ?? '<port1>'} con ${device2 ?? '<device2>'}:${port2 ?? '<port2>'}`);
        console.log(`  2. Tipo de cable: ${options.type ?? 'auto'}`);
        console.log('  3. Verificar que la conexión se estableció correctamente');
        return;
      }

      let dev1 = device1;
      let p1 = port1;
      let dev2 = device2;
      let p2 = port2;
      const linkType = options.type ?? 'auto';

      const flags: GlobalFlags = {
        json: false,
        jq: null,
        output: 'text',
        verbose: false,
        quiet: false,
        trace: globalTrace,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: globalTraceBundle,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: verifyEnabled,
      };

      const result = await runCommand<LinkAddResult>({
        action: 'link.add',
        meta: LINK_ADD_META,
        flags,
        payloadPreview: {
          device1: dev1,
          port1: p1,
          device2: dev2,
          port2: p2,
          linkType,
        },
        execute: async (ctx): Promise<CliResult<LinkAddResult>> => {
          const { controller, logPhase } = ctx;

          await controller.start();

          try {
            if (!dev1 || !p1 || !dev2 || !p2) {
              const devices = await fetchDeviceList(controller);
              const deviceChoices = devices.map((d) => ({
                name: formatDevice(d),
                value: d.name,
              }));

              if (!dev1) {
                dev1 = await select({
                  message: 'Selecciona el primer dispositivo',
                  choices: deviceChoices,
                });
              }

              if (!p1) {
                p1 = await input({
                  message: `Puerto de ${chalk.cyan(dev1)} (ej: Gi0/0, Fa0/1)`,
                  validate: (value) => {
                    try {
                      parsePortSpec(value);
                      return true;
                    } catch {
                      return 'Puerto inválido';
                    }
                  },
                });
              }

              if (!dev2) {
                dev2 = await select({
                  message: 'Selecciona el segundo dispositivo',
                  choices: deviceChoices.filter((d) => d.value !== dev1),
                });
              }

              if (!p2) {
                p2 = await input({
                  message: `Puerto de ${chalk.cyan(dev2)} (ej: Gi0/0, Fa0/1)`,
                  validate: (value) => {
                    try {
                      parsePortSpec(value);
                      return true;
                    } catch {
                      return 'Puerto inválido';
                    }
                  },
                });
              }
            }

            try {
              // Aceptar tanto "device:port" como solo "port"
              const portPattern = /^([A-Za-z][A-Za-z0-9_-]*):(.+)$/;
              if (!portPattern.test(p1) && !portPattern.test(p2)) {
                // Ambos son puertos simples, está bien
              } else if (portPattern.test(p1) || portPattern.test(p2)) {
                // Si uno tiene formato device:port, el otro también debe tener
                if (!portPattern.test(p1) || !portPattern.test(p2)) {
                  throw new Error('Si especificas dispositivo:puerto, hazlo en ambos');
                }
              }
            } catch (error) {
              throw new Error(`Especificación de puerto inválida: ${error instanceof Error ? error.message : 'error desconocido'}`);
            }

            // Validar que los dispositivos existan
            const dev1Info = await controller.inspectDevice(dev1);
            if (!dev1Info || !dev1Info.name) {
              throw new Error(`Dispositivo '${dev1}' no encontrado. Usa 'pt device list' para ver dispositivos disponibles.`);
            }

            const dev2Info = await controller.inspectDevice(dev2);
            if (!dev2Info || !dev2Info.name) {
              throw new Error(`Dispositivo '${dev2}' no encontrado. Usa 'pt device list' para ver dispositivos disponibles.`);
            }

            // Validar que los puertos existan en los dispositivos
            const port1Exists = dev1Info.ports?.some(
              (p) => p.name.toLowerCase() === p1.toLowerCase()
            );
            if (!port1Exists) {
              throw new Error(`Puerto '${p1}' no existe en '${dev1}'. Usa 'pt device get ${dev1}' para ver puertos disponibles.`);
            }

            const port2Exists = dev2Info.ports?.some(
              (p) => p.name.toLowerCase() === p2.toLowerCase()
            );
            if (!port2Exists) {
              throw new Error(`Puerto '${p2}' no existe en '${dev2}'. Usa 'pt device get ${dev2}' para ver puertos disponibles.`);
            }

            await logPhase('apply', {
              device1: dev1,
              port1: p1,
              device2: dev2,
              port2: p2,
              linkType,
            });

            await controller.addLink(dev1, p1, dev2, p2, linkType);

            if (verifyEnabled) {
              await logPhase('verify', { device1: dev1, port1: p1, device2: dev2, port2: p2 });

              const verificationData = await verifyLink(controller, dev1, p1, dev2, p2);
              const checks = buildLinkVerificationChecks(verificationData);
              const allPassed = checks.every((check) => check.ok);

              const resultData: LinkAddResult = {
                endpointA: `${dev1}:${p1}`,
                portA: p1,
                endpointB: `${dev2}:${p2}`,
                portB: p2,
                linkType,
              };

              return createVerifiedResult('link.add', resultData, {
                verified: allPassed,
                checks: checks.map((c) => ({ name: c.name, ok: c.ok, details: c.details })),
              });
            }

            const resultData: LinkAddResult = {
              endpointA: `${dev1}:${p1}`,
              portA: p1,
              endpointB: `${dev2}:${p2}`,
              portB: p2,
              linkType,
            };

            return createSuccessResult('link.add', resultData, {
              advice: [
                'Ejecuta bun run pt link list para verificar la conexión',
              ],
            });
          } finally {
            await controller.stop();
          }
        },
      });

      const output = renderCliResult(result, flags.output);

      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (result.ok && result.data) {
        const nextSteps = [
          'bun run pt link list',
          `bun run pt device get ${dev1}`,
          `bun run pt device get ${dev2}`,
        ];
        if (!flags.quiet) {
          console.log(formatNextSteps(nextSteps));
        }
      }

      if (!result.ok) {
        process.exit(1);
      }
    });

  return cmd;
}
