#!/usr/bin/env bun
/**
 * Comando router add - Agregar un router a la topología
 * Alias rápido para agregar routers sin especificar tipo
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { input } from '../../utils/inquirer.js';

import type { PTController } from '@cisco-auto/pt-control/controller';
import type { CliResult } from '../../contracts/cli-result.js';
import { createSuccessResult, createVerifiedResult, createErrorResult } from '../../contracts/cli-result.js';
import type { CommandMeta } from '../../contracts/command-meta.js';
import type { GlobalFlags } from '../../flags.js';

import { runCommand } from '../../application/run-command.js';
import { renderCliResult } from '../../ux/renderers.js';
import { printExamples } from '../../ux/examples.js';
import { formatNextSteps } from '../../ux/next-steps.js';
import { buildFlags } from '../../flags-utils.js';
import { validateDeviceNameNotExists, formatDevice, formatDeviceType } from '../../utils/device-utils.js';

interface RouterAddResult {
  name: string;
  model: string;
  type: string;
  x: number;
  y: number;
}

/**
 * Modelos de routers disponibles en Packet Tracer
 */
export const ROUTER_MODELS = [
  { name: '2911', description: 'Router ISR 2911' },
  { name: '2921', description: 'Router ISR 2921' },
  { name: '2951', description: 'Router ISR 2951' },
  { name: '1941', description: 'Router ISR 1941' },
  { name: '2901', description: 'Router ISR 2901' },
  { name: '4321', description: 'Router ISR 4321' },
  { name: '4331', description: 'Router ISR 4331' },
  { name: '4351', description: 'Router ISR 4351' },
];

export const ROUTER_ADD_META: CommandMeta = {
  id: 'router.add',
  summary: 'Agregar un router Cisco a la topología',
  longDescription: 'Agrega un router Cisco a la topología de Packet Tracer en las coordenadas especificadas. Alias rápido para "pt device add" orientado específicamente a routers.',
  examples: [
    {
      command: 'bun run pt router add R1 2911',
      description: 'Agregar router Cisco 2911'
    },
    {
      command: 'bun run pt router add R1 2911 -x 200 -y 300',
      description: 'Agregar router en posición específica'
    },
    {
      command: 'bun run pt router add R1 -i',
      description: 'Agregar router de forma interactiva'
    },
    {
      command: 'bun run pt router add R1 1941',
      description: 'Agregar router Cisco 1941'
    },
  ],
  related: [
    'bun run pt device add',
    'bun run pt device list',
    'bun run pt show ip-int-brief',
  ],
  nextSteps: [
    'bun run pt device list',
    'bun run pt config-ios R1 interface',
    'bun run pt show ip-int-brief R1',
  ],
  tags: ['router', 'add', 'create', 'device'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true,
};

export function createRouterAddCommand(): Command {
  const cmd = new Command('add')
    .description('Agregar un router Cisco a la topología')
    .argument('[name]', 'Nombre del router (ej: R1, R2, Router1)')
    .argument('[model]', 'Modelo del router (ej: 2911, 1941, 4321)')
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
      const globalTrace = process.argv.includes('--trace');
      const globalTraceBundle = process.argv.includes('--trace-bundle');

      const verifyEnabled = options.verify ?? true;

      if (globalExamples) {
        console.log(printExamples(ROUTER_ADD_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(ROUTER_ADD_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(ROUTER_ADD_META.longDescription ?? ROUTER_ADD_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Agregar router ${name ?? '<name>'}:${model ?? '<model>'}`);
        console.log(`  2. Posición: (${options.xpos ?? '100'}, ${options.ypos ?? '100'})`);
        console.log('  3. Verificar que el router se creó correctamente');
        console.log('  4. Listo para configuración');
        return;
      }

      let routerName = name;
      let routerModel = model;
      const x = parseInt(options.xpos ?? '100', 10);
      const y = parseInt(options.ypos ?? '100', 10);

      const flags = buildFlags({
        trace: globalTrace,
        traceBundle: globalTraceBundle,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: verifyEnabled,
      });

      const result = await runCommand<RouterAddResult>({
        action: 'router.add',
        meta: ROUTER_ADD_META,
        flags,
        payloadPreview: {
          name: routerName,
          model: routerModel,
          type: 'router',
          x,
          y,
        },
        execute: async (ctx): Promise<CliResult<RouterAddResult>> => {
          const { controller, logPhase } = ctx;

          if ((!routerName || !routerModel) && !options.interactive) {
            throw new Error('Debes pasar nombre y modelo, o usar --interactive');
          }

          if (!routerName || !routerModel) {
            const interactive = await promptForRouter(routerName, routerModel);
            routerName = interactive.name;
            routerModel = interactive.model;
          }

          if (!routerName?.trim()) {
            return createErrorResult('router.add', { message: 'El nombre del router es requerido' }) as unknown as CliResult<RouterAddResult>;
          }
          if (!routerModel?.trim()) {
            return createErrorResult('router.add', { 
              message: 'El modelo del router es requerido' 
            }) as unknown as CliResult<RouterAddResult>;
          }

          // Validar que el modelo sea válido para routers
          const validModels = ROUTER_MODELS.map(m => m.name);
          if (!validModels.includes(routerModel)) {
            return createErrorResult('router.add', { 
              message: `Modelo '${routerModel}' no válido para routers. Modelos disponibles: ${validModels.join(', ')}` 
            }) as unknown as CliResult<RouterAddResult>;
          }

          // Validar que el nombre no exista (solo en plan o verify)
          if (verifyEnabled || globalPlan) {
            await validateDeviceNameNotExists(controller, routerName);
          }

          if (globalPlan) {
            return createSuccessResult('router.add', {
              name: routerName,
              model: routerModel,
              type: 'router',
              x,
              y,
            }, {
              advice: [
                `Plan: agregaría router ${routerName} (${routerModel}) en (${x}, ${y})`,
                'Verificaría que el router se creó correctamente',
              ],
            });
          }

          await logPhase('apply', {
            name: routerName,
            model: routerModel,
            type: 'router',
            x,
            y,
          });

          // Fast-path: skip validation if --no-verify and not in plan mode
          if (!verifyEnabled && !globalPlan && typeof (controller as any).addDeviceUnchecked === 'function') {
            await (controller as any).addDeviceUnchecked(routerName, routerModel, { x, y });
          } else {
            await controller.addDevice(routerName, routerModel, { x, y });
          }

          if (verifyEnabled) {
            await logPhase('verify', { name: routerName });

            const device = await controller.inspectDevice(routerName);

            if (!device) {
              return createVerifiedResult('router.add', {
                name: routerName,
                model: routerModel,
                type: 'router',
                x,
                y,
              }, {
                verified: false,
                checks: [{
                  name: 'device.exists',
                  ok: false,
                  details: { message: 'El router no fue encontrado después de crearlo' },
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
                ok: device.model === routerModel,
                details: { expected: routerModel, actual: device.model },
              },
              {
                name: 'device.position',
                ok: device.x === x && device.y === y,
                details: { expectedX: x, expectedY: y, actualX: device.x, actualY: device.y },
              },
              {
                name: 'device.type',
                ok: device.type === 'router' || device.type === 'multilayer_device',
                details: { type: device.type },
              },
            ];

            const allPassed = checks.every((c) => c.ok);

            return createVerifiedResult('router.add', {
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

          return createSuccessResult('router.add', {
            name: routerName,
            model: routerModel,
            type: 'router',
            x,
            y,
          }, {
            advice: [
              'Ejecuta bun run pt device list para verificar',
              'Usa bun run pt config-ios para configurar interfaces',
            ],
          });
        },
      });

      const output = renderCliResult(result, flags.output);

      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (result.ok && result.data) {
        const nextSteps = [
          'bun run pt device list',
          `bun run pt show ip-int-brief ${name ?? '<router>'}`,
          `bun run pt config-ios ${name ?? '<router>'} interface`,
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

async function promptForRouter(
  providedName?: string,
  providedModel?: string
): Promise<{ name: string; model: string }> {
  const routerName =
    providedName ||
    (await input({
      message: 'Nombre del router',
      validate: (value) => value.trim() !== '' || 'El nombre es requerido',
    }));

  const routerModel =
    providedModel ||
    (await input({
      message: 'Modelo del router (2911, 1941, 4321, etc.)',
      default: '2911',
      validate: (value) => {
        const validModels = ROUTER_MODELS.map(m => m.name);
        return validModels.includes(value) || 'Modelo no válido';
      },
    }));

  return { name: routerName, model: routerModel };
}
