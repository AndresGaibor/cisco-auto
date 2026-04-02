import { Command } from 'commander';
import { pushCommands } from '@cisco-auto/file-bridge';

const VLAN_LIST_SEPARATOR = ',';

function parseVlanIds(raw: string): number[] {
  const ids = raw
    .split(VLAN_LIST_SEPARATOR)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => Number(token));

  if (ids.length === 0 || ids.some((value) => Number.isNaN(value) || value < 1 || value > 4094)) {
    throw new Error('La lista de VLANs debe contener IDs válidos entre 1 y 4094');
  }

  return ids;
}

export function buildVlanCreateCommands(name: string, id: number, description?: string): string[] {
  const commands = ['! Configuración de VLANs'];
  commands.push(`vlan ${id}`);
  commands.push(` name ${name}`);
  if (description) {
    commands.push(` description ${description}`);
  }
  commands.push(' exit');
  return commands;
}

export function buildVlanApplyCommands(vlanIds: number[]): string[] {
  const commands = ['! Configuración de VLANs'];
  for (const id of vlanIds) {
    commands.push(`vlan ${id}`);
    commands.push(` name VLAN${id}`);
    commands.push(' exit');
  }
  return commands;
}

export function buildVlanTrunkCommands(iface: string, allowedVlans: number[]): string[] {
  return [
    '! Configuración de interfaces',
    `interface ${iface}`,
    ' switchport mode trunk',
    ` switchport trunk allowed vlan ${allowedVlans.join(',')}`,
    ' no shutdown',
    ' exit',
  ];
}

function logCommands(commands: string[], title: string) {
  console.log(title);
  commands.forEach((cmd) => console.log(cmd));
}

export function createLabVlanCommand(): Command {
  const command = new Command('vlan').description('Comandos para gestionar VLANs');

  command
    .command('create')
    .description('Generar comandos IOS para crear una VLAN')
    .requiredOption('--name <name>', 'Nombre de la VLAN')
    .requiredOption('--id <id>', 'ID de la VLAN (1-4094)')
    .option('--description <text>', 'Descripción opcional de la VLAN')
    .action((options) => {
      try {
        const id = Number(options.id);
        if (Number.isNaN(id) || id < 1 || id > 4094) {
          throw new Error('El ID de VLAN debe ser un número entre 1 y 4094');
        }

        const commands = buildVlanCreateCommands(options.name, id, options.description);
        logCommands(commands, '➡️  Comandos VLAN generados:');
      } catch (error) {
        console.error('❌ Error creando VLAN:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  command
    .command('apply')
    .description('Aplicar VLANs a un switch (crea las VLANs solicitadas)')
    .requiredOption('--device <name>', 'Nombre del dispositivo destino')
    .requiredOption('--vlans <list>', 'Lista de IDs de VLAN separadas por comas (ej: 10,20)')
    .action(async (options) => {
      try {
        const vlanIds = parseVlanIds(options.vlans);
        const commands = buildVlanApplyCommands(vlanIds);

        logCommands(commands, '➡️  Comandos VLAN generados para aplicar:');

        const result = await pushCommands(options.device, commands);
        if (result.success) {
          console.log(`✅ VLANs aplicadas a ${options.device} (commandId=${result.commandId ?? 'n/a'})`);
        } else {
          console.error('❌ Error al aplicar VLANs:', result.error);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Error aplicando VLANs:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  command
    .command('trunk')
    .description('Configurar un enlace trunk en un switch')
    .requiredOption('--device <name>', 'Dispositivo objetivo')
    .requiredOption('--interface <iface>', 'Interfaz que será trunk')
    .requiredOption('--allowed <list>', 'Lista de VLANs permitidas (ej: 10,20)')
    .action(async (options) => {
      try {
        const vlanIds = parseVlanIds(options.allowed);
        const commands = buildVlanTrunkCommands(options.interface, vlanIds);

        logCommands(commands, '➡️  Comandos para configurar trunk:');

        const result = await pushCommands(options.device, commands);
        if (result.success) {
          console.log(`✅ Trunk configurado en ${options.device} (commandId=${result.commandId ?? 'n/a'})`);
        } else {
          console.error('❌ Error configurando trunk:', result.error);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Error configurando trunk:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return command;
}
