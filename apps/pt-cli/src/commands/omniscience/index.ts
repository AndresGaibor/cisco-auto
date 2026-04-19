#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control';

export function createOmniscienceCommand(): Command {
  const cmd = new Command('omniscience')
    .alias('omni')
    .description('Módulo de Omnisciencia para auditoría y hacking de Packet Tracer');

  cmd
    .command('env')
    .description('Manipula el entorno de realidad de Packet Tracer')
    .option('--no-anim', 'Desactiva animaciones')
    .option('--no-sound', 'Silencia el simulador')
    .action(async (options) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        // Llamada directa al oráculo V11
        await controller.omniscience.setReality({
            animation: options.anim,
            sound: options.sound
        });
        console.log(chalk.green('\n✨ Modo Turbo Activado.'));
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  cmd
    .command('raw <code>')
    .description('Ejecuta JS puro en el motor PT')
    .action(async (code) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const res = await controller.omniscience.evaluate(code);
        console.log(chalk.cyan('\n🚀 RESULTADO:'), res);
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  return cmd;
}
