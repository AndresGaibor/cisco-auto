#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control';

export function createConfigCommand(): Command {
  const cmd = new Command('config')
    .alias('cfg')
    .description('Configuración rápida de direccionamiento y red');

  cmd
    .command('ip <device> <port> <ip> <mask>')
    .description('Configura la dirección IP de un puerto')
    .action(async (device, port, ip, mask) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        process.stdout.write(chalk.cyan(`🌐 Configurando IP en ${device}:${port} -> ${ip}... `));
        
        const res = await (controller as any).bridge.sendCommandAndWait("setDeviceIp", {
            device, port, ip, mask
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
    .command('gw <device> <gateway>')
    .description('Configura el Default Gateway de un dispositivo')
    .action(async (device, gateway) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        process.stdout.write(chalk.cyan(`🛣️  Configurando GW en ${device} -> ${gateway}... `));
        
        const res = await (controller as any).bridge.sendCommandAndWait("setDefaultGateway", {
            device, gw: gateway
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

  return cmd;
}
