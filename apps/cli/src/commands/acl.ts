import { Command } from 'commander';
import { SecurityGenerator } from '../../../../src/core/config-generators/security-generator.ts';
import { pushCommands } from '../../../../src/bridge/ios-command-pusher.ts';

/**
 * Comandos CLI para gestionar ACLs: create, add-rule, apply
 */
export function createACLCommand(): Command {
  const cmd = new Command('acl').description('Comandos para gestionar ACLs');

  // cisco-auto lab acl create --name <name> --type <standard|extended>
  cmd.command('create')
    .description('Crear una ACL')
    .requiredOption('--name <name>', 'Nombre de la ACL')
    .requiredOption('--type <type>', 'Tipo de ACL (standard|extended)')
    .action(async (options) => {
      try {
        const name = options.name;
        const type = options.type === 'extended' ? 'extended' : 'standard';

        // Creamos una ACL vacía en memoria (solo para generar comandos IOS)
        const acls = [{ name, type, entries: [] }];
        const commands = SecurityGenerator.generateACLs(acls as any);

        console.log(commands.join('\n'));
      } catch (err) {
        console.error('❌ Error:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  // cisco-auto lab acl add-rule --acl <name> --rule "<action> <protocol> <source> <dest>"
  cmd.command('add-rule')
    .description('Agregar una regla a una ACL (genera comando IOS en stdout)')
    .requiredOption('--acl <name>', 'Nombre de la ACL')
    .requiredOption('--rule <rule>', 'Regla en formato: "<action> <protocol> <source> <dest>"')
    .action(async (options) => {
      try {
        const aclName = options.acl;
        const rule = options.rule.trim();

        // Parse simple rule: action protocol source [sourceWildcard] [destination [destWildcard]] [eq port] [log]
        // Mantener simple: pasamos la regla tal cual al comando access-list
        const cmdLine = `access-list ${aclName} ${rule}`;
        console.log(cmdLine);
      } catch (err) {
        console.error('❌ Error:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  // cisco-auto lab acl apply --acl <name> --device <name> --interface <iface> --direction <in|out>
  cmd.command('apply')
    .description('Aplicar una ACL a una interfaz de dispositivo (envía comandos al bridge)')
    .requiredOption('--acl <name>', 'Nombre o número de la ACL')
    .requiredOption('--device <device>', 'Nombre del dispositivo destino')
    .requiredOption('--interface <iface>', 'Interfaz donde aplicar la ACL')
    .requiredOption('--direction <dir>', 'Dirección de la ACL (in|out)')
    .action(async (options) => {
      try {
        const acl = options.acl;
        const device = options.device;
        const iface = options.interface;
        const dir = options.direction === 'out' ? 'out' : 'in';

        // Generar comandos para aplicar la ACL en la interfaz
        const commands = [`interface ${iface}`, `ip access-group ${acl} ${dir}`];

        // Enviar al bridge
        const res = await pushCommands(device, commands);
        if (res.success) {
          console.log('✅ ACL aplicada correctamente. Id:', res.commandId);
        } else {
          console.error('❌ Falló al aplicar ACL:', res.error);
          process.exit(1);
        }
      } catch (err) {
        console.error('❌ Error:', err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  return cmd;
}

export default createACLCommand;
