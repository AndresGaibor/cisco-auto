#!/usr/bin/env bun
/**
 * Comando device remove - Migrado a runCommand
 * Elimina un dispositivo de la topología de Packet Tracer
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { select, confirm } from '@inquirer/prompts';

import type { CliResult } from '../../contracts/cli-result.js';
import { createSuccessResult } from '../../contracts/cli-result.js';
import type { CommandMeta } from '../../contracts/command-meta.js';
import type { GlobalFlags } from '../../flags.js';

import { runCommand } from '../../application/run-command.js';
import { renderCliResult } from '../../ux/renderers.js';
import { printExamples } from '../../ux/examples.js';
import { formatNextSteps } from '../../ux/next-steps.js';
import { buildFlags } from '../../flags-utils.js';
import { DeviceNotFoundError, fetchDeviceList, formatDevice, requireDeviceExists } from '../../utils/device-utils.js';

interface DeviceRemoveResult {
  name: string;
  removed: boolean;
}

export const DEVICE_REMOVE_META: CommandMeta = {
  id: 'device.remove',
  summary: 'Eliminar un dispositivo de la topología',
  longDescription: 'Elimina un dispositivo de la topología de Packet Tracer. El dispositivo no puede tener conexiones activas.',
  examples: [
    {
      command: 'bun run pt device remove R1',
      description: 'Eliminar router R1'
    },
    {
      command: 'bun run pt device remove S1 --force',
      description: 'Eliminar switch S1 sin confirmación'
    }
  ],
  related: [
    'bun run pt device list',
    'bun run pt device add',
    'bun run pt device get'
  ],
  nextSteps: [
    'bun run pt device list'
  ],
  tags: ['device', 'remove', 'delete', 'network'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true
};

export function createDeviceRemoveCommand(): Command {
  const cmd = new Command('remove')
    .description('Eliminar un dispositivo de la topología')
    .argument('[name]', 'Nombre del dispositivo a eliminar')
    .option('-f, --force', 'Eliminar sin confirmación', false)
    .option('-i, --interactive', 'Seleccionar el dispositivo de forma interactiva', false)
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false)
    .option('--trace', 'Activar traza estructurada de la ejecución', false)
    .option('--trace-bundle', 'Generar archivo bundle único para debugging', false)
    .action(async (name, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');
      const globalTrace = process.argv.includes('--trace');
      const globalTraceBundle = process.argv.includes('--trace-bundle');

      if (globalExamples) {
        console.log(printExamples(DEVICE_REMOVE_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(DEVICE_REMOVE_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(DEVICE_REMOVE_META.longDescription ?? DEVICE_REMOVE_META.summary);
        return;
      }

      let deviceName = name;

      const flags = buildFlags({
        json: process.argv.includes('--json'),
        output: process.argv.includes('--json') ? 'json' : 'text',
        trace: globalTrace,
        traceBundle: globalTraceBundle,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: true,
      });

      const result = await runCommand<DeviceRemoveResult>({
        action: 'device.remove',
        meta: DEVICE_REMOVE_META,
        flags,
        payloadPreview: {
          name: deviceName,
        },
        execute: async (ctx): Promise<CliResult<DeviceRemoveResult>> => {
          const { controller, logPhase } = ctx;

          await controller.start();

          try {
            if (!deviceName && !options.interactive) {
              throw new Error('Debes pasar el nombre del dispositivo o usar --interactive');
            }

            if (!deviceName) {
              await logPhase('discover', {});
              const devices = await fetchDeviceList(controller);

              if (devices.length === 0) {
                return createSuccessResult('device.remove', {
                  name: '',
                  removed: false,
                }, {
                  advice: ['No hay dispositivos en la topología'],
                });
              }

              deviceName = await select({
                message: 'Selecciona un dispositivo para eliminar',
                choices: devices.map((d) => ({
                  name: formatDevice(d),
                  value: d.name,
                })),
              });
            }

            if (!deviceName?.trim()) {
              throw new Error('El nombre del dispositivo es requerido');
            }

            await requireDeviceExists(controller, deviceName);

            if (globalPlan) {
              console.log('\nPlan de ejecución:');
              console.log(`  1. Eliminar dispositivo ${deviceName}`);
              console.log('  2. Verificar que el dispositivo fue eliminado');
              return createSuccessResult('device.remove', {
                name: deviceName,
                removed: false,
              });
            }

            if (options.interactive && !options.force) {
              const confirmed = await confirm({
                message: `¿Eliminar dispositivo "${chalk.red(deviceName)}"?`,
                default: false,
              });

              if (!confirmed) {
                return createSuccessResult('device.remove', {
                  name: deviceName,
                  removed: false,
                }, {
                  advice: ['Operación cancelada'],
                });
              }
            }

            await logPhase('apply', { name: deviceName });

            await controller.removeDevice(deviceName);

            await logPhase('verify', { name: deviceName });

            const devicesAfter = await fetchDeviceList(controller);
            const stillExists = devicesAfter.some((d) => d.name === deviceName);

            if (stillExists) {
              return createSuccessResult('device.remove', {
                name: deviceName,
                removed: false,
              }, {
                warnings: ['El dispositivo aún existe después de eliminarlo'],
              });
            }

            return createSuccessResult('device.remove', {
              name: deviceName,
              removed: true,
            }, {
              advice: [
                'Ejecuta bun run pt device list para verificar',
              ],
            });
          } catch (error) {
            if (error instanceof DeviceNotFoundError) {
              return {
                schemaVersion: '1.0',
                ok: false,
                action: 'device.remove',
                error: {
                  code: error.code,
                  message: error.message,
                  details: error.toDetails(),
                },
                advice: error.toAdvice(),
              } as CliResult<DeviceRemoveResult>;
            }

            throw error;
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
          'bun run pt device list',
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
