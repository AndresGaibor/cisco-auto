import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';

export function createConfigHostCommand(): Command {
  const cmd = new Command('config-host')
    .description('Configurar red de un dispositivo (IP, gateway, DNS, DHCP)')
    .argument('[device]', 'Nombre del dispositivo')
    .option('--ip <ip>', 'Dirección IP')
    .option('--mask <mask>', 'Máscara de subred')
    .option('--gateway <gateway>', 'Puerta de enlace')
    .option('--dns <dns>', 'Servidor DNS')
    .option('--dhcp', 'Habilitar DHCP')
    .action(async (device, options) => {
      let deviceName = device;

      try {
        const controller = createDefaultPTController();
        await controller.start();

        try {
          if (!deviceName) {
            const devices = await controller.listDevices();
            if (devices.length === 0) {
              throw new Error('No hay dispositivos');
            }
            deviceName = await select({
              message: 'Selecciona dispositivo',
              choices: devices.map((d: any) => ({ name: d.name, value: d.name })),
            });
          }

          let ip = options.ip;
          let mask = options.mask;
          let gateway = options.gateway;
          let dns = options.dns;
          let dhcp = options.dhcp;

          if (!ip) {
            ip = await input({ message: 'Dirección IP:', validate: (v) => !!v || 'IP requerida' });
          }
          if (!mask) {
            mask = await input({ message: 'Máscara (ej: 255.255.255.0):', default: '255.255.255.0' });
          }
          if (!gateway && !dhcp) {
            gateway = await input({ message: 'Gateway (opcional):' });
          }

          await controller.configHost(deviceName, { ip, mask, gateway, dns, dhcp: !!dhcp });
          console.log(`${chalk.green('✓')} Configuración aplicada a ${chalk.cyan(deviceName)}`);
        } finally {
          await controller.stop();
        }
      } catch (error) {
        console.error(`${chalk.red('✗')} Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  return cmd;
}
