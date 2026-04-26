#!/usr/bin/env bun
/**
 * Comando device move - Migrado a runCommand
 * Mueve un dispositivo a una nueva posición en Packet Tracer
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { select } from '@inquirer/prompts';

import type { CliResult } from '../../contracts/cli-result.js';
import { createSuccessResult, createVerifiedResult } from '../../contracts/cli-result.js';
import type { CommandMeta } from '../../contracts/command-meta.js';

import { runCommand } from '../../application/run-command.js';
import { renderCliResult } from '../../ux/renderers.js';
import { printExamples } from '../../ux/examples.js';
import { formatNextSteps } from '../../ux/next-steps.js';
import { buildFlags } from '../../flags-utils.js';
import { DeviceNotFoundError, fetchDeviceList, formatDevice, requireDeviceExists } from '../../utils/device-utils.js';

interface DeviceMoveResult {
  name: string;
  x: number;
  y: number;
  previousX?: number;
  previousY?: number;
}

export const DEVICE_MOVE_META: CommandMeta = {
  id: 'device.move',
  summary: 'Mover un dispositivo a nueva posición',
  longDescription: 'Mueve un dispositivo a las coordenadas especificadas en el canvas de Packet Tracer.',
  examples: [
    {
      command: 'bun run pt device move R1 -x 200 -y 300',
      description: 'Mover router R1 a posición (200, 300)'
    },
    {
      command: 'bun run pt device move S1 --xpos 400 --ypos 150',
      description: 'Mover switch S1 a posición (400, 150)'
    }
  ],
  related: [
    'bun run pt device list',
    'bun run pt device get',
    'bun run pt device add'
  ],
  nextSteps: [
    'bun run pt device get <device>'
  ],
  tags: ['device', 'move', 'position', 'network'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true
};

export function createDeviceMoveCommand(): Command {
  const cmd = new Command('move')
    .description('Mover un dispositivo a nueva posición')
    .argument('[name]', 'Nombre del dispositivo')
    .argument('[x]', 'Nueva posición X')
    .argument('[y]', 'Nueva posición Y')
    .option('-x, --xpos <x>', 'Nueva posición X', '100')
    .option('-y, --ypos <y>', 'Nueva posición Y', '100')
    .option('-i, --interactive', 'Seleccionar el dispositivo de forma interactiva', false)
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false)
    .option('--verify', 'Verificar cambios post-ejecución', true)
    .option('--no-verify', 'Omitir verificación post-ejecución', false)
    .option('--trace', 'Activar traza estructurada de la ejecución', false)
    .option('--trace-bundle', 'Generar archivo bundle único para debugging', false)
    .action(async (name, xArg, yArg, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');
      const globalTrace = process.argv.includes('--trace');
      const globalTraceBundle = process.argv.includes('--trace-bundle');

      const verifyEnabled = options.verify ?? true;

      if (globalExamples) {
        console.log(printExamples(DEVICE_MOVE_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(DEVICE_MOVE_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(DEVICE_MOVE_META.longDescription ?? DEVICE_MOVE_META.summary);
        return;
      }

      let deviceName = name;
      const x = parseInt(xArg ?? options.xpos ?? '100', 10);
      const y = parseInt(yArg ?? options.ypos ?? '100', 10);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error('Las coordenadas X/Y deben ser números válidos');
      }

      const flags = buildFlags({
        json: process.argv.includes('--json'),
        output: process.argv.includes('--json') ? 'json' : 'text',
        trace: globalTrace,
        traceBundle: globalTraceBundle,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: verifyEnabled,
      });

      const result = await runCommand<DeviceMoveResult>({
        action: 'device.move',
        meta: DEVICE_MOVE_META,
        flags,
        payloadPreview: {
          name: deviceName,
          x,
          y,
        },
        execute: async (ctx): Promise<CliResult<DeviceMoveResult>> => {
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
                return createSuccessResult('device.move', {
                  name: '',
                  x,
                  y,
                }, {
                  advice: ['No hay dispositivos en la topología'],
                });
              }

              deviceName = await select({
                message: 'Selecciona un dispositivo para mover',
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
              return createSuccessResult('device.move', {
                name: deviceName,
                x,
                y,
              }, {
                advice: [
                  `Plan validado: el dispositivo '${deviceName}' existe.`,
                  `Movería '${deviceName}' a (${x}, ${y}).`,
                ],
              });
            }

            await logPhase('apply', { name: deviceName, x, y });

            const result = await controller.moveDevice(deviceName, x, y);

            if (!result.ok) {
              throw new Error(result.error ?? 'Error al mover dispositivo');
            }

            if (verifyEnabled) {
              await logPhase('verify', { name: deviceName, x, y });

              const device = await controller.inspectDevice(deviceName);

              if (!device) {
                return createVerifiedResult('device.move', {
                  name: deviceName,
                  x,
                  y,
                }, {
                  verified: false,
                  checks: [{
                    name: 'device.exists',
                    ok: false,
                    details: { message: 'El dispositivo no fue encontrado' },
                  }],
                });
              }

              const checks = [
                {
                  name: 'device.exists',
                  ok: true,
                  details: { name: device.name },
                },
                {
                  name: 'device.position',
                  ok: device.x === x && device.y === y,
                  details: {
                    expectedX: x,
                    expectedY: y,
                    actualX: device.x,
                    actualY: device.y
                  },
                },
              ];

              const allPassed = checks.every((c) => c.ok);

              return createVerifiedResult('device.move', {
                name: deviceName,
                x: device.x ?? x,
                y: device.y ?? y,
              }, {
                verified: allPassed,
                checks,
              });
            }

            return createSuccessResult('device.move', {
              name: deviceName,
              x,
              y,
            }, {
              advice: [
                `Ejecuta bun run pt device get ${deviceName} para verificar`,
              ],
            });
          } catch (error) {
            if (error instanceof DeviceNotFoundError) {
              return {
                schemaVersion: '1.0',
                ok: false,
                action: 'device.move',
                error: {
                  code: error.code,
                  message: error.message,
                  details: error.toDetails(),
                },
                advice: error.toAdvice(),
              } as CliResult<DeviceMoveResult>;
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

      if (!flags.json && result.ok && result.data) {
        const nextSteps = [
          `bun run pt device get ${name ?? '<device>'}`,
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
