import { Command } from 'commander';
import { ServicesGenerator } from '@cisco-auto/core';
import { pushCommands } from '@cisco-auto/file-bridge';

// Convierte un sufijo CIDR (ej: /24) a máscara en formato punteado
function cidrToMask(cidr: number): string {
  const mask = (0xffffffff << (32 - cidr)) >>> 0;
  return [(mask >>> 24) & 0xff, (mask >>> 16) & 0xff, (mask >>> 8) & 0xff, mask & 0xff].join('.');
}

// Parsea una entrada de red en formato CIDR (192.168.1.0/24) o solo red
function parseNetwork(input: string): { network: string; subnetMask: string } {
  if (!input) return { network: '0.0.0.0', subnetMask: '255.255.255.0' };
  const parts = input.split('/');
  if (parts.length === 2) {
    const cidr = Number(parts[1]);
    const mask = Number.isFinite(cidr) ? cidrToMask(cidr) : '255.255.255.0';
    return { network: parts[0]!, subnetMask: mask };
  }
  // Si no tiene / asumimos máscara /24
  return { network: input, subnetMask: '255.255.255.0' };
}

// Generadores reutilizables (exportados para tests)
export function buildDhcpCommands(poolName: string, networkCidr: string) {
  const { network, subnetMask } = parseNetwork(networkCidr);
  const spec = {
    poolName,
    network,
    subnetMask,
  } as any;

  // Validar antes de generar
  const validation = (ServicesGenerator as any).validateDHCP(spec);
  if (!validation.valid) {
    throw new Error(`Invalid DHCP spec: ${validation.errors.join('; ')}`);
  }

  return ServicesGenerator.generateDHCP([spec]);
}

export function buildNtpCommands(server: string) {
  const spec = { servers: [{ ip: server }] } as any;
  const validation = (ServicesGenerator as any).validateNTP(spec);
  if (!validation.valid) {
    throw new Error(`Invalid NTP spec: ${validation.errors.join('; ')}`);
  }

  return ServicesGenerator.generateNTP(spec);
}

export function buildSyslogCommands(server: string) {
  const spec = { servers: [{ ip: server }] } as any;
  return ServicesGenerator.generateSyslog(spec);
}

// Comando principal 'lab services'
export function createLabServicesCommand(): Command {
  const cmd = new Command('services').description('Comandos para configurar servicios de red (DHCP/NTP/Syslog)');

  // --- DHCP subcommand: lab services dhcp create --device <name> --pool <name> --network <cidr>
  const dhcpCmd = new Command('dhcp')
    .description('Operaciones sobre DHCP')
    .addCommand(
      new Command('create')
        .description('Crear pool DHCP en un dispositivo')
        .requiredOption('--device <name>', 'Nombre del dispositivo objetivo')
        .requiredOption('--pool <name>', 'Nombre del pool DHCP')
        .requiredOption('--network <cidr>', 'Red en formato CIDR (ej: 192.168.1.0/24)')
        .action(async (options) => {
          try {
            const opts = options as { pool: string; network: string; device: string };
            const commands = buildDhcpCommands(opts.pool!, opts.network!);

            console.log('➡️  Comandos IOS generados para DHCP:');
            console.log(commands.join('\n'));

            const res = await pushCommands(opts.device!, commands);
            if (res.success) {
              console.log(`✅ Comandos enviados correctamente. commandId=${res.commandId}`);
            } else {
              console.error(`❌ Error al enviar comandos: ${res.error}`);
              process.exit(1);
            }
          } catch (err) {
            console.error('❌ Error:', err instanceof Error ? err.message : String(err));
            process.exit(1);
          }
        })
    );

  // --- NTP subcommand: lab services ntp add-server --device <name> --server <ip>
  const ntpCmd = new Command('ntp')
    .description('Operaciones sobre NTP')
    .addCommand(
      new Command('add-server')
        .description('Añadir servidor NTP a un dispositivo')
        .requiredOption('--device <name>', 'Nombre del dispositivo objetivo')
        .requiredOption('--server <ip>', 'IP o hostname del servidor NTP')
        .action(async (options) => {
          try {
            const opts = options as { server: string; device: string };
            const commands = buildNtpCommands(opts.server!);

            console.log('➡️  Comandos IOS generados para NTP:');
            console.log(commands.join('\n'));

            const res = await pushCommands(opts.device!, commands);
            if (res.success) {
              console.log(`✅ Comandos enviados correctamente. commandId=${res.commandId}`);
            } else {
              console.error(`❌ Error al enviar comandos: ${res.error}`);
              process.exit(1);
            }
          } catch (err) {
            console.error('❌ Error:', err instanceof Error ? err.message : String(err));
            process.exit(1);
          }
        })
    );

  // --- Syslog subcommand: lab services syslog add-server --device <name> --server <ip>
  const syslogCmd = new Command('syslog')
    .description('Operaciones sobre Syslog')
    .addCommand(
      new Command('add-server')
        .description('Añadir servidor Syslog a un dispositivo')
        .requiredOption('--device <name>', 'Nombre del dispositivo objetivo')
        .requiredOption('--server <ip>', 'IP del servidor Syslog')
        .action(async (options) => {
          try {
            const opts = options as { server: string; device: string };
            const commands = buildSyslogCommands(opts.server!);

            console.log('➡️  Comandos IOS generados para Syslog:');
            console.log(commands.join('\n'));

            const res = await pushCommands(opts.device!, commands);
            if (res.success) {
              console.log(`✅ Comandos enviados correctamente. commandId=${res.commandId}`);
            } else {
              console.error(`❌ Error al enviar comandos: ${res.error}`);
              process.exit(1);
            }
          } catch (err) {
            console.error('❌ Error:', err instanceof Error ? err.message : String(err));
            process.exit(1);
          }
        })
    );

  cmd.addCommand(dhcpCmd);
  cmd.addCommand(ntpCmd);
  cmd.addCommand(syslogCmd);

  return cmd;
}

export default createLabServicesCommand;
