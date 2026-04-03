import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import {
  DEVICE_MODELS,
  validateDeviceNameNotExists,
  formatDevice,
  formatDeviceType,
} from '../../utils/device-utils.ts';

export function createDeviceAddCommand(): Command {
  const cmd = new Command('add')
    .description('Agregar un nuevo dispositivo a la topología')
    .argument('[name]', 'Nombre del dispositivo (ej: R1, S1, PC1)')
    .argument('[model]', 'Modelo del dispositivo (ej: 2911, 2960, PC)')
    .option('-x, --xpos <x>', 'Posición X en el workspace', '100')
    .option('-y, --ypos <y>', 'Posición Y en el workspace', '100')
    .action(async (name, model, options) => {
      let deviceName = name;
      let deviceModel = model;
      const x = parseInt(options.xpos, 10);
      const y = parseInt(options.ypos, 10);

      try {
        // Interactive mode if args not provided
        if (!deviceName || !deviceModel) {
          const interactive = await promptForDevice(deviceName, deviceModel);
          deviceName = interactive.name;
          deviceModel = interactive.model;
        }

        if (!deviceName?.trim()) {
          throw new Error('El nombre del dispositivo es requerido');
        }
        if (!deviceModel?.trim()) {
          throw new Error('El modelo del dispositivo es requerido');
        }

        const controller = createDefaultPTController();
        process.stdout.write(`${chalk.cyan('⏳')} Agregando dispositivo ${chalk.cyan(deviceName)}...\n`);

        await controller.start();

        try {
          // Validate device name doesn't exist
          await validateDeviceNameNotExists(controller, deviceName);

          // Add the device
          await controller.addDevice(deviceName, deviceModel, { x, y });

          // Inspect the device to get full details
          const device = await controller.inspectDevice(deviceName);

          console.log(`${chalk.green('✓')} Dispositivo ${chalk.cyan(deviceName)} agregado exitosamente\n`);
          console.log(chalk.gray('Detalles:'));
          console.log(`  Nombre: ${device.name}`);
          console.log(`  Tipo: ${formatDeviceType(device.type)}`);
          console.log(`  Modelo: ${device.model}`);
          console.log(`  Estado: ${device.power ? chalk.green('Encendido') : chalk.yellow('Apagado')}`);
          if (device.ports?.length) {
            console.log(`  Puertos: ${device.ports.length}`);
          }
        } finally {
          await controller.stop();
        }
      } catch (error) {
        console.error(
          `${chalk.red('✗')} Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
        process.exit(1);
      }
    });

  return cmd;
}

async function promptForDevice(
  providedName?: string,
  providedModel?: string
): Promise<{ name: string; model: string }> {
  const deviceName =
    providedName ||
    (await input({
      message: 'Nombre del dispositivo',
      validate: (value) => value.trim() !== '' || 'El nombre es requerido',
    }));

  // Select device type first
  const deviceType = await select({
    message: 'Tipo de dispositivo',
    choices: [
      { name: 'Router', value: 'router' },
      { name: 'Switch', value: 'switch' },
      { name: 'PC', value: 'pc' },
      { name: 'Servidor', value: 'server' },
    ],
  });

  // Then select model based on type
  const models = DEVICE_MODELS[deviceType] || [];
  let deviceModel: string;

  if (models.length > 0) {
    deviceModel =
      providedModel ||
      (await select({
        message: 'Modelo del dispositivo',
        choices: models.map((m) => ({ name: `${m.name} (${deviceType})`, value: m.name })),
      }));
  } else {
    deviceModel =
      providedModel ||
      (await input({
        message: 'Modelo del dispositivo',
        default: deviceType.toUpperCase(),
      }));
  }

  return { name: deviceName, model: deviceModel };
}
