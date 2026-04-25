#!/usr/bin/bin bun
/**
 * Comando host - Gestión de dispositivos host (PC/Server-PT)
 */

import { Command } from 'commander';
import chalk from 'chalk';
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
import { createTerminalCommandService } from '@cisco-auto/pt-control';

function createTerminalCommandServiceForCli(controller: PTController) {
    return createTerminalCommandService({
        controller,
        runtimeTerminal: null as any,
        generateId: () => `cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
}

const DEVICE_TYPE_MAP: Record<number, string> = {
  0: 'router',
  1: 'switch',
  16: 'switch_layer3',
};

function normalizeDeviceType(type: string | number | undefined): string {
  if (typeof type === 'string') return type;
  if (typeof type === 'number') return DEVICE_TYPE_MAP[type] || 'unknown';
  return 'unknown';
}

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

const HOST_EXEC_META: CommandMeta = {
  id: 'host.exec',
  summary: 'Ejecutar comando en el Command Prompt del host',
  longDescription: 'Ejecuta un comando directamente en el Command Prompt de una PC o Servidor y devuelve la salida procesada.',
  examples: [
    {
      command: 'pt host exec PC1 "ipconfig"',
      description: 'Ver configuración IP de PC1'
    },
    {
      command: 'pt host exec PC1 "nslookup google.com"',
      description: 'Probar resolución DNS en PC1'
    },
    {
      command: 'pt host exec PC1 "netstat"',
      description: 'Ver conexiones activas en PC1'
    }
  ],
  related: ['ping', 'host inspect'],
  nextSteps: ['pt host inspect <device>'],
  tags: ['host', 'exec', 'command', 'prompt'],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: true
};

export function createHostCommand(): Command {
  const host = new Command('host')
    .description('Gestionar dispositivos host (PC/Server-PT)');

  host.addCommand(createHostConfigCommand());
  host.addCommand(createHostInspectCommand());
  host.addCommand(createHostExecCommand());
  host.addCommand(createHostHistoryCommand());

  return host;
}

/**
 * Acceso directo 'pt cmd' solicitado por el usuario
 */
export function createCmdShortcutCommand(): Command {
    return createHostExecCommand()
        .name('cmd')
        .alias('exec-pc')
        .description('Acceso rápido para ejecutar comandos en un host');
}

/**
 * Acceso directo 'pt history' o 'pt list' solicitado por el usuario
 */
export function createHistoryShortcutCommand(): Command {
    return createHostHistoryCommand()
        .name('history')
        .description('Acceso rápido para ver el historial de comandos de un host');
}

function createHostHistoryCommand(): Command {
  const cmd = new Command('history')
    .description('Ver el historial de comandos ejecutados en el host')
    .argument('<device>', 'Nombre del dispositivo')
    .action(async (deviceName, _options, cmd) => {
      const flags = cmd.optsWithGlobals();
      const result = await runCommand<any>({
        action: 'host.history',
        meta: { id: 'host.history', summary: 'Ver historial del host', tags: ['host', 'history'], related: [], nextSteps: [] },
        flags,
        execute: async (ctx): Promise<CliResult<any>> => {
          const { controller } = ctx;
          const history = await controller.getHostHistory(deviceName);

          return createSuccessResult('host.history', {
            device: deviceName,
            entries: history.entries,
            count: history.count,
            raw: history.raw,
            methods: history.methods
          });
        }
      });

      if (flags.json) {
        console.log(JSON.stringify(result, null, 2));
        if (!result.ok) {
          process.exitCode = 1;
        }
        return;
      }

      if (result.ok && result.data) {
        const device = chalk.bold.cyan(result.data.device);
        console.log(`\n📜 HISTORIAL DE CONSOLA (${device}):`);
        console.log(chalk.gray('━'.repeat(60)));

        result.data.entries.forEach((entry: any, i: number) => {
          console.log(`${chalk.gray(i + 1 + '.')} ${chalk.yellow('>')} ${chalk.bold(entry.command)}`);
          if (entry.output) {
            console.log(chalk.white(entry.output));
          }
          console.log(chalk.gray('─'.repeat(40)));
        });

        if (result.data.count === 0) {
          console.log(chalk.italic('El historial está vacío o no se pudo parsear.'));
        }
        return;
      }

      if (!result.ok) {
        console.error(`\n❌ Error: ${result.error?.message || 'Error desconocido'}`);
        process.exit(1);
      }
    });

  return cmd;
}

function getErrorConsoleOutput(result: CliResult<any>): string {
  const details = result.error?.details as any;

  return String(
    details?.output ??
    details?.evidence?.raw ??
    details?.parsed?.raw ??
    details?.parsed?.output ??
    ""
  );
}

function printFailedConsoleOutput(result: CliResult<any>): void {
  const details = result.error?.details as any;
  const device = details?.device ?? result.data?.device ?? "dispositivo";
  const output = getErrorConsoleOutput(result);

  console.error(`\n📟 SALIDA DE CONSOLA (${device}):`);
  console.error('━'.repeat(60));

  if (output.trim()) {
    console.error(output);
  } else {
    console.error(chalk.italic.gray('  (No se capturó salida de consola para este error)'));
  }

  console.error('━'.repeat(60));
}

/**
 * Ejecuta un comando en un dispositivo detectando automáticamente si es IOS o Host.
 */
async function executeDeviceTerminalCommand(
    controller: PTController,
    deviceName: string,
    command: string,
    flags: any
): Promise<CliResult<any>> {
    const service = createTerminalCommandServiceForCli(controller);

    if (!flags.quiet && !flags.json) {
        process.stdout.write(chalk.cyan(`\n⏳ Esperando respuesta de ${chalk.bold(deviceName)}... `));
    }

    const result = await service.executeCommand(deviceName, command, {
        timeoutMs: flags.timeout || 45000,
    });

    if (!flags.quiet && !flags.json) {
        process.stdout.write(result.ok ? chalk.green('¡RECIBIDA!\n') : chalk.red('¡FALLÓ!\n'));
    }

    if (result.ok) {
        return createSuccessResult(result.action, {
            device: result.device,
            command: result.command,
            output: result.output,
            success: true,
            verdict: {
                warnings: result.warnings,
            },
            evidence: result.evidence,
        });
    }

    return createErrorResult(result.action, {
        code: result.error?.code ?? "UNKNOWN_ERROR",
        message: result.error?.message ?? "Error desconocido en ejecución de comando",
        details: {
            device: result.device,
            command: result.command,
            output: result.output,
        },
    });
}

function createHostExecCommand(): Command {
  const cmd = new Command('exec')
    .alias('cmd')
    .summary(HOST_EXEC_META.summary)
    .description(HOST_EXEC_META.longDescription)
    .argument('[device]', 'Nombre del dispositivo')
    .argument('[command...]', 'Comando a ejecutar')
    .action(async (deviceName, commandParts, _options, cmd) => {
      const flags = cmd.optsWithGlobals();
      const result = await runCommand<any>({
        action: 'host.exec',
        meta: HOST_EXEC_META,
        flags,
        payloadPreview: { device: deviceName, command: commandParts },
        execute: async (ctx): Promise<CliResult<any>> => {
          const { controller } = ctx;
          let finalDevice = deviceName;
          let finalCommand = Array.isArray(commandParts) ? commandParts.join(' ') : commandParts;

          try {
            if (!finalDevice) {
              const devices = await fetchDeviceList(controller);
              if (devices.length === 0) {
                throw new Error('No se encontraron dispositivos en el laboratorio');
              }
              finalDevice = await select({
                message: 'Selecciona el dispositivo:',
                choices: devices.map(d => ({ name: formatDevice(d), value: d.name }))
              });
            }

            if (!finalCommand) {
              finalCommand = await input({
                message: 'Introduce el comando a ejecutar (ej: ipconfig, nslookup, netstat, arp -a):',
                validate: (val) => val.trim().length > 0 || 'El comando no puede estar vacío'
              });
            }

            return executeDeviceTerminalCommand(controller, finalDevice, finalCommand, flags);
          } catch(e: any) {
              throw e;
          }
        }
      });

      if (flags.json) {
        console.log(JSON.stringify(result, null, 2));
        if (!result.ok) {
          process.exitCode = 1;
        }
        return;
      }

      if (result.ok && result.data) {
        console.log(`\n📟 SALIDA DE CONSOLA (${result.data.device}):`);
        console.log('━'.repeat(60));
        if (result.data.output) {
          console.log(result.data.output);
        } else {
          console.log(chalk.italic.gray('  (Salida vacía o filtrada por el sistema)'));
          if (flags.verbose) {
              console.log(chalk.yellow('\nDEBUG: Objeto result:'));
              console.log(JSON.stringify(result, null, 2));
          }
        }
        console.log('━'.repeat(60));

        if (result.data.success) {
          const eventCount = result.data.parsed?.events?.length || 0;
          const outputLen = result.data.output?.length || 0;
          console.log(`✅ Ejecución exitosa (${eventCount} eventos, ${outputLen} chars capturados)`);
        } else {
          const reason = result.data.verdict?.reason || 'Resultado no satisfactorio';
          console.log(`❌ Fallo detectado: ${reason}`);
          if (result.data.verdict?.warnings && result.data.verdict.warnings.length > 0) {
            result.data.verdict.warnings.forEach((w: string) => console.log(`   ⚠️  ${w}`));
          }
        }
        return;
      }

      if (!result.ok) {
        printFailedConsoleOutput(result);
        console.error(`❌ Error: ${result.error?.message || 'Error desconocido'}`);
        process.exit(1);
      }
    });

  return cmd;
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
          } catch(e: any) {
              throw e;
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
          } catch(e: any) {
              throw e;
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