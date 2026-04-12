import { Command } from 'commander';
import { createSuccessResult } from '../../contracts/cli-result.js';
import { formatExamples, formatRelatedCommands } from '../../help/formatter';
import { getExamples } from '../../help/examples';
import { getRelatedCommands } from '../../help/related';
import chalk from 'chalk';
import { runCommand } from '../../application/run-command.js';
import { getGlobalFlags } from '../../flags.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export function createDeviceListCommand(): Command {
  /**
   * TODO-Fase-3: Migrar `device list` a `runCommand()`
   *
   * Contexto: device list actualmente hace start/stop manual.
   * En Fase 3, esto debe delegarse a `runCommand()` para que el ciclo de vida
   * del controller sea consistente con otros comandos que ya usan runCommand().
   *
   * Beneficios:
   * - Contexto automático (CommandRuntimeContext) sin boilerplate
   * - Historial enriquecido con contextSummary
   * - Warnings contextuales automáticos
   * - Consistencia con la arquitectura de Fase 2+
   *
   * Refactor:
   * - Cambiar de Command.action() a RunCommandOptions
   * - Usar `ctx.controller.listDevices()` en lugar de crear controller local
   * - Dejar que runCommand() maneje start/stop
   */
  const cmd = new Command('list')
    .description('Listar dispositivos en Packet Tracer')
    .option('-t, --type <type>', 'Filtrar por tipo (router|switch|pc|server)')
    .action(async (options, thisCmd) => {
      // Manejar --json tanto global como local
      // Jerarquía: program (root) -> device -> list
      // Necesitamos llegar al root para obtener los flags globales
      const deviceCmd = thisCmd.parent as Command | undefined;
      const rootCmd = deviceCmd?.parent as Command | undefined;
      const globalFlags = rootCmd ? getGlobalFlags(rootCmd) : { json: false } as const;
      const localJson = options.json ?? false;
      const useJson = globalFlags.json || localJson;

      const result = await runCommand<{ devices: Array<{ name: string; model: string; type: string; power: boolean; ports?: Array<unknown> }>; deviceInfos: any[]; count: number }>({
        action: 'device.list',
        meta: {
          id: 'device.list',
          summary: 'Listar dispositivos en Packet Tracer',
          examples: [],
          related: [],
        },
        flags: {
          json: useJson,
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
          verify: false,
          timeout: null,
          noTimeout: false,
        },
        execute: async ({ controller }) => {
          const devices = await controller.listDevices();
          
          const deviceInfos = await Promise.all(
            devices.map(async (d) => {
              try {
                return await controller.inspectDevice(d.name);
              } catch {
                return d;
              }
            })
          );
          
          let filtered = devices;
          if (options.type) {
            filtered = devices.filter((d) => d.type === options.type);
          }
          
          return createSuccessResult('device.list', { devices: filtered, deviceInfos, count: filtered.length });
        },
      });

      if (!result.ok) {
        console.error('❌ Error:', result.error?.message ?? 'No se pudo listar dispositivos');
        process.exit(1);
      }

      const devices = result.data?.devices ?? [];
      const deviceInfos = result.data?.deviceInfos ?? [];

      // Read links from links.json
      const ptDevDir = process.env.PT_DEV_DIR || join(homedir(), 'pt-dev');
      const linksFile = join(ptDevDir, 'links.json');
      const deviceLinks: Record<string, string[]> = {};
      
      const deviceNames = new Set(devices.map(d => d.name));
      
      if (existsSync(linksFile)) {
        try {
          const content = readFileSync(linksFile, 'utf-8');
          const linksData = JSON.parse(content);
          for (const link of Object.values(linksData) as any[]) {
            const d1 = link.device1 || link.endpointA;
            const p1 = link.port1 || link.portA;
            const d2 = link.device2 || link.endpointB;
            const p2 = link.port2 || link.portB;
            
            if (!deviceNames.has(d1) || !deviceNames.has(d2)) continue;
            
            if (!deviceLinks[d1]) deviceLinks[d1] = [];
            if (!deviceLinks[d2]) deviceLinks[d2] = [];
            
            const linkStr1 = `${d2}:${p2}`;
            const linkStr2 = `${d1}:${p1}`;
            
            // Skip duplicates (both directions)
            if (deviceLinks[d1].includes(linkStr1) || deviceLinks[d2].includes(linkStr2)) continue;
            
            deviceLinks[d1].push(linkStr1);
            deviceLinks[d2].push(linkStr2);
          }
        } catch (e) {
          // Ignore
        }
      }

      if (useJson) {
        console.log(JSON.stringify(devices, null, 2));
        return;
      }

      console.log(`\n📱 Dispositivos en Packet Tracer (${devices.length}):`);
      console.log('━'.repeat(60));

      const TYPE_NAMES: Record<string | number, string> = {
        pc: 'PC', 8: 'PC',
        switch: 'Switch', 1: 'Switch', 'switch-l2': 'Switch-L2', 'switch_layer3': 'Switch-L3', 16: 'Switch-L3',
        router: 'Router', 0: 'Router',
        server: 'Server',
      };
      
      const getTypeName = (t: string | number) => TYPE_NAMES[t] || String(t);
      
      devices.forEach((device, i) => {
        const info = deviceInfos[i] || device;
        const typeName = getTypeName(device.type);
        
        const ip = (info as any)?.ip || (info as any)?.ports?.find((p: any) => p.ipAddress && p.ipAddress !== '0.0.0.0')?.ipAddress;
        const mask = (info as any)?.mask || (info as any)?.ports?.find((p: any) => p.ipAddress && p.ipAddress !== '0.0.0.0')?.subnetMask;
        
        const links = deviceLinks[device.name] || [];
        
        console.log(`\n${i + 1}. ${chalk.cyan(device.name)}`);
        
        if (ip && ip !== '0.0.0.0') {
          console.log(`   ${chalk.green('●')} ${ip}/${mask || '?'}`);
        }
        
        console.log(`   ${typeName} | ${device.model} | ${links.length} enlace(s)`);
        
        if (links.length > 0) {
          console.log(`   → ${chalk.gray(links.join(', '))}`);
        }
      });

      const totalLinks = Object.keys(deviceLinks).reduce((sum, key) => sum + (deviceLinks[key]?.length || 0), 0) / 2;
      console.log(`\n${chalk.gray('─'.repeat(60))}`);
      console.log(`Total: ${devices.length} dispositivos, ${Math.round(totalLinks)} enlaces`);
    });

  const examples = getExamples('device list');
  const related = getRelatedCommands('device list');

  cmd.addHelpText('after', formatExamples(examples) + formatRelatedCommands(related));

  return cmd;
}
