#!/usr/bin/env bun
/**
 * Comando device remove - Migrado a runCommand
 * Elimina un dispositivo de la topología de Packet Tracer
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { select, confirm } from '../../utils/inquirer.js';

import type { CliResult } from '../../contracts/cli-result.js';
import { createSuccessResult } from '../../contracts/cli-result.js';
import type { CommandMeta } from '../../contracts/command-meta.js';

import { runCommand } from '../../application/run-command.js';
import { printExamples } from '../../ux/examples.js';
import { renderCommandResult } from '../../application/render-command-result.js';
import { flagsFromCommand, flagEnabled } from '../../flags-utils.js';
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
    .option('--verify', 'Verificar cambios post-ejecución')
    .option('--no-verify', 'Omitir verificación post-ejecución')
    .option('--trace', 'Activar traza estructurada de la ejecución', false)
    .option('--trace-bundle', 'Generar archivo bundle único para debugging', false)
    .action(async (name, options, command) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');
      const verifyEnabled = flagEnabled(options.verify, {
        defaultValue: true,
        positive: '--verify',
        negative: '--no-verify',
      });

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

      const flags = flagsFromCommand(command, {
        verify: verifyEnabled,
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

            if (globalPlan) {
              await requireDeviceExists(controller, deviceName);

              return createSuccessResult('device.remove', {
                name: deviceName,
                removed: false,
              }, {
                advice: [
                  `Plan validado: el dispositivo '${deviceName}' existe.`,
                  `Eliminaría '${deviceName}' de la topología.`,
                ],
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

            await (
              !verifyEnabled && !globalPlan && typeof (controller as any).removeDeviceUnchecked === 'function'
                ? (controller as any).removeDeviceUnchecked(deviceName)
                : controller.removeDevice(deviceName)
            );

            if (verifyEnabled) {
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
          }
        },
      });

      renderCommandResult({
        result,
        flags,
        nextSteps: ['bun run pt device list'],
      });
    });

  return cmd;
}
