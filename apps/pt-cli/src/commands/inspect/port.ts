#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control';

export function createInspectPortCommand(): Command {
  return new Command('port')
    .argument('<device>', 'Nombre del dispositivo')
    .argument('<port>', 'Nombre del puerto (ej: FastEthernet0/1)')
    .description('Auditoría profunda de un puerto específico')
    .action(async (device, port) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        process.stdout.write(chalk.cyan(`🔍 Auditando puerto ${device}:${port}... `));
        
        const stats = await controller.omniscience.auditPort(device, port);
        console.log(chalk.green('OK.\n'));

        const statusLabel = stats.status === "UP" ? chalk.bgGreen.black(" UP ") : 
                           (stats.status === "NEGOTIATING" ? chalk.bgYellow.black(" STP ") : chalk.bgRed.white(" DOWN "));

        console.log(chalk.bold.magenta(`  --- [ ESTADO DEL PUERTO ] ---`));
        console.log(`  ${chalk.gray('Nombre:')}    ${stats.name}`);
        console.log(`  ${chalk.gray('Físico:')}    ${statusLabel}`);
        console.log(`  ${chalk.gray('MAC Real:')}  ${chalk.white(stats.physical.mac)}`);
        console.log(`  ${chalk.gray('BIA:')}       ${chalk.white(stats.physical.bia)}`);
        
        console.log(chalk.cyan(`\n  🆔 CAPA LÓGICA (L3):`));
        console.log(`    ${chalk.gray('IP:')}      ${stats.logical.ip === "0.0.0.0" ? chalk.red("UNSET") : chalk.yellow(stats.logical.ip)}`);
        
        if (stats.routing.ospfHello !== -1) {
            console.log(chalk.cyan(`\n  🚀 PROTOCOLOS:`));
            console.log(`    ${chalk.gray('OSPF Hello:')} ${stats.routing.ospfHello}s`);
        }

      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error de inspección: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });
}
