#!/usr/bin/env bun
/**
 * Comando device add - Migrado a runCommand
 * Agrega un nuevo dispositivo a la topología de Packet Tracer
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { input, select } from '../../utils/inquirer.js';

import type { CliResult } from '../../contracts/cli-result.js';
import { createSuccessResult, createVerifiedResult, createErrorResult } from '../../contracts/cli-result.js';
import type { CommandMeta } from '../../contracts/command-meta.js';

import { runCommand } from '../../application/run-command.js';
import { printExamples } from '../../ux/examples.js';
import { renderCommandResult } from '../../application/render-command-result.js';
import { buildFlags } from '../../flags-utils.js';
import {
  DEVICE_MODELS,
  DeviceAlreadyExistsError,
  validateDeviceNameNotExists,
  formatDevice,
  formatDeviceType,
} from '../../utils/device-utils.js';

interface DeviceAddResult {
  name: string;
  model: string;
  type: string;
  x: number;
  y: number;
}

export const DEVICE_ADD_META: CommandMeta = {
  id: 'device.add',
  summary: 'Agregar un nuevo dispositivo a la topología',
  longDescription: 'Agrega un nuevo dispositivo de red (router, switch, PC, servidor) a la topología de Packet Tracer en las coordenadas especificadas.',
  examples: [
    {
      command: 'bun run pt device add R1 2911',
      description: 'Agregar router Cisco 2911'
    },
    {
      command: 'bun run pt device add S1 2960-24TT',
      description: 'Agregar switch Cisco 2960'
    },
    {
      command: 'bun run pt device add PC1 PC',
      description: 'Agregar PC genérico'
    },
    {
      command: 'bun run pt device add SRV1 Server',
      description: 'Agregar servidor'
    },
    {
      command: 'bun run pt device add R1 2911 -x 200 -y 300',
      description: 'Agregar router en posición específica'
    }
  ],
  related: [
    'bun run pt device list',
    'bun run pt device get',
    'bun run pt device remove'
  ],
  nextSteps: [
    'bun run pt device list',
    'bun run pt device get <device>'
  ],
  tags: ['device', 'add', 'create', 'network'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true
};

export function createDeviceAddCommand(): Command {
  const cmd = new Command('add')
    .description('Agregar un nuevo dispositivo a la topología')
    .argument('[name]', 'Nombre del dispositivo (ej: R1, S1, PC1)')
    .argument('[model]', 'Modelo del dispositivo (ej: 2911, 2960, PC)')
    .option('-x, --xpos <x>', 'Posición X en el workspace', '100')
    .option('-y, --ypos <y>', 'Posición Y en el workspace', '100')
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false)
    .option('-i, --interactive', 'Completar datos faltantes de forma interactiva', false)
    .option('--verify', 'Verificar cambios post-ejecución', true)
    .option('--no-verify', 'Omitir verificación post-ejecución', false)
    .option('--trace', 'Activar traza estructurada de la ejecución', false)
    .option('--trace-bundle', 'Generar archivo bundle único para debugging', false)
    .action(async (name, model, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');
      const globalJson = process.argv.includes('--json');
      const globalTrace = process.argv.includes('--trace');
      const globalTraceBundle = process.argv.includes('--trace-bundle');

      const verifyEnabled = options.verify ?? true;

      if (globalExamples) {
        console.log(printExamples(DEVICE_ADD_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(DEVICE_ADD_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(DEVICE_ADD_META.longDescription ?? DEVICE_ADD_META.summary);
        return;
      }

      let deviceName = name;
      let deviceModel = model;
      const x = parseInt(options.xpos ?? '100', 10);
      const y = parseInt(options.ypos ?? '100', 10);

      const flags = buildFlags({
        json: globalJson,
        output: globalJson ? 'json' : 'text',
        trace: globalTrace,
        traceBundle: globalTraceBundle,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: verifyEnabled,
      });

      const result = await runCommand<DeviceAddResult>({
        action: 'device.add',
        meta: DEVICE_ADD_META,
        flags,
        payloadPreview: {
          name: deviceName,
          model: deviceModel,
          x,
          y,
        },
        execute: async (ctx): Promise<CliResult<DeviceAddResult>> => {
          const { controller, logPhase } = ctx;

          await controller.start();

          try {
            if ((!deviceName || !deviceModel) && !options.interactive) {
              throw new Error('Debes pasar nombre y modelo, o usar --interactive');
            }

            if (!deviceName || !deviceModel) {
              const interactive = await promptForDevice(deviceName, deviceModel);
              deviceName = interactive.name;
              deviceModel = interactive.model;
            }

            if (!deviceName?.trim()) {
              throw new Error('El nombre del dispositivo es requerido');
            }
            if (!deviceModel?.trim()) {
              throw new Error('El modelo del dispositivo es requerido');
            }

            try {
              await validateDeviceNameNotExists(controller, deviceName);
            } catch (error) {
              if (error instanceof DeviceAlreadyExistsError) {
                const result = createErrorResult<DeviceAddResult>('device.add', {
                  code: error.code,
                  message: error.message,
                  details: error.toDetails(),
                });

                result.advice = error.toAdvice();
                return result;
              }

              throw error;
            }

            if (globalPlan) {
              return createSuccessResult('device.add', {
                name: deviceName,
                model: deviceModel,
                type: 'unknown',
                x,
                y,
              }, {
                advice: [
                  `Plan validado: el nombre '${deviceName}' está disponible.`,
                  `Crearía '${deviceName}' modelo '${deviceModel}' en (${x}, ${y}).`,
                ],
              });
            }

            await logPhase('apply', {
              name: deviceName,
              model: deviceModel,
              x,
              y,
            });

            await controller.addDevice(deviceName, deviceModel, { x, y });

            if (verifyEnabled) {
              await logPhase('verify', { name: deviceName });

              const device = await controller.inspectDevice(deviceName);

              if (!device) {
                return createVerifiedResult('device.add', {
                  name: deviceName,
                  model: deviceModel,
                  type: 'unknown',
                  x,
                  y,
                }, {
                  verified: false,
                  checks: [{
                    name: 'device.exists',
                    ok: false,
                    details: { message: 'El dispositivo no fue encontrado después de crearlo' },
                  }],
                });
              }

              const checks = [
                {
                  name: 'device.exists',
                  ok: true,
                  details: { name: device.name, type: device.type },
                },
                {
                  name: 'device.model',
                  ok: device.model === deviceModel,
                  details: { expected: deviceModel, actual: device.model },
                },
                {
                  name: 'device.position',
                  ok: device.x === x && device.y === y,
                  details: { expectedX: x, expectedY: y, actualX: device.x, actualY: device.y },
                },
              ];

              const allPassed = checks.every((c) => c.ok);

              return createVerifiedResult('device.add', {
                name: device.name,
                model: device.model,
                type: device.type,
                x: device.x ?? x,
                y: device.y ?? y,
              }, {
                verified: allPassed,
                checks,
              });
            }

            return createSuccessResult('device.add', {
              name: deviceName,
              model: deviceModel,
              type: 'unknown',
              x,
              y,
            }, {
              advice: [
                'Ejecuta bun run pt device list para verificar',
              ],
            });
          } finally {
            await controller.stop();
          }
        },
      });

      renderCommandResult({
        result,
        flags,
        nextSteps: [
          'bun run pt device list',
          `bun run pt device get ${name ?? '<device>'}`,
        ],
      });
    });

  return cmd;
}

async function promptForDevice(
  providedName?: string,
  providedModel?: string
): Promise<{ name: string; model: string }> {
  const deviceName =
    providedName ||
    (await input({
      message: 'Nombre del dispositivo',
      validate: (value) => value.trim() !== '' || 'El nombre es requerido',
    }));

  const deviceType = await select({
    message: 'Tipo de dispositivo',
    choices: [
      { name: 'Router', value: 'router' },
      { name: 'Switch', value: 'switch' },
      { name: 'PC', value: 'pc' },
      { name: 'Servidor', value: 'server' },
    ],
  });

  const models = DEVICE_MODELS[deviceType] || [];
  let deviceModel: string;

  if (models.length > 0) {
    deviceModel =
      providedModel ||
      (await select({
        message: 'Modelo del dispositivo',
        choices: models.map((m) => ({ name: `${m.name} (${deviceType})`, value: m.name })),
      }));
  } else {
    deviceModel =
      providedModel ||
      (await input({
        message: 'Modelo del dispositivo',
        default: deviceType.toUpperCase(),
      }));
  }

  return { name: deviceName, model: deviceModel };
}
