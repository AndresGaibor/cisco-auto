import { Command } from 'commander';
import STPGenerator from '../../../../src/core/config-generators/stp.generator.ts';
import { pushCommands } from '../../../../src/bridge/ios-command-pusher.ts';

function generateConfigureCommands(mode: 'pvst' | 'rapid-pvst' | 'mst') {
  const spec = { mode } as any;
  return STPGenerator.generate(spec);
}

function generateSetRootCommands(vlan: number, priority?: number) {
  const spec: any = {
    mode: 'pvst',
    vlanConfig: [],
    rootPrimary: [vlan]
  };

  if (typeof priority === 'number') {
    spec.vlanConfig.push({ vlanId: vlan, priority });
  }

  return STPGenerator.generate(spec);
}

export function createStpCommand(): Command {
  const cmd = new Command('stp').description('Comandos para configurar Spanning Tree Protocol (STP)');

  cmd.command('configure')
    .description('Configurar modo STP en un dispositivo')
    .requiredOption('--device <name>', 'Nombre del dispositivo target')
    .requiredOption('--mode <mode>', 'Modo STP (pvst|rapid-pvst|mst)')
    .option('--dry-run', 'Imprimir comandos en lugar de enviarlos', false)
    .action(async (options) => {
      try {
        const device = options.device as string;
        const mode = options.mode as string;

        if (!['pvst', 'rapid-pvst', 'mst'].includes(mode)) {
          console.error('Modo inválido. Use pvst, rapid-pvst o mst');
          process.exit(1);
        }

        const commands = generateConfigureCommands(mode as any);

        if (options.dryRun) {
          console.log(commands.join('\n'));
          return;
        }

        const result = await pushCommands(device, commands);
        if (result.success) {
          console.log(`✅ Comandos enviados a ${device} (id: ${result.commandId || 'n/a'})`);
        } else {
          console.error('❌ Error enviando comandos:', result.error);
          process.exit(1);
        }
      } catch (err) {
        console.error('❌ Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  cmd.command('set-root')
    .description('Configurar root bridge para una VLAN (primary)')
    .requiredOption('--device <name>', 'Nombre del dispositivo target')
    .requiredOption('--vlan <id>', 'ID de VLAN', (v: string) => Number(v))
    .option('--priority <value>', 'Priority para la VLAN (multiplo de 4096)', (v: string) => Number(v))
    .option('--dry-run', 'Imprimir comandos en lugar de enviarlos', false)
    .action(async (options) => {
      try {
        const device = options.device as string;
        const vlan = Number(options.vlan) as number;
        const priority = options.priority !== undefined ? Number(options.priority) : undefined;

        if (Number.isNaN(vlan) || vlan < 1 || vlan > 4094) {
          console.error('VLAN inválida. Debe estar entre 1 y 4094');
          process.exit(1);
        }

        const commands = generateSetRootCommands(vlan, priority);

        if (options.dryRun) {
          console.log(commands.join('\n'));
          return;
        }

        const result = await pushCommands(device, commands);
        if (result.success) {
          console.log(`✅ Comandos enviados a ${device} (id: ${result.commandId || 'n/a'})`);
        } else {
          console.error('❌ Error enviando comandos:', result.error);
          process.exit(1);
        }
      } catch (err) {
        console.error('❌ Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  return cmd;
}

export { generateConfigureCommands, generateSetRootCommands };
