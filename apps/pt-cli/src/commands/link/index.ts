#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control';

export function createLinkCommand(): Command {
  const cmd = new Command('link')
    .description('Gestión de cableado físico');

  cmd
    .command('add <dev1> <port1> <dev2> <port2>')
    .alias('connect')
    .description('Conecta dos dispositivos con un cable')
    .option('-t, --type <type>', 'Tipo de cable (straight, crossover, fiber, auto)', 'auto')
    .action(async (dev1, port1, dev2, port2, options) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        process.stdout.write(chalk.cyan(`🔗 Conectando ${dev1}:${port1} <-> ${dev2}:${port2}... `));
        
        const res = await (controller as any).bridge.sendCommandAndWait("addLink", {
            device1: dev1, port1: port1,
            device2: dev2, port2: port2,
            linkType: options.type
        });

        if (res.ok) {
            console.log(chalk.green('OK.'));
        } else {
            console.log(chalk.red('ERROR.'));
            console.error(chalk.red(`  └─ ${res.error}`));
        }
      } catch (e: any) {
        console.error(chalk.red(`\n💥 Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  cmd
    .command('force <dev1> <port1> <dev2> <port2>')
    .description('Fuerza una conexión física mediante inyección directa de memoria (Bypass de C++)')
    .action(async (dev1, port1, dev2, port2) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        process.stdout.write(chalk.magenta(`⚡ Forzando enlace: ${dev1}:${port1} <-> ${dev2}:${port2}... `));
        
        const res = await controller.omniscience.evaluate(`
            (function() {
                try {
                    // Usamos el shortcut 'w' inyectado en el kernel
                    var success = w.createLink('${dev1}', '${port1}', '${dev2}', '${port2}', 0);
                    return success ? "LINK_FORCED" : "FAILED_BY_ENGINE";
                } catch(e) { return "ERROR: " + String(e); }
            })()
        `);
        
        if (res === "LINK_FORCED") {
            console.log(chalk.green('OK.'));
        } else {
            console.log(chalk.red('FALLÓ.'));
            console.error(chalk.red(`  └─ ${res}`));
        }
      } catch (e: any) {
        console.error(chalk.red(`\n💥 Error en inyección: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  return cmd;
}
