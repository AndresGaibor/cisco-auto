import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';
import chalk from 'chalk';

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
      try {
        const controller = createDefaultPTController();
        await controller.start();

        try {
          const devices = await controller.listDevices();
          
          let filtered = devices;
          if (options.type) {
            filtered = devices.filter(d => d.type === options.type);
          }

          if (options.json) {
            console.log(JSON.stringify(filtered, null, 2));
          } else {
            console.log(`\n📱 Dispositivos en Packet Tracer (${filtered.length}):`);
            console.log('━'.repeat(60));

            filtered.forEach((device, i) => {
              console.log(`\n${i + 1}. ${chalk.cyan(device.name)}`);
              console.log(`   Tipo: ${device.type}`);
              console.log(`   Modelo: ${device.model}`);
              console.log(`   Estado: ${device.power ? chalk.green('Encendido') : chalk.yellow('Apagado')}`);
              if (device.ports?.length) {
                console.log(`   Puertos: ${device.ports.length}`);
              }
            });
            console.log('');
          }
        } finally {
          await controller.stop();
        }
      } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  const examples = getExamples('device list');
  const related = getRelatedCommands('device list');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
