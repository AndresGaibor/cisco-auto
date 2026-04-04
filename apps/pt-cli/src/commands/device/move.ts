import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { fetchDeviceList, formatDevice } from '../../utils/device-utils.ts';

export function createDeviceMoveCommand(): Command {
  const cmd = new Command('move')
    .description('Mover un dispositivo a nueva posición')
    .argument('[name]', 'Nombre del dispositivo')
    .option('-x, --xpos <x>', 'Nueva posición X', '100')
    .option('-y, --ypos <y>', 'Nueva posición Y', '100')
    .action(async (name, options) => {
      let deviceName = name;

      try {
        const controller = createDefaultPTController();

        if (!deviceName) {
          process.stdout.write(`${chalk.cyan('⏳')} Cargando dispositivos...\n`);

          await controller.start();

          try {
            const devices = await fetchDeviceList(controller);

            if (devices.length === 0) {
              console.log(chalk.yellow('No hay dispositivos en la topología'));
              return;
            }

            deviceName = await select({
              message: 'Selecciona un dispositivo para mover',
              choices: devices.map((d) => ({
                name: formatDevice(d),
                value: d.name,
              })),
            });
          } finally {
            await controller.stop();
          }
        }

        if (!deviceName?.trim()) {
          throw new Error('El nombre del dispositivo es requerido');
        }

        const x = parseInt(options.xpos, 10);
        const y = parseInt(options.ypos, 10);

        await controller.start();

        try {
          const result = await controller.moveDevice(deviceName, x, y);

          if (result.ok) {
            console.log(`${chalk.green('✓')} Dispositivo ${chalk.cyan(deviceName)} movido a posición (${x}, ${y})`);
          } else {
            console.error(`${chalk.red('✗')} Error: ${result.error}`);
            process.exit(1);
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
