import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';

export function createShowCommand(): Command {
  const showCmd = new Command('show')
    .description('Ejecutar comandos show en un dispositivo');

  showCmd
    .command('ip-int-brief')
    .description('Mostrar IPs de interfaces')
    .argument('[device]', 'Nombre del dispositivo')
    .action(async (device) => {
      try {
        const controller = createDefaultPTController();
        await controller.start();
        try {
          const deviceName = device || await selectDevice(controller, 'Selecciona dispositivo');
          const result = await controller.showIpInterfaceBrief(deviceName);
          console.log(JSON.stringify(result, null, 2));
        } finally {
          await controller.stop();
        }
      } catch (error) {
        console.error(`${chalk.red('✗')} Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  showCmd
    .command('vlan')
    .description('Mostrar VLANs')
    .argument('[device]', 'Nombre del dispositivo')
    .action(async (device) => {
      try {
        const controller = createDefaultPTController();
        await controller.start();
        try {
          const deviceName = device || await selectDevice(controller, 'Selecciona switch');
          const result = await controller.showVlan(deviceName);
          console.log(JSON.stringify(result, null, 2));
        } finally {
          await controller.stop();
        }
      } catch (error) {
        console.error(`${chalk.red('✗')} Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  showCmd
    .command('ip-route')
    .description('Mostrar tabla de rutas')
    .argument('[device]', 'Nombre del dispositivo')
    .action(async (device) => {
      try {
        const controller = createDefaultPTController();
        await controller.start();
        try {
          const deviceName = device || await selectDevice(controller, 'Selecciona router');
          const result = await controller.showIpRoute(deviceName);
          console.log(JSON.stringify(result, null, 2));
        } finally {
          await controller.stop();
        }
      } catch (error) {
        console.error(`${chalk.red('✗')} Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  showCmd
    .command('run-config')
    .description('Mostrar configuración corriendo')
    .argument('[device]', 'Nombre del dispositivo')
    .action(async (device) => {
      try {
        const controller = createDefaultPTController();
        await controller.start();
        try {
          const deviceName = device || await selectDevice(controller, 'Selecciona dispositivo');
          const result = await controller.showRunningConfig(deviceName);
          console.log(JSON.stringify(result, null, 2));
        } finally {
          await controller.stop();
        }
      } catch (error) {
        console.error(`${chalk.red('✗')} Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  return showCmd;
}

async function selectDevice(controller: any, message: string): Promise<string> {
  const devices = await controller.listDevices();
  if (devices.length === 0) {
    throw new Error('No hay dispositivos en la topología');
  }
  return await select({
    message,
    choices: devices.map((d: any) => ({ name: d.name, value: d.name })),
  });
}
