import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import yaml from 'js-yaml';
import { loadLabYaml, toLabSpec } from '../contracts/lab-spec.js';
import type { DeviceConfigSpecInput } from '@cisco-auto/kernel/plugins/orchestrator';
import { orchestrateConfig } from '@cisco-auto/kernel/plugins/orchestrator';
import { createDefaultPTController } from '@cisco-auto/pt-control';

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

function buildDeviceConfigSpec(device: any): DeviceConfigSpecInput {
  const deviceName = device.name ?? 'unknown';
  const spec: DeviceConfigSpecInput = { deviceName };

  if (device.hostname || device.name) {
    spec.basic = { hostname: device.hostname ?? device.name };
  }

  if (device.vlans && device.vlans.length > 0) {
    spec.vlan = {
      vlans: device.vlans.map((v: { id?: number | string; name?: string }) => ({
        id: Number(v.id) ?? 1,
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

      const parsedLab = loadLabYaml(file);
      const labSpec = toLabSpec(parsedLab);

      if (labSpec.devices.length === 0) {
        console.error(chalk.red('❌ No se encontraron dispositivos en el archivo YAML'));
        process.exit(1);
      }

      let filteredDevices = labSpec.devices;
      if (options.device) {
        filteredDevices = labSpec.devices.filter((d) => d.name === options.device);
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

      let controller: ReturnType<typeof createDefaultPTController> | undefined;
      if (!options.dryRun) {
        controller = createDefaultPTController();
        await controller.start();
      }

      try {
        for (const device of filteredDevices) {
          const deviceName = device.name ?? 'unknown';
          try {
            const spec = buildDeviceConfigSpec(device);
            const commands = await orchestrateConfig(spec);

            let success = true;
            let errors: string[] = [];

            if (commands.length > 0 && controller) {
              try {
                if (device.type === 'pc' || device.type === 'server') {
                  const opts: any = {};
                  if (device.interfaces?.[0]?.ip) opts.ip = device.interfaces[0].ip.split('/')[0];
                  if (device.interfaces?.[0]?.subnetMask) opts.mask = device.interfaces[0].subnetMask;
                  
                  await controller.configHost(deviceName, opts);
                } else {
                  await controller.configIos(deviceName, commands);
                }
              } catch (e: any) {
                success = false;
                errors = [e.message];
              }
            }

            results.push({
              deviceName,
              commandsGenerated: commands.length,
              success,
              errors,
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
      } finally {
        if (controller) {
          await controller.stop();
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
