#!/usr/bin/env bun
/**
 * Comando show-mac - Muestra la tabla MAC de un switch
 * 
 * Ejecuta 'show mac address-table' en switches para ver las MACs aprendidas.
 */

import { Command } from 'commander';
import chalk from 'chalk';

import type { CliResult } from '../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../contracts/cli-result.js';
import type { CommandMeta } from '../contracts/command-meta.js';
import type { GlobalFlags } from '../flags.js';

import { runCommand } from '../application/run-command.js';

export const SHOW_MAC_META: CommandMeta = {
  id: 'show-mac',
  summary: 'Mostrar tabla de direcciones MAC en switches',
  longDescription:
    'Ejecuta el comando "show mac address-table" en un switch para ver las direcciones MAC aprendidas en cada puerto. Útil para verificar conectividad L2 y detectar dispositivos en la red.',
  examples: [
    { command: 'pt show mac S1', description: 'Mostrar tabla MAC del switch S1' },
    { command: 'pt show mac S1 --vlan 10', description: 'Filtrar por VLAN específica' },
    { command: 'pt show mac S1 --json', description: 'Salida en formato JSON' },
  ],
  related: ['show ip-int-brief', 'ping', 'link list'],
  nextSteps: [
    'pt show ip-int-brief <device>',
    'pt ping <pc1> <pc2>',
  ],
  tags: ['network', 'switch', 'mac', 'l2', 'show'],
  supportsVerify: false,
  supportsJson: true,
  supportsExplain: true,
};

interface MacEntry {
  vlan: string;
  mac: string;
  type: string;
  ports: string[];
}

interface ShowMacResult {
  device: string;
  entries: MacEntry[];
  total: number;
}

export function createShowMacCommand(): Command {
  return new Command('show-mac')
    .description('Mostrar tabla de direcciones MAC en switches')
    .argument('<device>', 'Nombre del switch')
    .option('--vlan <id>', 'Filtrar por VLAN específica')
    .option('--address <mac>', 'Buscar por dirección MAC específica')
    .option('--port <port>', 'Filtrar por puerto específico')
    .option('--examples', 'Mostrar ejemplos de uso')
    .option('--schema', 'Mostrar schema del resultado')
    .option('--explain', 'Explicar qué hace el comando')
    .option('-j, --json', 'Salida en formato JSON')
    .option('-o, --output <format>', 'Formato de salida (json|yaml|table|text)', 'table')
    .action(async (device: string, options: Record<string, unknown>) => {
      if (options.examples) {
        console.log('Ejemplos de uso:');
        SHOW_MAC_META.examples.forEach((ex) => {
          console.log(`  ${chalk.cyan(ex.command)}`);
          console.log(`    → ${ex.description}`);
        });
        return;
      }

      if (options.schema) {
        console.log(JSON.stringify({
          type: 'object',
          properties: {
            device: { type: 'string' },
            entries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  vlan: { type: 'string' },
                  mac: { type: 'string' },
                  type: { type: 'string' },
                  ports: { type: 'array', items: { type: 'string' } },
                }
              }
            },
            total: { type: 'number' },
          }
        }, null, 2));
        return;
      }

      if (options.explain) {
        console.log(SHOW_MAC_META.longDescription);
        return;
      }

      const flags: GlobalFlags = {
        json: Boolean(options.json),
        jq: null,
        output: (options.output as GlobalFlags['output']) || 'table',
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
        verify: false,
      };

      const result = await runCommand<ShowMacResult>({
        action: 'show:mac',
        meta: SHOW_MAC_META,
        flags,
        payloadPreview: { device, filters: { vlan: options.vlan, address: options.address, port: options.port } },
        execute: async (ctx) => {
          try {
            await ctx.logPhase('inspect', { device });

            let command = 'show mac address-table';
            if (options.vlan) {
              command += ` vlan ${options.vlan}`;
            }
            if (options.address) {
              command += ` address ${options.address}`;
            }
            if (options.port) {
              command += ` interface ${options.port}`;
            }

            let raw: string = '';
            try {
              const execResult = await ctx.controller.showParsed(device, command, {
                ensurePrivileged: true,
                timeout: 10000,
              });
              raw = execResult.raw || '';
            } catch (iosError: any) {
              const deviceInfo = await ctx.controller.inspectDevice(device);
              if (deviceInfo?.type === 'switch' || deviceInfo?.type === 'switch-l2' || deviceInfo?.type === 'switch-l3') {
                return createErrorResult('show:mac', {
                  message: `No se pudo ejecutar 'show mac' en ${device}. Asegúrate de que el switch tenga enlaces activos.`,
                  details: { error: iosError.message },
                });
              }
              return createErrorResult('show:mac', {
                message: `Dispositivo '${device}' no es un switch. Solo los switches tienen tabla MAC.`,
                details: { type: deviceInfo?.type },
              });
            }

            const entries = parseMacTable(raw);
            
            const total = entries.length;
            
            return createSuccessResult('show:mac', {
              device,
              entries,
              total,
            }, {
              advice: total > 0 
                ? [`${total} MAC(s) aprendida(s) en ${device}`]
                : [`No hay entradas MAC en ${device}. Verifica que los enlaces estén activos.`],
            });
          } finally {
            await ctx.controller.stop();
          }
        },
      });

      if (result.ok && result.data) {
        if (flags.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          renderMacTable(result.data, flags.output);
        }
      } else {
        console.error(`${chalk.red('✗')} Error: ${result.error?.message}`);
        process.exit(1);
      }
    });
}

function parseMacTable(raw: string): MacEntry[] {
  const entries: MacEntry[] = [];
  
  const lines = raw.split('\n');
  let inTable = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.includes('Vlan') && trimmed.includes('MAC Address') && trimmed.includes('Type')) {
      inTable = true;
      continue;
    }
    
    if (inTable && trimmed.startsWith('-')) {
      continue;
    }
    
    if (inTable && /^\d/.test(trimmed)) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        const vlan = parts[0];
        const mac = parts[1];
        const type = parts[2];
        const ports = parts.slice(3);
        
        if (/^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/i.test(mac) || 
            /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(mac)) {
          entries.push({
            vlan,
            mac,
            type,
            ports: ports.length > 0 ? ports : [parts[parts.length - 1]],
          });
        }
      }
    }
  }
  
  return entries;
}

function renderMacTable(result: ShowMacResult, format: string): void {
  console.log(chalk.bold(`\n📋 Tabla MAC: ${result.device}`));
  console.log(chalk.gray('─'.repeat(60)));
  
  if (result.entries.length === 0) {
    console.log(chalk.yellow('  Sin entradas MAC'));
    console.log(chalk.gray('  Los switches aprenden MACs cuando reciben tráfico'));
    return;
  }
  
  if (format === 'table') {
    console.log(chalk.cyan('  VLAN') + chalk.gray('   │ ') + 
                chalk.cyan('MAC Address') + chalk.gray('       │ ') + 
                chalk.cyan('Type') + chalk.gray('    │ ') + 
                chalk.cyan('Ports'));
    console.log(chalk.gray('  ' + '─'.repeat(55)));
    
    for (const entry of result.entries) {
      const vlanPad = entry.vlan.padEnd(4);
      const macPad = entry.mac.padEnd(18);
      const typePad = entry.type.slice(0, 8).padEnd(8);
      const portsStr = entry.ports.join(', ');
      
      console.log(`  ${chalk.white(vlanPad)}${chalk.gray(' │ ')}` +
                  `${chalk.green(macPad)}${chalk.gray(' │ ')}` +
                  `${chalk.yellow(typePad)}${chalk.gray(' │ ')}` +
                  `${chalk.blue(portsStr)}`);
    }
  } else {
    for (const entry of result.entries) {
      console.log(`  ${entry.vlan}  ${entry.mac}  ${entry.type}  ${entry.ports.join(', ')}`);
    }
  }
  
  console.log(chalk.gray('  ' + '─'.repeat(55)));
  console.log(chalk.green(`  Total: ${result.total} entrada(s)`));
}