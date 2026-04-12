#!/usr/bin/bin bun
/**
 * Comando host - Gestión de dispositivos host (PC/Server-PT)
 */

import { Command } from 'commander';
import type { PTController } from '@cisco-auto/pt-control';
import { select, input } from '@inquirer/prompts';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';
import { runCommand } from '../application/run-command.js';
import { printExamples } from '../ux/examples.js';
import { formatNextSteps } from '../ux/next-steps.js';
import { fetchDeviceList, formatDevice } from '../utils/device-utils.js';

const HOST_CONFIG_META: CommandMeta = {
  id: 'host.config',
  summary: 'Configurar red del host (IP, gateway, DNS, DHCP)',
  longDescription: 'Configura los parámetros de red de un dispositivo host (PC/Server-PT) en Packet Tracer, incluyendo dirección IP, máscara, gateway, DNS, IPv6, firewall y MTU.',
  examples: [
    {
      command: 'pt host config PC1 --ip 192.168.1.10 --mask 255.255.255.0 --gateway 192.168.1.1',
      description: 'Configurar IP estática en PC1'
    },
    {
      command: 'pt host config PC1 --dhcp',
      description: 'Habilitar DHCP en PC1'
    },
    {
      command: 'pt host config PC1 --ip 192.168.1.10 --mask 255.255.255.0 --gateway 192.168.1.1 --dns 8.8.8.8',
      description: 'Configurar IP con DNS'
    },
    {
      command: 'pt host config PC1 --ipv6-enabled --ipv6-auto-config',
      description: 'Habilitar IPv6 con auto-configuración'
    }
  ],
  related: ['device get', 'show ip interface brief'],
  nextSteps: ['pt host inspect <device>'],
  tags: ['host', 'config', 'ip', 'dhcp', 'ipv6'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: true,
  supportsExplain: true
};

const HOST_INSPECT_META: CommandMeta = {
  id: 'host.inspect',
  summary: 'Inspeccionar estado del host',
  longDescription: 'Obtiene información detallada de la configuración de red de un dispositivo host (PC/Server-PT).',
  examples: [
    {
      command: 'pt host inspect PC1',
      description: 'Inspeccionar configuración de PC1'
    },
    {
      command: 'pt host inspect Server1 --json',
      description: 'Inspeccionar Server1 en formato JSON'
    }
  ],
  related: ['device get', 'host config'],
  nextSteps: ['pt host config <device>'],
  tags: ['host', 'inspect', 'info'],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: true
};

interface HostConfigResult {
  device: string;
  ip: string | null;
  mask: string | null;
  gateway: string | null;
  dns: string | null;
  dhcp: boolean;
}

interface HostInspectResult {
  name: string;
  model: string;
  type: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

export function createHostCommand(): Command {
  const host = new Command('host')
    .description('Gestionar dispositivos host (PC/Server-PT)');

  host.addCommand(createHostConfigCommand());
  host.addCommand(createHostInspectCommand());

  return host;
}

function createHostConfigCommand(): Command {
  const cmd = new Command('config')
    .description('Configurar red del host')
    .argument('[device]', 'Nombre del dispositivo')
    .option('--ip <ip>', 'Dirección IPv4')
    .option('--mask <mask>', 'Máscara de subred')
    .option('--gateway <gateway>', 'Gateway por defecto')
    .option('--dns <dns>', 'Servidor DNS')
    .option('--dhcp', 'Habilitar DHCP', false)
    .option('--ipv6-enabled', 'Habilitar IPv6')
    .option('--ipv6-auto-config', 'Auto-configuración IPv6')
    .option('--ipv6-address <address>', 'Dirección IPv6')
    .option('--ipv6-gateway <gateway>', 'Gateway IPv6')
    .option('--ipv6-dns <dns>', 'DNS IPv6')
    .option('--firewall-ipv4 <state>', 'Firewall IPv4 (on/off)')
    .option('--firewall-ipv6 <state>', 'Firewall IPv6 (on/off)')
    .option('--mtu <value>', 'MTU general', parseInt)
    .option('--mtu-ipv4 <value>', 'MTU IPv4', parseInt)
    .option('--mtu-ipv6 <value>', 'MTU IPv6', parseInt)
    .option('-i, --interactive', 'Completar datos faltantes de forma interactiva', false)
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false)
    .option('--verify', 'Verificar cambios post-ejecución', true)
    .option('--no-verify', 'Omitir verificación post-ejecución', false)
    .option('--trace', 'Activar traza estructurada de la ejecución', false)
    .action(async (device, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');
      const globalTrace = process.argv.includes('--trace');
      const globalJson = process.argv.includes('--json');

      const verifyEnabled = options.verify ?? true;

      if (globalExamples) {
        console.log(printExamples(HOST_CONFIG_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(HOST_CONFIG_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(HOST_CONFIG_META.longDescription ?? HOST_CONFIG_META.summary);
        return;
      }

      if (globalPlan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Seleccionar dispositivo: ${device ?? '<device>'}`);
        if (options.dhcp) {
          console.log('  2. Activar modo DHCP');
        } else {
          console.log(`  2. Configurar IP: ${options.ip ?? '<ip>'}`);
          console.log(`  3. Máscara: ${options.mask ?? '<mask>'}`);
          if (options.gateway) console.log(`  4. Gateway: ${options.gateway}`);
          if (options.dns) console.log(`  5. DNS: ${options.dns}`);
        }
        console.log('  6. Aplicar configuración en Packet Tracer');
        return;
      }

      let deviceName = device;
      let ipAddress = options.ip;
      let subnetMask = options.mask;
      let gatewayAddr = options.gateway;
      let dnsServer = options.dns;
      const dhcpEnabled = options.dhcp ?? false;

      const flags: GlobalFlags = {
        json: globalJson,
        jq: null,
        output: 'text',
        verbose: false,
        quiet: false,
        trace: globalTrace,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: globalPlan,
        verify: verifyEnabled,
      };

      const result = await runCommand<HostConfigResult>({
        action: 'host.config',
        meta: HOST_CONFIG_META,
        flags,
        payloadPreview: {
          device: deviceName,
          ip: ipAddress,
          mask: subnetMask,
          gateway: gatewayAddr,
          dns: dnsServer,
          dhcp: dhcpEnabled,
        },
        execute: async (ctx): Promise<CliResult<HostConfigResult>> => {
          const { controller } = ctx;

          await controller.start();

          try {
            if (!deviceName && !options.interactive) {
              return createErrorResult('host.config', {
                message: 'Debes pasar el dispositivo o usar --interactive',
                details: { device: deviceName }
              }) as CliResult<HostConfigResult>;
            }

            if (!deviceName) {
              const devices = await fetchDeviceList(controller);
              if (devices.length === 0) {
                return createErrorResult('host.config', {
                  message: 'No hay dispositivos en la topología',
                  details: {}
                }) as CliResult<HostConfigResult>;
              }

              const hostDevices = devices.filter(d => d.type === 'pc' || d.type === 'server');

              if (hostDevices.length === 0) {
                return createErrorResult('host.config', {
                  message: 'No hay dispositivos host (PC/Server-PT) en la topología',
                  details: {}
                }) as CliResult<HostConfigResult>;
              }

              const deviceChoices = hostDevices.map((d) => ({
                name: formatDevice(d),
                value: d.name,
              }));

              deviceName = await select({
                message: 'Selecciona dispositivo host',
                choices: deviceChoices,
              });
            }

            if (!dhcpEnabled) {
              if (!ipAddress && !options.interactive) {
                return createErrorResult('host.config', {
                  message: 'Debes pasar IP y máscara, o usar --interactive',
                  details: { device: deviceName }
                }) as CliResult<HostConfigResult>;
              }

              if (!ipAddress) {
                ipAddress = await input({
                  message: 'Dirección IP:',
                  validate: (value) => {
                    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                    return ipRegex.test(value) || 'IP inválida (formato: x.x.x.x)';
                  },
                });
              }

              if (!subnetMask && !options.interactive) {
                return createErrorResult('host.config', {
                  message: 'Debes pasar IP y máscara, o usar --interactive',
                  details: { device: deviceName }
                }) as CliResult<HostConfigResult>;
              }

              if (!subnetMask) {
                subnetMask = await input({
                  message: 'Máscara (ej: 255.255.255.0):',
                  default: '255.255.255.0',
                  validate: (value) => {
                    const maskRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                    return maskRegex.test(value) || 'Máscara inválida';
                  },
                });
              }

              if (!gatewayAddr && options.interactive) {
                gatewayAddr = await input({
                  message: 'Gateway (opcional):',
                  validate: (value) => {
                    if (!value) return true;
                    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
                    return ipRegex.test(value) || 'Gateway inválido';
                  },
                });
              }
            }

            const configPayload: {
              ip?: string;
              mask?: string;
              gateway?: string;
              dns?: string;
              dhcp?: boolean;
            } = {
              dhcp: dhcpEnabled,
            };

            if (!dhcpEnabled) {
              if (ipAddress) configPayload.ip = ipAddress;
              if (subnetMask) configPayload.mask = subnetMask;
              if (gatewayAddr) configPayload.gateway = gatewayAddr;
              if (dnsServer) configPayload.dns = dnsServer;
            }

            await controller.configHost(deviceName, configPayload);

            const resultData: HostConfigResult = {
              device: deviceName,
              ip: ipAddress ?? null,
              mask: subnetMask ?? null,
              gateway: gatewayAddr ?? null,
              dns: dnsServer ?? null,
              dhcp: dhcpEnabled,
            };

            return createSuccessResult('host.config', resultData, {
              advice: [
                `Ejecuta 'pt host inspect ${deviceName}' para verificar la configuración`,
              ],
            });
          } finally {
            await controller.stop();
          }
        },
      });

      if (result.ok && result.data && !flags.json) {
        console.log(`\n✓ Host ${result.data.device} configurado`);
        if (result.data.dhcp) {
          console.log('  DHCP: habilitado');
        } else {
          console.log(`  IP: ${result.data.ip}/${result.data.mask}`);
          if (result.data.gateway) console.log(`  Gateway: ${result.data.gateway}`);
          if (result.data.dns) console.log(`  DNS: ${result.data.dns}`);
        }
        if (result.advice && result.advice.length > 0) {
          console.log('\nSiguientes pasos:');
          result.advice.forEach((step: string) => console.log(`  ${step}`));
        }
      } else if (!result.ok) {
        console.error(`\n❌ Error: ${result.error?.message || 'Error desconocido'}`);
        if (result.error?.details) {
          console.error('Detalles:', result.error.details);
        }
        process.exit(1);
      }

      if (flags.json) {
        console.log(JSON.stringify(result, null, 2));
      }
    });

  return cmd;
}

function createHostInspectCommand(): Command {
  const cmd = new Command('inspect')
    .description('Inspeccionar estado del host')
    .argument('<device>', 'Nombre del dispositivo (ej: PC1, Server1)')
    .option('--json', 'Salida en formato JSON')
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .action(async (deviceName, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalJson = process.argv.includes('--json');

      if (globalExamples) {
        console.log(printExamples(HOST_INSPECT_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(HOST_INSPECT_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(HOST_INSPECT_META.longDescription ?? HOST_INSPECT_META.summary);
        return;
      }

      const flags: GlobalFlags = {
        json: globalJson,
        jq: null,
        output: 'text',
        verbose: false,
        quiet: false,
        trace: false,
        tracePayload: false,
        traceResult: false,
        traceDir: null,
        traceBundle: false,
        traceBundlePath: null,
        sessionId: null,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        plan: false,
        verify: false,
      };

      const result = await runCommand<HostInspectResult>({
        action: 'host.inspect',
        meta: HOST_INSPECT_META,
        flags,
        payloadPreview: { deviceName },
        execute: async (ctx): Promise<CliResult<HostInspectResult>> => {
          const { controller } = ctx;

          await controller.start();

          try {
            const device = await controller.inspectHost(deviceName);

            if (!device || !device.name) {
              return createErrorResult('host.inspect', {
                message: `Dispositivo host '${deviceName}' no encontrado`,
                details: { device: deviceName }
              }) as CliResult<HostInspectResult>;
            }

            const resultData: HostInspectResult = {
              name: device.name,
              model: device.model,
              type: device.type,
              ip: device.ip,
              mask: device.mask,
              gateway: device.gateway,
              dns: device.dns,
              dhcp: device.dhcp,
            };

            return createSuccessResult('host.inspect', resultData);
          } finally {
            await controller.stop();
          }
        }
      });

      if (result.ok && result.data && !flags.json) {
        console.log(`\n📱 ${result.data.name}:`);
        console.log('━'.repeat(60));
        console.log(`Tipo: ${result.data.type}`);
        console.log(`Modelo: ${result.data.model}`);

        if (result.data.dhcp !== undefined) {
          console.log(`DHCP: ${result.data.dhcp ? 'Sí' : 'No'}`);
        }

        if (result.data.ip) {
          console.log(`IP: ${result.data.ip}/${result.data.mask || 'N/A'}`);
        }

        if (result.data.gateway) {
          console.log(`Gateway: ${result.data.gateway}`);
        }

        if (result.data.dns) {
          console.log(`DNS: ${result.data.dns}`);
        }

        if (result.advice && result.advice.length > 0) {
          console.log('\nSiguientes pasos:');
          result.advice.forEach((step: string) => console.log(`  ${step}`));
        }
      } else if (!result.ok) {
        console.error(`\n❌ Error: ${result.error?.message || 'Error desconocido'}`);
        if (result.error?.details) {
          console.error('Detalles:', result.error.details);
        }
        process.exit(1);
      }

      if (flags.json) {
        console.log(JSON.stringify(result, null, 2));
      }
    });

  return cmd;
}