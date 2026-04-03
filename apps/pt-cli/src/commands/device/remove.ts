import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { fetchDeviceList, formatDevice } from '../../utils/device-utils.ts';

export function createDeviceRemoveCommand(): Command {
  const cmd = new Command('remove')
    .description('Remover un dispositivo de la topología')
    .argument('[name]', 'Nombre del dispositivo a remover')
    .option('-f, --force', 'Remover sin confirmación')
    .action(async (name, options) => {
      let deviceName = name;

      try {
        const controller = createDefaultPTController();

        // If device name not provided, prompt for selection
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
              message: 'Selecciona un dispositivo para remover',
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

        // Confirm removal unless --force flag
        if (!options.force) {
          const confirmed = await confirm({
            message: `¿Remover dispositivo "${chalk.red(deviceName)}"?`,
            default: false,
          });

          if (!confirmed) {
            console.log(chalk.gray('Operación cancelada'));
            return;
          }
        }

        process.stdout.write(`${chalk.cyan('⏳')} Removiendo dispositivo ${chalk.red(deviceName)}...\n`);

        await controller.start();

        try {
          await controller.removeDevice(deviceName);

          console.log(`${chalk.green('✓')} Dispositivo ${chalk.cyan(deviceName)} removido exitosamente\n`);
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
