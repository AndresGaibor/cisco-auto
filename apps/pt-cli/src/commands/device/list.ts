import { Command } from 'commander';
import { createSuccessResult } from '../../contracts/cli-result.js';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';
import chalk from 'chalk';
import { runCommand } from '../../application/run-command.js';

export function createDeviceListCommand(): Command {
  /**
   * TODO-Fase-3: Migrar `device list` a `runCommand()`
   * 
   * Contexto: device list actualmente hace start/stop manual.
   * En Fase 3, esto debe delegarse a `runCommand()` para que el ciclo de vida
   * del controller sea consistente con otros comandos que ya usan runCommand().
   * 
   * Beneficios:
   * - Contexto automático (CommandRuntimeContext) sin boilerplate
   * - Historial enriquecido con contextSummary
   * - Warnings contextuales automáticos
   * - Consistencia con la arquitectura de Fase 2+
   * 
   * Refactor:
   * - Cambiar de Command.action() a RunCommandOptions
   * - Usar `ctx.controller.listDevices()` en lugar de crear controller local
   * - Dejar que runCommand() maneje start/stop
   */
  const cmd = new Command('list')
    .description('Listar dispositivos en Packet Tracer')
    .option('-t, --type <type>', 'Filtrar por tipo (router|switch|pc|server)')
    .option('-j, --json', 'Salida en formato JSON')
    .action(async (options) => {
      const result = await runCommand<{ devices: Array<{ name: string; model: string; type: string; power: boolean; ports?: Array<unknown> }> }>({
        action: 'device.list',
        meta: {
          id: 'device.list',
          summary: 'Listar dispositivos en Packet Tracer',
          examples: [],
          related: [],
        },
        flags: {
          json: options.json ?? false,
          jq: null,
          output: 'text',
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
        },
        execute: async ({ controller }) => {
          const devices = await controller.listDevices();

          let filtered = devices;
          if (options.type) {
            filtered = devices.filter((d) => d.type === options.type);
          }

          return createSuccessResult('device.list', { devices: filtered, count: filtered.length });
        },
      });

      if (!result.ok) {
        console.error('❌ Error:', result.error?.message ?? 'No se pudo listar dispositivos');
        process.exit(1);
      }

      const devices = result.data?.devices ?? [];

      if (options.json) {
        console.log(JSON.stringify(devices, null, 2));
        return;
      }

      console.log(`\n📱 Dispositivos en Packet Tracer (${devices.length}):`);
      console.log('━'.repeat(60));

      devices.forEach((device, i) => {
        console.log(`\n${i + 1}. ${chalk.cyan(device.name)}`);
        console.log(`   Tipo: ${device.type}`);
        console.log(`   Modelo: ${device.model}`);
        console.log(`   Estado: ${device.power ? chalk.green('Encendido') : chalk.yellow('Apagado')}`);
        if (device.ports?.length) {
          console.log(`   Puertos: ${device.ports.length}`);
        }
      });
      console.log('');
    });

  const examples = getExamples('device list');
  const related = getRelatedCommands('device list');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
