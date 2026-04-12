import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import yaml from 'js-yaml';
import type { DeviceConfigSpecInput } from '@cisco-auto/kernel/plugins/orchestrator';
import { orchestrateConfig } from '@cisco-auto/kernel/plugins/orchestrator';

interface ParsedDevice {
  name?: string;
  type?: string;
  model?: string;
  hostname?: string;
  management?: { ip?: string };
  interfaces?: Array<{
    name?: string;
    ip?: string;
    subnetMask?: string;
    description?: string;
    enabled?: boolean;
    mode?: string;
    vlan?: number;
    [key: string]: unknown;
  }>;
  vlans?: Array<{ id?: number | string; name?: string }>;
  routing?: {
    ospf?: { processId?: number; areas?: Array<{ areaId?: number | string; networks?: Array<{ network?: string; wildcard?: string }> }> };
    eigrp?: { asNumber?: number; networks?: string[] };
    static?: Array<{ network?: string; mask?: string; nextHop?: string }>;
  };
  security?: {
    acls?: Array<{ name?: string; type?: 'standard' | 'extended'; rules?: Array<{ action?: 'permit' | 'deny'; protocol?: string; source?: string; destination?: string; destinationPort?: string }> }>;
  };
  services?: {
    dhcp?: Array<{ name?: string; network?: string; mask?: string; defaultRouter?: string; dnsServers?: string[] }>;
    ntp?: { servers?: Array<{ ip?: string }> };
  };
  [key: string]: unknown;
}

interface ParsedLabYaml {
  lab?: {
    metadata?: { name?: string; version?: string; author?: string };
    topology?: {
      devices?: ParsedDevice[];
      connections?: Array<{
        from?: string | { device?: string; port?: string };
        to?: string | { device?: string; port?: string };
        type?: string;
        [key: string]: unknown;
      }>;
    };
  };
}

interface DeployDeviceResult {
  deviceName: string;
  commandsGenerated: number;
  success: boolean;
  errors: string[];
  warnings: string[];
}

interface DeploySummary {
  total: number;
  successful: number;
  failed: number;
  totalCommands: number;
}

interface DeployResult {
  devices: DeployDeviceResult[];
  summary: DeploySummary;
  duration: number;
  success: boolean;
}

function parseLabYaml(filePath: string): ParsedLabYaml {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(content) as ParsedLabYaml;
  return parsed;
}

function buildDeviceConfigSpec(device: ParsedDevice): DeviceConfigSpecInput {
  const deviceName = device.name ?? 'unknown';
  const spec: DeviceConfigSpecInput = { deviceName };

  if (device.hostname || device.name) {
    spec.basic = { hostname: device.hostname ?? device.name };
  }

  if (device.vlans && device.vlans.length > 0) {
    spec.vlan = {
      vlans: device.vlans.map((v: { id?: number | string; name?: string }) => ({
        id: v.id ?? 1,
        name: v.name ?? `VLAN${v.id}`,
      })),
    };
  }

  if (device.interfaces && device.interfaces.length > 0) {
    const accessPorts = device.interfaces
      .filter((i: { mode?: string; vlan?: number; name?: string }) => i.mode === 'access' && i.vlan)
      .map((i: { name?: string; vlan?: number }) => ({ port: i.name ?? '', vlan: i.vlan ?? 1 }));

    if (accessPorts.length > 0) {
      spec.vlan = spec.vlan ?? {};
      spec.vlan.accessPorts = accessPorts;
    }
  }

  if (device.routing) {
    spec.routing = {};

    if (device.routing.ospf) {
      spec.routing.ospf = {
        processId: device.routing.ospf.processId ?? 1,
        areas: (device.routing.ospf.areas ?? []).map((area: { areaId?: number | string; networks?: Array<{ network?: string; wildcard?: string }> }) => ({
          areaId: area.areaId ?? 0,
          networks: (area.networks ?? []).map((n: { network?: string; wildcard?: string }) => ({
            network: n.network ?? '0.0.0.0',
            wildcard: n.wildcard ?? '0.0.0.255',
          })),
        })),
      };
    }

    if (device.routing.eigrp) {
      spec.routing.eigrp = {
        asNumber: device.routing.eigrp.asNumber ?? 100,
        networks: device.routing.eigrp.networks ?? [],
      };
    }

    if (device.routing.static) {
      spec.routing.staticRoutes = device.routing.static.map((r: { network?: string; mask?: string; nextHop?: string }) => ({
        network: r.network ?? '0.0.0.0',
        mask: r.mask ?? '0.0.0.0',
        nextHop: r.nextHop ?? '',
      }));
    }
  }

  if (device.security?.acls) {
    spec.security = {
      acls: device.security.acls.map((acl: { name?: string; type?: 'standard' | 'extended'; rules?: Array<{ action?: 'permit' | 'deny'; protocol?: string; source?: string; destination?: string; destinationPort?: string }> }) => ({
        name: acl.name ?? 'ACL-DEFAULT',
        type: acl.type ?? 'extended',
        rules: (acl.rules ?? []).map((r: { action?: 'permit' | 'deny'; protocol?: string; source?: string; destination?: string; destinationPort?: string }) => ({
          action: r.action ?? 'permit',
          protocol: r.protocol as 'ip' | 'tcp' | 'udp' | 'icmp' | undefined,
          source: r.source ?? 'any',
          destination: r.destination ?? 'any',
          destinationPort: r.destinationPort,
        })),
      })),
    };
  }

  if (device.services) {
    spec.services = {};

    if (device.services.dhcp) {
      spec.services.dhcp = device.services.dhcp.map((pool: { name?: string; network?: string; mask?: string; defaultRouter?: string; dnsServers?: string[] }) => ({
        name: pool.name ?? 'DHCP-POOL',
        network: pool.network ?? '192.168.1.0',
        mask: pool.mask ?? '255.255.255.0',
        defaultRouter: pool.defaultRouter,
        dnsServers: pool.dnsServers,
      }));
    }

    if (device.services.ntp?.servers) {
      spec.services.ntp = {
        servers: device.services.ntp.servers.map((s: { ip?: string }) => ({ ip: s.ip ?? '' })),
      };
    }
  }

  return spec;
}

function formatResult(result: DeployResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    RESUMEN DE DESPLIEGUE                       ');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Duración total: ${(result.duration / 1000).toFixed(2)}s`);
  lines.push(`Estado: ${result.success ? chalk.green('✅ EXITOSO') : chalk.red('❌ FALLIDO')}`);
  lines.push('');
  lines.push('Resumen por dispositivo:');
  lines.push('─'.repeat(60));

  for (const device of result.devices) {
    const status = device.success ? chalk.green('✅') : chalk.red('❌');
    lines.push(`  ${status} ${device.deviceName.padEnd(20)} ${device.commandsGenerated} comandos`);

    if (device.errors.length > 0) {
      for (const error of device.errors) {
        lines.push(`      ⚠️  ${error}`);
      }
    }

    if (device.warnings.length > 0) {
      for (const warning of device.warnings) {
        lines.push(`      ℹ️  ${warning}`);
      }
    }
  }

  lines.push('─'.repeat(60));
  lines.push(`Total: ${result.summary.total} | ` +
             `Exitosos: ${result.summary.successful} | ` +
             `Fallidos: ${result.summary.failed} | ` +
             `Comandos: ${result.summary.totalCommands}`);
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export function createDeployCommand(): Command {
  return new Command('deploy')
    .description('Desplegar configuraciones a dispositivos Cisco usando kernel plugins')
    .argument('<file>', 'Archivo YAML del laboratorio')
    .option('-d, --device <name>', 'Desplegar solo en dispositivo específico')
    .option('--dry-run', 'Simular despliegue sin conectar a dispositivos')
    .option('-v, --verbose', 'Mostrar información detallada')
    .action(async (file, options) => {
      const startTime = Date.now();
      console.log(chalk.cyan('🚀 Despliegue de configuraciones Cisco (Kernel)'));
      console.log(`📄 Archivo: ${file}`);

      let parsed: ParsedLabYaml;
      try {
        parsed = parseLabYaml(file);
      } catch (error) {
        console.error(chalk.red(`❌ Error parseando archivo: ${(error as Error).message}`));
        process.exit(1);
      }

      const devices = parsed.lab?.topology?.devices ?? [];
      if (devices.length === 0) {
        console.error(chalk.red('❌ No se encontraron dispositivos en el archivo YAML'));
        process.exit(1);
      }

      let filteredDevices = devices;
      if (options.device) {
        filteredDevices = devices.filter((d) => d.name === options.device);
        if (filteredDevices.length === 0) {
          console.error(chalk.red(`❌ Dispositivo "${options.device}" no encontrado`));
          process.exit(1);
        }
      }

      if (options.dryRun) {
        console.log(chalk.yellow('\n📋 MODO SIMULACIÓN (dry-run)'));
        console.log('─'.repeat(60));
      }

      const results: DeployDeviceResult[] = [];
      let totalCommands = 0;

      for (const device of filteredDevices) {
        const deviceName = device.name ?? 'unknown';
        try {
          const spec = buildDeviceConfigSpec(device);
          const commands = await orchestrateConfig(spec);

          results.push({
            deviceName,
            commandsGenerated: commands.length,
            success: true,
            errors: [],
            warnings: commands.length === 0 ? ['No se generaron comandos para este dispositivo'] : [],
          });

          totalCommands += commands.length;

          if (options.verbose || options.dryRun) {
            console.log(chalk.blue(`\n📝 Comandos para ${chalk.bold(deviceName)}:`));
            commands.forEach((cmd: string, i: number) => {
              console.log(`  ${i + 1}. ${chalk.green(cmd)}`);
            });
          }
        } catch (error) {
          results.push({
            deviceName,
            commandsGenerated: 0,
            success: false,
            errors: [(error as Error).message],
            warnings: [],
          });
        }
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      const duration = Date.now() - startTime;

      const deployResult: DeployResult = {
        devices: results,
        summary: {
          total: results.length,
          successful,
          failed,
          totalCommands,
        },
        duration,
        success: failed === 0,
      };

      console.log(formatResult(deployResult));

      if (!deployResult.success) {
        process.exit(1);
      }
    });
}
