#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { runCommand } from '../application/run-command';
import type { CliResult, VerificationCheck } from '../contracts/cli-result';
import { createSuccessResult, createVerifiedResult, createErrorResult } from '../contracts/cli-result';
import type { CommandMeta } from '../contracts/command-meta';
import type { GlobalFlags } from '../flags';
import { fetchDeviceList, getIOSCapableDevices } from '../utils/device-utils';
import { inspectCommandContext } from '../application/context-inspector';

export const CONFIG_IOS_META: CommandMeta = {
  id: 'config-ios',
  summary: 'Ejecutar comandos IOS en un dispositivo de red Cisco',
  longDescription: 'Permite ejecutar comandos IOS directamente en routers y switches de Cisco Packet Tracer. Soporta multiples comandos, modo interactivo y verificacion automatica.',
  examples: [
    { command: 'pt config-ios R1 "show version"', description: 'Ejecutar comando show en el dispositivo' },
    { command: 'pt config-ios R1 "interface GigabitEthernet0/0"', description: 'Entrar en modo de configuracion de interfaz' },
    { command: 'pt config-ios R1 "interface GigabitEthernet0/0" "ip address 192.168.1.1 255.255.255.0"', description: 'Configurar IP en interfaz' },
    { command: 'pt config-ios R1 "vlan 10" "name ADMIN"', description: 'Crear VLAN en switch' },
    { command: 'pt config-ios R1 "router ospf 1" "network 192.168.1.0 0.0.0.255 area 0"', description: 'Configurar OSPF' },
    { command: 'pt config-ios R1 "ip route 0.0.0.0 0.0.0.0 192.168.1.254"', description: 'Configurar ruta estatica' },
    { command: 'pt config-ios R1 "enable secret cisco"', description: 'Configurar contrasena enable' },
    { command: 'pt config-ios R1 "line vty 0 4" "login local"', description: 'Configurar acceso VTY' },
    { command: 'pt config-ios --examples', description: 'Mostrar ejemplos de comandos IOS' },
    { command: 'pt config-ios R1 --verify "interface Gi0/0"', description: 'Ejecutar con verificacion automatica' },
  ],
  related: [
    'show ip interface brief',
    'show vlan brief',
    'show ip route',
    'show running-config',
    'show version',
  ],
  tags: ['ios', 'config', 'cisco', 'network'],
  supportsVerify: true,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: true,
};

interface ConfigIOSPayload {
  device: string;
  commands: string[];
  interactive?: boolean;
}

interface ConfigIOSResult {
  device: string;
  commands: string[];
  executed: number;
  errors: string[];
}

export function buildVerificationPlan(commands: string[]): Array<{
  kind: string;
  verifyCommand: string;
  assert: (raw: string, parsed: unknown, originalCommands: string[]) => boolean;
}> {
  const plans: Array<{
    kind: string;
    verifyCommand: string;
    assert: (raw: string, parsed: unknown, originalCommands: string[]) => boolean;
  }> = [];

  const unique = Array.from(new Set(commands.map((command) => command.trim()).filter(Boolean)));

  if (unique.some((c) => /^vlan\s+\d+/i.test(c))) {
    plans.push({
      kind: 'vlan',
      verifyCommand: 'show vlan brief',
      assert: (raw, _parsed, original) => original
        .filter((c) => /^vlan\s+\d+/i.test(c))
        .every((c) => {
          const match = c.match(/^vlan\s+(\d+)/i);
          return Boolean(match && raw.includes(match[1]!));
        }),
    });
  }

  if (unique.some((c) => /^interface\s+/i.test(c) || /^ip address\s+/i.test(c))) {
    plans.push({
      kind: 'interface',
      verifyCommand: 'show ip interface brief',
      assert: (raw) => raw.length > 0,
    });
  }

  if (unique.some((c) => /^ip route\s+/i.test(c) || /^router\s+/i.test(c) || /\bospf\b/i.test(c) || /\beigrp\b/i.test(c) || /\brip\b/i.test(c))) {
    plans.push({
      kind: 'routing',
      verifyCommand: 'show ip route',
      assert: (raw) => raw.length > 0,
    });
  }

  if (unique.some((c) => /access-list/i.test(c))) {
    plans.push({
      kind: 'acl',
      verifyCommand: 'show access-lists',
      assert: (raw) => raw.length > 0,
    });
  }

  if (unique.some((c) => /spanning-tree|\bstp\b/i.test(c))) {
    plans.push({
      kind: 'stp',
      verifyCommand: 'show spanning-tree',
      assert: (raw) => raw.length > 0,
    });
  }

  if (unique.some((c) => /etherchannel|port-channel/i.test(c))) {
    plans.push({
      kind: 'etherchannel',
      verifyCommand: 'show etherchannel summary',
      assert: (raw) => raw.length > 0,
    });
  }

  return plans;
}

function detectCommandType(commands: string[]): string[] {
  const types: string[] = [];

  for (const cmd of commands) {
    const c = cmd.toLowerCase();
    if (c.includes('interface')) types.push('interface');
    if (c.includes('vlan')) types.push('vlan');
    if (c.includes('ip route') || c.includes('router')) types.push('routing');
    if (c.includes('access-list')) types.push('acl');
    if (c.includes('spanning') || c.includes('stp')) types.push('stp');
    if (c.includes('etherchannel') || c.includes('port-channel')) types.push('etherchannel');
    if (c.includes('line vty') || c.includes('line console')) types.push('line');
    if (c.includes('hostname') || c.includes('enable') || c.includes('service')) types.push('global');
  }

  return [...new Set(types)];
}

export function createConfigIOSCommand(): Command {
  const cmd = new Command('config-ios')
    .description('Ejecutar comandos IOS en un dispositivo de red Cisco')
    .argument('[device]', 'Nombre del dispositivo')
    .argument('[command...]', 'Comando(s) IOS a ejecutar')
    .option('-i, --interactive', 'Modo interactivo (ejecutar comandos uno por uno)')
    .option('--verify', 'Ejecutar verificacion automatica despues del comando', true)
    .option('--no-verify', 'Deshabilitar verificacion automatica')
    .action(async (device, commands, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalPlan = process.argv.includes('--plan');

      if (globalExamples) {
        console.log('\n=== Ejemplos de comandos IOS ===\n');
        CONFIG_IOS_META.examples.forEach((ex, i) => {
          console.log('  ' + (i + 1) + '. ' + ex.command);
          console.log('     ' + ex.description + '\n');
        });
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify({
          type: 'object',
          properties: {
            device: { type: 'string' },
            commands: { type: 'array', items: { type: 'string' } },
            executed: { type: 'number' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        }, null, 2));
        return;
      }

      if (globalExplain) {
        const cmdTypes = detectCommandType(commands);
        console.log('\n=== Analisis del comando ===\n');
        console.log('  Comandos a ejecutar: ' + commands.length);
        console.log('  Tipos detectados: ' + (cmdTypes.length > 0 ? cmdTypes.join(', ') : 'general'));
        console.log('  Verificacion: ' + (options.verify ? 'habilitada' : 'deshabilitada') + '\n');
        console.log('  Comandos IOS modifican la configuracion del dispositivo.');
        console.log('  Use --plan para ver que se ejecutaria sin aplicar cambios.\n');
        return;
      }

      if (globalPlan) {
        console.log('\n=== Plan de ejecucion ===\n');
        console.log('  Dispositivo: ' + (device || 'no seleccionado'));
        console.log('  Comandos: ' + commands.length + '\n');
        commands.forEach((c: string, i: number) => {
          console.log('  ' + (i + 1) + '. ' + c);
        });
        console.log('\n  Verificacion: ' + (options.verify ? 'si' : 'no') + '\n');
        return;
      }

      // Mostrar schema no requiere dispositivo
      if (options.schema) {
        console.log(JSON.stringify({
          type: 'object',
          properties: {
            device: { type: 'string' },
            commands: { type: 'array', items: { type: 'string' } },
            executed: { type: 'number' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        }, null, 2));
        return;
      }

      if (options.explain) {
        const cmdTypes = detectCommandType(commands);
        console.log('\n=== Analisis del comando ===\n');
        console.log('  Comandos a ejecutar: ' + commands.length);
        console.log('  Tipos detectados: ' + (cmdTypes.length > 0 ? cmdTypes.join(', ') : 'general'));
        console.log('  Verificacion: ' + (options.verify ? 'habilitada' : 'deshabilitada') + '\n');
        console.log('  Comandos IOS modifican la configuracion del dispositivo.');
        console.log('  Use --plan para ver que se ejecutaria sin aplicar cambios.\n');
        return;
      }

      if (options.plan) {
        console.log('\n=== Plan de ejecucion ===\n');
        console.log('  Dispositivo: ' + (device || 'no seleccionado'));
        console.log('  Comandos: ' + commands.length + '\n');
        commands.forEach((c: string, i: number) => {
          console.log('  ' + (i + 1) + '. ' + c);
        });
        console.log('\n  Verificacion: ' + (options.verify ? 'si' : 'no') + '\n');
        return;
      }

      const verifyEnabled = options.verify ?? true;

      const flags: GlobalFlags = {
        json: false,
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
        examples: false,
        schema: false,
        explain: false,
        plan: false,
        verify: verifyEnabled,
      };

      const payload: ConfigIOSPayload = {
        device: device || '',
        commands: commands || [],
        interactive: options.interactive,
      };

      const result = await runCommand<ConfigIOSResult>({
        action: 'config-ios',
        meta: CONFIG_IOS_META,
        flags,
        payloadPreview: payload as unknown as Record<string, unknown>,
        execute: async (ctx): Promise<CliResult<ConfigIOSResult>> => {
          await ctx.controller.start();

          try {
            const devices = await fetchDeviceList(ctx.controller);
            const iosDevices = getIOSCapableDevices(devices);

            if (iosDevices.length === 0) {
              return createErrorResult('config-ios', {
                message: 'No hay dispositivos capaces de ejecutar IOS',
              }) as CliResult<ConfigIOSResult>;
            }

            let targetDevice = payload.device;
            if (!targetDevice) {
              return createErrorResult('config-ios', {
                message: 'Debe especificar un dispositivo. Use pt devices para listar.',
              }) as CliResult<ConfigIOSResult>;
            }

            const selectedDevice = iosDevices.find((d) => d.name === targetDevice);
            if (!selectedDevice) {
              return createErrorResult('config-ios', {
                message: 'Dispositivo "' + targetDevice + '" no encontrado o no es capaz de ejecutar IOS',
              }) as CliResult<ConfigIOSResult>;
            }

            if (payload.interactive) {
              return createSuccessResult('config-ios', {
                device: targetDevice,
                commands: [],
                executed: 0,
                errors: [],
              }, {
                advice: ['Use el modo interactivo para ejecutar comandos uno por uno'],
              }) as CliResult<ConfigIOSResult>;
            }

            if (payload.commands.length === 0) {
              return createErrorResult('config-ios', {
                message: 'Se requiere al menos un comando IOS',
              }) as CliResult<ConfigIOSResult>;
            }

            const errors: string[] = [];

            const applyResult = await ctx.controller.configIosWithResult(targetDevice, payload.commands, { save: true });

            const verificationPlan = buildVerificationPlan(payload.commands);
            const verificationChecks: VerificationCheck[] = [];

            if (options.verify && verificationPlan.length > 0) {
              for (const step of verificationPlan) {
                try {
                  const showResult = await ctx.controller.execIosWithEvidence(targetDevice, step.verifyCommand, false, 10000);
                  const ok = step.assert(showResult.raw || '', showResult.parsed, payload.commands);
                  verificationChecks.push({
                    name: `${step.kind}:${step.verifyCommand}`,
                    ok,
                    details: {
                      verifyCommand: step.verifyCommand,
                      rawPreview: (showResult.raw || '').slice(0, 400),
                      evidence: showResult.evidence,
                    },
                  });
                } catch (e) {
                  verificationChecks.push({
                    name: `${step.kind}:${step.verifyCommand}`,
                    ok: false,
                    details: {
                      error: e instanceof Error ? e.message : String(e),
                    },
                  });
                }
              }
            }

            const verified = verificationChecks.length > 0 && verificationChecks.every((check) => check.ok);
            const partiallyVerified = verificationChecks.some((check) => check.ok) && !verified;

            const resultData: ConfigIOSResult = {
              device: targetDevice,
              commands: payload.commands,
              executed: payload.commands.length,
              errors,
            };

            if (verificationChecks.length > 0) {
              return createVerifiedResult('config-ios', resultData, {
                executed: true,
                verified,
                partiallyVerified,
                verificationSource: verificationPlan.map((step) => step.verifyCommand),
                checks: verificationChecks,
              }) as CliResult<ConfigIOSResult>;
            }

            return createSuccessResult('config-ios', resultData, {
              advice: ['La configuración se aplicó, pero no hubo un plan de verificación específico.'],
            }) as CliResult<ConfigIOSResult>;
          } finally {
            await ctx.controller.stop();
          }
        },
      });

      if (result.ok) {
        console.log('\n' + chalk.green('*') + ' ' + result.data?.executed + ' comando(s) ejecutado(s) en ' + chalk.cyan(result.data?.device) + '\n');
        if (result.verification) {
          const status = result.verification.verified ? 'verificado' : result.verification.partiallyVerified ? 'parcialmente verificado' : 'no verificado';
          console.log(chalk.bold(`Verificación: ${status}`));
        }
      } else {
        console.error('\n' + chalk.red('X') + ' Error: ' + result.error?.message + '\n');
        process.exit(1);
      }
    });

  return cmd;
}
