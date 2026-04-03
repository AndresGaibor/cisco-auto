import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { fetchDeviceList, formatDevice } from '../../utils/device-utils.ts';
import { parsePortSpec } from '../../utils/port-parser.ts';

export function createLinkAddCommand(): Command {
  const cmd = new Command('add')
    .description('Agregar una conexión entre dos dispositivos')
    .argument('[device1]', 'Primer dispositivo (ej: R1)')
    .argument('[port1]', 'Puerto del primer dispositivo (ej: Gi0/0)')
    .argument('[device2]', 'Segundo dispositivo (ej: S1)')
    .argument('[port2]', 'Puerto del segundo dispositivo (ej: Fa0/1)')
    .option('-t, --type <type>', 'Tipo de conexión (auto, copper_straight, copper_crossover)', 'auto')
    .action(async (device1, port1, device2, port2, options) => {
      let dev1 = device1;
      let p1 = port1;
      let dev2 = device2;
      let p2 = port2;
      const linkType = options.type;

      try {
        const controller = createDefaultPTController();
        process.stdout.write(`${chalk.cyan('⏳')} Cargando dispositivos...\n`);

        await controller.start();

        try {
          const devices = await fetchDeviceList(controller);

          // Prompt for devices and ports if not provided
          if (!dev1 || !p1 || !dev2 || !p2) {
            const deviceChoices = devices.map((d) => ({
              name: formatDevice(d),
              value: d.name,
            }));

            if (!dev1) {
              dev1 = await select({
                message: 'Selecciona el primer dispositivo',
                choices: deviceChoices,
              });
            }

            if (!p1) {
              p1 = await input({
                message: `Puerto de ${chalk.cyan(dev1)} (ej: Gi0/0, Fa0/1)`,
                validate: (value) => {
                  try {
                    parsePortSpec(value);
                    return true;
                  } catch {
                    return 'Puerto inválido';
                  }
                },
              });
            }

            if (!dev2) {
              dev2 = await select({
                message: 'Selecciona el segundo dispositivo',
                choices: deviceChoices.filter((d) => d.value !== dev1),
              });
            }

            if (!p2) {
              p2 = await input({
                message: `Puerto de ${chalk.cyan(dev2)} (ej: Gi0/0, Fa0/1)`,
                validate: (value) => {
                  try {
                    parsePortSpec(value);
                    return true;
                  } catch {
                    return 'Puerto inválido';
                  }
                },
              });
            }
          }

          // Validate port specs
          try {
            parsePortSpec(p1);
            parsePortSpec(p2);
          } catch (error) {
            throw new Error(`Especificación de puerto inválida: ${error instanceof Error ? error.message : 'error desconocido'}`);
          }

          process.stdout.write(
            `${chalk.cyan('⏳')} Agregando conexión ${chalk.cyan(dev1)}:${p1} -> ${chalk.cyan(dev2)}:${p2}...\n`
          );

          // Add the link (linkType defaults to 'auto')
          await controller.addLink(dev1, p1, dev2, p2, linkType);

          console.log(`${chalk.green('✓')} Conexión agregada exitosamente\n`);
          console.log(chalk.gray('Detalles:'));
          console.log(`  ${chalk.cyan(dev1)}:${p1} <--> ${chalk.cyan(dev2)}:${p2}`);
          console.log(`  Tipo: ${linkType}`);
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
