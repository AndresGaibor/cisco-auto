#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control';

export function createSimulationCommand(): Command {
  const cmd = new Command('simulation')
    .alias('sim')
    .description('Control dinámico del motor de simulación de Packet Tracer');

  cmd
    .command('jump')
    .description('Fuerza el avance del tiempo para acelerar la convergencia (STP/ARP)')
    .option('-f, --frames <n>', 'Número de frames a saltar', '50')
    .action(async (options) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const frames = parseInt(options.frames, 10);
        process.stdout.write(chalk.cyan(`⏭️  Saltando ${frames} frames en el tiempo... `));
        
        await controller.omniscience.evaluate(`
            (function() {
                var sim = ipc.simulation();
                var wasSim = sim.isSimulationMode();
                sim.setSimulationMode(true);
                for(var i=0; i<${frames}; i++) sim.forward();
                if (!wasSim) sim.setSimulationMode(false);
                return "TIME_WARP_SUCCESS";
            })()
        `);
        
        console.log(chalk.green('OK.'));
        console.log(chalk.gray('  └─ La red debería haber convergido (Cables Verdes).'));
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error temporal: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  return cmd;
}
