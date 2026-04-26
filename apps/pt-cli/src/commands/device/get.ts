#!/usr/bin/env bun
/**
 * Comando device get - Obtener detalles de un dispositivo en tiempo real
 */

import { Command } from 'commander';
import { createDefaultPTController } from '@cisco-auto/pt-control/controller';
import type { PTController } from '@cisco-auto/pt-control/controller';
import type { CliResult } from '../../contracts/cli-result.js';
import { createSuccessResult, createErrorResult } from '../../contracts/cli-result.js';
import type { CommandMeta } from '../../contracts/command-meta.js';
import type { GlobalFlags } from '../../flags.js';
import { runCommand } from '../../application/run-command.js';
import { printExamples } from '../../ux/examples.js';
import { formatNextSteps } from '../../ux/next-steps.js';
import { buildFlags } from '../../flags-utils.js';
import { DeviceNotFoundError, requireDeviceExists } from '../../utils/device-utils.js';

export const DEVICE_GET_META: CommandMeta = {
  id: 'device.get',
  summary: 'Obtener detalles de un dispositivo específico',
  longDescription: 'Obtiene información detallada de un dispositivo en Packet Tracer incluyendo modelo, puertos, estado y configuración.',
  examples: [
    {
      command: 'bun run pt device get R1',
      description: 'Obtener detalles del router R1'
    },
    {
      command: 'bun run pt device get S1',
      description: 'Obtener detalles del switch S1'
    },
    {
      command: 'bun run pt device get PC1 --json',
      description: 'Obtener detalles del PC1 en formato JSON'
    }
  ],
  related: [
    'bun run pt device list',
    'bun run pt device add',
    'bun run pt device remove'
  ],
  nextSteps: [
    'bun run pt device list',
    'bun run pt show ip-int-brief <device>'
  ],
  tags: ['device', 'get', 'info', 'query'],
  supportsVerify: false,
  supportsJson: true,
  supportsPlan: false,
  supportsExplain: true
};

interface DeviceGetResult {
  name: string;
  model: string;
  type: string;
  hostname?: string;
  power: boolean;
  dhcp?: boolean;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  ports: Array<{
    name: string;
    type?: string;
    status?: string;
    protocol?: string;
    ipAddress?: string;
    subnetMask?: string;
    macAddress?: string;
    speed?: string;
    duplex?: string;
    vlan?: number;
    mode?: string;
    link?: string;
    dhcp?: boolean;
  }>;
  x?: number;
  y?: number;
  uuid?: string;
  version?: string;
  configRegister?: string;
  xml?: string;
  xmlParsed?: Record<string, unknown>;
}

export function createDeviceGetCommand(): Command {
  const cmd = new Command('get')
    .description('Obtener detalles de un dispositivo específico')
    .argument('<device>', 'Nombre del dispositivo (ej: R1, S1, PC1)')
    .option('--json', 'Salida en formato JSON')
    .option('-v, --verbose', 'Mostrar información detallada')
    .option('--xml', 'Incluir datos enriquecidos del XML (VLANs, modules, ARP, MAC)')
    .option('--examples', 'Mostrar ejemplos de uso y salir', false)
    .option('--schema', 'Mostrar schema JSON del resultado y salir', false)
    .option('--explain', 'Explicar qué hace el comando y salir', false)
    .action(async (deviceName, options) => {
      const globalExamples = process.argv.includes('--examples');
      const globalSchema = process.argv.includes('--schema');
      const globalExplain = process.argv.includes('--explain');
      const globalJson = process.argv.includes('--json');
      const globalVerbose = process.argv.includes('--verbose');
      const globalXml = process.argv.includes('--xml');

      if (globalExamples) {
        console.log(printExamples(DEVICE_GET_META));
        return;
      }

      if (globalSchema) {
        console.log(JSON.stringify(DEVICE_GET_META, null, 2));
        return;
      }

      if (globalExplain) {
        console.log(DEVICE_GET_META.longDescription ?? DEVICE_GET_META.summary);
        return;
      }

      const flags = buildFlags({
        json: globalJson,
        verbose: globalVerbose,
        examples: globalExamples,
        schema: globalSchema,
        explain: globalExplain,
        verify: false,
      });

      const result = await runCommand<DeviceGetResult>({
        action: 'device.get',
        meta: DEVICE_GET_META,
        flags,
        payloadPreview: { deviceName },
        execute: async (ctx): Promise<CliResult<DeviceGetResult>> => {
          const { controller } = ctx;

          await controller.start();

          try {
            const device = await requireDeviceExists(controller, deviceName);
            const inspectedDevice = await controller.inspectDevice(device.name, globalXml);

            const result: DeviceGetResult = {
              name: inspectedDevice.name,
              model: inspectedDevice.model,
              type: inspectedDevice.type,
              hostname: inspectedDevice.hostname,
              power: inspectedDevice.power,
              dhcp: inspectedDevice.dhcp,
              ip: inspectedDevice.ip,
              mask: inspectedDevice.mask,
              gateway: inspectedDevice.gateway,
              dns: inspectedDevice.dns,
              ports: inspectedDevice.ports || [],
              x: inspectedDevice.x,
              y: inspectedDevice.y,
              uuid: inspectedDevice.uuid,
              version: inspectedDevice.version,
              configRegister: inspectedDevice.configRegister,
              xml: (inspectedDevice as Record<string, unknown>).xml as string | undefined,
              xmlParsed: (inspectedDevice as Record<string, unknown>).xmlParsed as Record<string, unknown> | undefined,
            };

            return createSuccessResult('device.get', result);
          } catch (error) {
            if (error instanceof DeviceNotFoundError) {
              return createErrorResult('device.get', {
                code: error.code,
                message: error.message,
                details: error.toDetails(),
              }) as CliResult<DeviceGetResult>;
            }

            throw error;
          } finally {
            await controller.stop();
          }
        }
      });

      // Renderizar resultado
      if (result.ok && result.data && !flags.json) {
        console.log(`\n📱 ${result.data.name}:`);
        console.log('━'.repeat(60));
        console.log(`Tipo: ${result.data.type}`);
        console.log(`Modelo: ${result.data.model}`);
        console.log(`Estado: ${result.data.power ? 'Encendido' : 'Apagado'}`);
        
        if (result.data.dhcp !== undefined) {
          console.log(`DHCP: ${result.data.dhcp ? 'Sí' : 'No'}`);
        }
        
        if (result.data.ip) {
          console.log(`IP: ${result.data.ip}/${result.data.mask || 'N/A'}`);
        }
        
        if (result.data.gateway) {
          console.log(`Gateway: ${result.data.gateway}`);
        }
        
        if (result.data.hostname) {
          console.log(`Hostname: ${result.data.hostname}`);
        }
        
        if (result.data.version) {
          console.log(`Versión: ${result.data.version}`);
        }

        if (result.data.x !== undefined || result.data.y !== undefined) {
          console.log(`Posición: (${result.data.x ?? 'N/A'}, ${result.data.y ?? 'N/A'})`);
        }

        if (result.data.ports?.length) {
          console.log(`\nInterfaces (${result.data.ports.length}):`);
          result.data.ports.forEach((port, i) => {
            const status = port.status || 'unknown';
            const ip = port.ipAddress ? ` - ${port.ipAddress}` : '';
            console.log(`  ${i + 1}. ${port.name}${ip} [${status}]`);
          });
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
