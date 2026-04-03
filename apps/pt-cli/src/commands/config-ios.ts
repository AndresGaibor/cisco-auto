import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { fetchDeviceList, formatDevice, getIOSCapableDevices } from '../utils/device-utils.ts';

export function createConfigIOSCommand(): Command {
  const cmd = new Command('config-ios')
    .description('Ejecutar comandos IOS en un dispositivo')
    .argument('[device]', 'Nombre del dispositivo')
    .argument('[command...]', 'Comando(s) IOS a ejecutar')
    .option('-i, --interactive', 'Modo interactivo (ejecutar comandos uno por uno)')
    .action(async (device, commands, options) => {
      try {
        const controller = createDefaultPTController();
        process.stdout.write(`${chalk.cyan('⏳')} Cargando dispositivos...\n`);

        await controller.start();

        try {
          const devices = await fetchDeviceList(controller);
          const iosDevices = getIOSCapableDevices(devices);

          if (iosDevices.length === 0) {
            console.log(chalk.yellow('No hay dispositivos capaces de ejecutar IOS'));
            return;
          }

          // Select device if not provided
          let targetDevice = device;
          if (!targetDevice) {
            targetDevice = await select({
              message: 'Selecciona un dispositivo',
              choices: iosDevices.map((d) => ({
                name: formatDevice(d),
                value: d.name,
              })),
            });
          }

          // Verify device exists and is IOS-capable
          const selectedDevice = iosDevices.find((d) => d.name === targetDevice);
          if (!selectedDevice) {
            throw new Error(`Dispositivo "${targetDevice}" no encontrado o no es capaz de ejecutar IOS`);
          }

          // Interactive mode - execute commands one by one
          if (options.interactive) {
            console.log(`\n${chalk.bold('Modo interactivo')} para ${chalk.cyan(targetDevice)}\n`);
            console.log(chalk.gray('Escribe "exit" para salir\n'));

            let running = true;
            while (running) {
              const cmd = await input({
                message: `${chalk.cyan(targetDevice)}#`,
              });

              if (cmd.toLowerCase() === 'exit') {
                running = false;
                break;
              }

              if (!cmd.trim()) {
                continue;
              }

              try {
                process.stdout.write(chalk.gray('⏳ Ejecutando...\n'));
                await controller.configIos(targetDevice, [cmd]);
                console.log(chalk.green('✓ Comando ejecutado'));
                console.log();
              } catch (error) {
                console.error(chalk.red(`Error: ${error instanceof Error ? error.message : 'error desconocido'}`));
              }
            }

            console.log(chalk.gray('Sesión terminada'));
          } else {
            // Non-interactive mode - execute provided commands
            if (!commands || commands.length === 0) {
              const singleCmd = await input({
                message: `Comando IOS para ${chalk.cyan(targetDevice)}`,
              });

              if (!singleCmd.trim()) {
                throw new Error('Se requiere al menos un comando');
              }

              commands = [singleCmd];
            }

            console.log(
              `${chalk.cyan('⏳')} Ejecutando ${commands.length} comando${commands.length !== 1 ? 's' : ''}...`
            );

            try {
              await controller.configIos(targetDevice, commands);

              console.log(`\n${chalk.green('✓')} Comando${commands.length !== 1 ? 's' : ''} ejecutado${commands.length !== 1 ? 's' : ''} exitosamente\n`);
            } catch (error) {
              throw new Error(`Fallo al ejecutar comando: ${error instanceof Error ? error.message : 'error desconocido'}`);
            }
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
