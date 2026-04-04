import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';

interface EtherchannelCreateOptions {
  groupId: number;
  interfaces: string;
  mode: 'active' | 'passive' | 'desirable' | 'auto' | 'on';
  protocol: 'lacp' | 'pagp' | 'static';
  trunk: boolean;
  allowedVlans?: string;
  nativeVlan?: number;
  description?: string;
  dryRun: boolean;
}

function buildEtherchannelCommands(
  groupId: number,
  interfaces: string[],
  options: EtherchannelCreateOptions
): string[] {
  const commands: string[] = [];

  commands.push(`! EtherChannel Group ${groupId} (${options.protocol.toUpperCase()})`);

  for (const iface of interfaces) {
    commands.push(`interface ${iface}`);
    commands.push(` channel-group ${groupId} mode ${options.mode}`);
    commands.push(' no shutdown');
  }

  commands.push(`interface Port-channel${groupId}`);
  if (options.description) {
    commands.push(` description ${options.description}`);
  }

  if (options.trunk) {
    commands.push(' switchport trunk encapsulation dot1q');
    commands.push(' switchport mode trunk');
    if (options.allowedVlans) {
      commands.push(` switchport trunk allowed vlan ${options.allowedVlans}`);
    }
    if (options.nativeVlan) {
      commands.push(` switchport trunk native vlan ${options.nativeVlan}`);
    }
  } else {
    commands.push(' switchport mode access');
  }

  return commands;
}

export function createEtherchannelCommand(): Command {
  const cmd = new Command('etherchannel')
    .description('EtherChannel (Port-Channel) management');

  cmd
    .command('create')
    .description('Create an EtherChannel bundle')
    .argument('[device]', 'Nombre del dispositivo')
    .option('--group-id <id>', 'Channel group ID (1-64)', '1')
    .option('--interfaces <interfaces>', 'Member interfaces, comma-separated (e.g., Gi0/1,Gi0/2)', '')
    .option('--mode <mode>', 'Negotiation mode', 'active')
    .option('--protocol <protocol>', 'Protocol (lacp|pagp|static)', 'lacp')
    .option('--trunk', 'Set as trunk port', true)
    .option('--allowed-vlans <vlans>', 'Allowed VLANs (e.g., 10,20,30)')
    .option('--native-vlan <id>', 'Native VLAN ID')
    .option('--description <text>', 'Port-channel description')
    .option('--dry-run', 'Show commands without applying', false)
    .action(async (deviceName, options) => {
      try {
        let targetDevice = deviceName;

        if (!targetDevice) {
          const controller = createDefaultPTController();
          await controller.start();
          try {
            const devices = await controller.listDevices();
            const switches = devices.filter((d: any) => 
              d.type === 'switch' || d.type === 'multilayer_switch' || d.model?.includes('2960') || d.model?.includes('3650')
            );
            
            if (switches.length === 0) {
              console.log(chalk.yellow('No hay switches disponibles'));
              return;
            }

            targetDevice = await select({
              message: 'Selecciona el switch',
              choices: switches.map((d: any) => ({ name: d.name, value: d.name })),
            });
          } finally {
            await controller.stop();
          }
        }

        if (!options.interfaces) {
          console.error(chalk.red('✗) Se requiere --interfaces'));
          process.exit(1);
        }

        const interfaces = options.interfaces.split(',').map((s: string) => s.trim());
        const groupId = parseInt(options.groupId, 10);
        
        const opts: EtherchannelCreateOptions = {
          groupId,
          interfaces,
          mode: options.mode as any,
          protocol: options.protocol as any,
          trunk: options.trunk,
          allowedVlans: options.allowedVlans,
          nativeVlan: options.nativeVlan ? parseInt(options.nativeVlan, 10) : undefined,
          description: options.description,
          dryRun: options.dryRun
        };

        const commands = buildEtherchannelCommands(groupId, interfaces, opts);

        console.log(`\n⚙️  EtherChannel Group ${groupId} (${options.protocol}) en ${targetDevice}`);
        console.log(`   Interfaces: ${interfaces.join(', ')}`);
        console.log(`   Mode: ${options.mode}\n`);

        if (options.dryRun) {
          console.log('--- Commands (dry-run) ---');
          commands.forEach(c => console.log(c));
        } else {
          const controller = createDefaultPTController();
          await controller.start();
          try {
            await controller.configIos(targetDevice, commands);
            console.log(chalk.green('✅ EtherChannel configurado'));
            commands.forEach(c => console.log(chalk.gray('  ' + c)));
          } finally {
            await controller.stop();
          }
        }
      } catch (error) {
        console.error(`${chalk.red('✗')} Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  cmd
    .command('remove')
    .description('Remove an EtherChannel bundle')
    .argument('[device]', 'Nombre del dispositivo')
    .option('--group-id <id>', 'Channel group ID (1-64)', '1')
    .option('--interfaces <interfaces>', 'Member interfaces to release')
    .option('--dry-run', 'Show commands without applying', false)
    .action(async (deviceName, options) => {
      try {
        let targetDevice = deviceName;

        if (!targetDevice) {
          const controller = createDefaultPTController();
          await controller.start();
          try {
            const devices = await controller.listDevices();
            targetDevice = await select({
              message: 'Selecciona el switch',
              choices: devices.map((d: any) => ({ name: d.name, value: d.name })),
            });
          } finally {
            await controller.stop();
          }
        }

        const groupId = parseInt(options.groupId, 10);
        const commands = [
          `no interface Port-channel${groupId}`
        ];

        console.log(`\n🗑️  Removiendo EtherChannel Group ${groupId} de ${targetDevice}`);

        if (options.dryRun) {
          console.log('--- Commands (dry-run) ---');
          commands.forEach(c => console.log(c));
        } else {
          const controller = createDefaultPTController();
          await controller.start();
          try {
            await controller.configIos(targetDevice, commands);
            console.log(chalk.green('✅ EtherChannel removido'));
          } finally {
            await controller.stop();
          }
        }
      } catch (error) {
        console.error(`${chalk.red('✗')} Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  cmd
    .command('list')
    .description('List EtherChannel bundles')
    .argument('[device]', 'Nombre del dispositivo')
    .action(async (deviceName) => {
      try {
        let targetDevice = deviceName;

        if (!targetDevice) {
          const controller = createDefaultPTController();
          await controller.start();
          try {
            const devices = await controller.listDevices();
            targetDevice = await select({
              message: 'Selecciona el switch',
              choices: devices.map((d: any) => ({ name: d.name, value: d.name })),
            });
          } finally {
            await controller.stop();
          }
        }

        const controller = createDefaultPTController();
        await controller.start();
        try {
          const result = await controller.execIos(targetDevice, 'show etherchannel summary', true);
          console.log(result.raw);
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