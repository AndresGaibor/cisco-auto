import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';

export function createLinkRemoveCommand(): Command {
  const cmd = new Command('remove')
    .description('Remover una conexión entre dispositivos')
    .argument('[device]', 'Dispositivo (ej: R1)')
    .argument('[port]', 'Puerto (ej: Gi0/0)')
    .option('-f, --force', 'Remover sin confirmación')
    .option('-i, --interactive', 'Completar datos faltantes de forma interactiva', false)
    .action(async (device, port, options) => {
      let dev = device;
      let prt = port;

      try {
        const controller = createDefaultPTController();

        // Prompt for device and port if not provided
        if ((!dev || !prt) && !options.interactive) {
          throw new Error('Debes pasar dispositivo y puerto, o usar --interactive');
        }

        if (!dev || !prt) {
          if (!dev) {
            dev = await input({
              message: 'Dispositivo (ej: R1)',
            });
          }

          if (!prt) {
            prt = await input({
              message: `Puerto en ${chalk.cyan(dev)} (ej: Gi0/0)`,
            });
          }
        }

        if (!dev?.trim()) {
          throw new Error('El nombre del dispositivo es requerido');
        }

        if (!prt?.trim()) {
          throw new Error('El puerto es requerido');
        }

        // Confirm removal unless --force flag
        if (options.interactive && !options.force) {
          const confirmed = await confirm({
            message: `¿Remover conexión en ${chalk.cyan(dev)}:${prt}?`,
            default: false,
          });

          if (!confirmed) {
            console.log(chalk.gray('Operación cancelada'));
            return;
          }
        }

        process.stdout.write(`${chalk.cyan('⏳')} Removiendo conexión...\n`);

        await controller.start();

        try {
          await controller.removeLink(dev, prt);

          console.log(`${chalk.green('✓')} Conexión removida exitosamente\n`);
          console.log(chalk.gray('Detalles:'));
          console.log(`  Dispositivo: ${chalk.cyan(dev)}`);
          console.log(`  Puerto: ${prt}`);
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
