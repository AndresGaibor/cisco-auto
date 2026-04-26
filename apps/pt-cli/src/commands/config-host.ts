#!/usr/bin/env bun
/**
 * Comando config-host - Migrado a runCommand
 * Configura la red de un dispositivo (IP, gateway, DNS, DHCP)
 */

import { Command } from 'commander';
import type { PTController } from '@cisco-auto/pt-control/controller';
import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createVerifiedResult } from '../contracts/cli-result.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';
import { verifyHostConfig, buildHostConfigVerificationChecks } from '../application/verify-host-config.js';
import { renderCliResult } from '../ux/renderers.js';
import { printExamples } from '../ux/examples.js';
import { formatNextSteps } from '../ux/next-steps.js';
import { fetchDeviceList, formatDevice } from '../utils/device-utils.js';
import { CONFIG_HOST_META } from './config-host/meta.js';
import { buildFlags, parseGlobalOptions } from '../flags-utils.js';

interface ConfigHostResult {
  device: string;
  ip: string | null;
  mask: string | null;
  gateway: string | null;
  dns: string | null;
  dhcp: boolean;
}

export function createConfigHostCommand(): Command {
  const cmd = new Command('config-host')
    .description('Configurar red de un dispositivo (IP, gateway, DNS, DHCP)')
    .argument('[device]', 'Nombre del dispositivo')
    .argument('[ip]', 'Dirección IP')
    .argument('[mask]', 'Máscara de subred')
    .argument('[gateway]', 'Puerta de enlace (opcional)')
    .argument('[dns]', 'Servidor DNS (opcional)')
    .option('--dhcp', 'Habilitar DHCP', false)
    .option('-i, --interactive', 'Completar datos faltantes de forma interactiva', false)
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .option('--plan', 'Mostrar plan de ejecución sin ejecutar', false)
    .option('--verify', 'Verificar cambios post-ejecución', true)
    .option('--no-verify', 'Omitir verificación post-ejecución', false)
    .option('--trace', 'Activar traza estructurada de la ejecución', false)
    .option('--trace-bundle', 'Generar archivo bundle único para debugging', false)
    .action(async (device, ip, mask, gateway, dns, options) => {
      const { examples, schema, explain, plan, trace, traceBundle } = parseGlobalOptions();

      const verifyEnabled = options.verify ?? true;

      if (examples) {
        console.log(printExamples(CONFIG_HOST_META));
        return;
      }

      if (schema) {
        console.log(JSON.stringify(CONFIG_HOST_META, null, 2));
        return;
      }

      if (explain) {
        console.log(CONFIG_HOST_META.longDescription ?? CONFIG_HOST_META.summary);
        return;
      }

      if (plan) {
        console.log('Plan de ejecución:');
        console.log(`  1. Seleccionar dispositivo: ${device ?? '<device>'}`);
        console.log(`  2. Configurar IP: ${ip ?? '<ip>'}`);
        console.log(`  3. Máscara: ${mask ?? '<mask>'}`);
        if (gateway) console.log(`  4. Gateway: ${gateway}`);
        if (dns) console.log(`  5. DNS: ${dns}`);
        if (options.dhcp) console.log('  2. Activar modo DHCP');
        console.log('  6. Verificar que la configuración se aplicó correctamente');
        return;
      }

      let deviceName = device;
      let ipAddress = ip;
      let subnetMask = mask;
      let gatewayAddr = gateway;
      let dnsServer = dns;
      const dhcpEnabled = options.dhcp ?? false;

      const flags = buildFlags({
        trace,
        traceBundle,
        examples,
        schema,
        explain,
        plan,
        verify: verifyEnabled,
      });

      const result = await runCommand<ConfigHostResult>({
        action: 'config-host',
        meta: CONFIG_HOST_META,
        flags,
        payloadPreview: {
          device: deviceName,
          ip: ipAddress,
          mask: subnetMask,
          gateway: gatewayAddr,
          dns: dnsServer,
          dhcp: dhcpEnabled,
        },
        execute: async (ctx): Promise<CliResult<ConfigHostResult>> => {
          const { controller, logPhase } = ctx;

          await controller.start();

          try {
            if (!deviceName && !options.interactive) {
              throw new Error('Debes pasar el dispositivo o usar --interactive');
            }

            if (!deviceName) {
              const devices = await fetchDeviceList(controller);
              if (devices.length === 0) {
                throw new Error('No hay dispositivos en la topología');
              }
              
              const deviceChoices = devices.map((d) => ({
                name: formatDevice(d),
                value: d.name,
              }));

              deviceName = await select({
                message: 'Selecciona dispositivo',
                choices: deviceChoices,
              });
            }

            if (!dhcpEnabled) {
              if (!ipAddress && !options.interactive) {
                throw new Error('Debes pasar IP y máscara, o usar --interactive');
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
                throw new Error('Debes pasar IP y máscara, o usar --interactive');
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

            await logPhase('apply', {
              device: deviceName,
              ip: ipAddress,
              mask: subnetMask,
              gateway: gatewayAddr,
              dns: dnsServer,
              dhcp: dhcpEnabled,
            });

            await controller.configHost(deviceName, {
              ip: ipAddress ?? undefined,
              mask: subnetMask ?? undefined,
              gateway: gatewayAddr ?? undefined,
              dns: dnsServer ?? undefined,
              dhcp: dhcpEnabled,
            });

            if (verifyEnabled) {
              await logPhase('verify', { device: deviceName });

              const verificationData = await verifyHostConfig(
                controller,
                deviceName,
                ipAddress ?? undefined,
                subnetMask ?? undefined,
                gatewayAddr ?? undefined,
                dnsServer ?? undefined,
                dhcpEnabled
              );
              const checks = buildHostConfigVerificationChecks(
                verificationData,
                ipAddress ?? undefined,
                subnetMask ?? undefined,
                gatewayAddr ?? undefined,
                dnsServer ?? undefined,
                dhcpEnabled
              );
              const allPassed = checks.every((check: { ok: boolean }) => check.ok);

              const resultData: ConfigHostResult = {
                device: deviceName,
                ip: ipAddress ?? null,
                mask: subnetMask ?? null,
                gateway: gatewayAddr ?? null,
                dns: dnsServer ?? null,
                dhcp: dhcpEnabled,
              };

              return createVerifiedResult('config-host', resultData, {
                verified: allPassed,
                checks: checks.map((c: { name: string; ok: boolean; details?: Record<string, unknown> }) => ({ name: c.name, ok: c.ok, details: c.details })),
              });
            }

            const resultData: ConfigHostResult = {
              device: deviceName,
              ip: ipAddress ?? null,
              mask: subnetMask ?? null,
              gateway: gatewayAddr ?? null,
              dns: dnsServer ?? null,
              dhcp: dhcpEnabled,
            };

            return createSuccessResult('config-host', resultData, {
              advice: [
                `Ejecuta 'pt device get ${deviceName}' para verificar la configuración`,
              ],
            });
          } finally {
            await controller.stop();
          }
        },
      });

      const output = renderCliResult(result, flags.output);

      if (!flags.quiet || !result.ok) {
        console.log(output);
      }

      if (result.ok && result.data && !flags.quiet) {
        const nextSteps = [
          `pt device get ${deviceName}`,
          `pt show ip-int-brief ${deviceName}`,
        ];
        console.log(formatNextSteps(nextSteps));
      }

      if (!result.ok) {
        process.exit(1);
      }
    });

  return cmd;
}
