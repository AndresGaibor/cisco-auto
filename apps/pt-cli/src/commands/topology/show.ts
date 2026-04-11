#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control';

export function createTopologyShowCommand(): Command {
  return new Command('show')
    .description('Mostrar topología descubierta del canvas PT')
    .action(async function () {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const snapshot = await controller.snapshot();

        const devices = Object.values(snapshot.devices);
        const links = Object.values(snapshot.links);

        if (devices.length === 0) {
          console.log(chalk.yellow('No hay dispositivos en la topología.'));
          console.log(chalk.gray('Abre un lab en Packet Tracer y recarga el runtime.'));
          return;
        }

        console.log(chalk.bold('\n🌐 Topología del Canvas\n'));
        console.log(chalk.cyan('─'.repeat(60)));
        console.log(chalk.yellow('Dispositivos (' + devices.length + '):'));
        console.log(chalk.cyan('─'.repeat(60)));

        for (const device of devices) {
          const model = (device as any).model || (device as any).type || 'Unknown';
          const status = (device as any).state || (device as any).status || 'unknown';
          console.log(
            '  ' + chalk.cyan((device as any).name || device.id).padEnd(20) +
            chalk.gray(model).padEnd(15) +
            chalk.yellow(status)
          );
        }

        console.log(chalk.cyan('\n─'.repeat(60)));
        console.log(chalk.yellow('Conexiones (' + links.length + '):'));
        console.log(chalk.cyan('─'.repeat(60)));

        if (links.length === 0) {
          console.log(chalk.gray('  Sin conexiones.'));
        } else {
          for (const link of links) {
            const source = (link as any).sourceDeviceId || (link as any).source;
            const target = (link as any).targetDeviceId || (link as any).target;
            const sourcePort = (link as any).sourcePort || '';
            const targetPort = (link as any).targetPort || '';
            console.log(
              '  ' + chalk.cyan(source) + chalk.gray('.' + sourcePort) +
              chalk.yellow(' ↔ ') +
              chalk.cyan(target) + chalk.gray('.' + targetPort)
            );
          }
        }

        console.log(chalk.cyan('─'.repeat(60)));
        console.log();
      } finally {
        await controller.stop();
      }
    });
}
