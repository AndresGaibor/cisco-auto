#!/usr/bin/env bun

import { Command } from 'commander';
import chalk from 'chalk';

import { loadLiveDeviceList } from '../../application/device-list.js';
import { getGlobalFlags } from '../../flags.js';
import { DeviceNotFoundError } from '../../utils/device-utils.js';

type DevicePort = {
  name: string;
  status?: string;
  protocol?: string;
  ipAddress?: string;
  subnetMask?: string;
  connection?: { remoteDevice?: string; remotePort?: string; confidence?: string };
};

function formatPortState(port: DevicePort): string {
  const isUp = port.status === 'up' || port.protocol === 'up';
  const status = isUp ? chalk.green('UP') : chalk.gray(port.status || port.protocol || 'DOWN');
  const ip = port.ipAddress && port.ipAddress !== '0.0.0.0' ? ` ip=${port.ipAddress}` : '';
  const mask = port.subnetMask && port.subnetMask !== '0.0.0.0' ? ` mask=${port.subnetMask}` : '';
  const connection = port.connection?.remoteDevice && port.connection?.remotePort
    ? ` -> ${port.connection.remoteDevice}:${port.connection.remotePort} [${port.connection.confidence || 'unknown'}]`
    : '';

  return `${status} ${port.name}${ip}${mask}${connection}`;
}

export function createDevicePortsCommand(): Command {
  return new Command('ports')
    .description('Listar puertos e interfaces de un dispositivo')
    .argument('<device>', 'Nombre exacto del dispositivo')
    .option('--json', 'Salida JSON')
    .option('--refresh', 'Forzar actualización del cache de puertos')
    .action(async (deviceName: string, options, thisCmd) => {
      const deviceCmd = thisCmd.parent as Command | undefined;
      const rootCmd = deviceCmd?.parent as Command | undefined;
      const globalFlags = rootCmd ? getGlobalFlags(rootCmd) : ({ json: false } as const);
      const useJson = Boolean(globalFlags.json || options.json);

      const result = await loadLiveDeviceList(undefined, { refreshCache: Boolean(options.refresh) });
      const devices = (result.devices ?? []) as any[];
      const device = devices.find((item) => item.name === deviceName);

      if (!device) {
        const error = new DeviceNotFoundError(deviceName, devices);
        const payload = {
          schemaVersion: '1.0',
          ok: false,
          action: 'device.ports',
          error: {
            code: error.code,
            message: error.message,
            details: error.toDetails(),
          },
          advice: error.toAdvice(),
        };

        if (useJson) {
          console.log(JSON.stringify(payload, null, 2));
        } else {
          console.log(chalk.red(`✗ Dispositivo '${deviceName}' no encontrado`));
          console.log(chalk.gray('Usa bun run pt device list --json para ver los nombres exactos.'));
        }

        process.exitCode = 1;
        return;
      }

      const ports = (device.ports ?? []) as DevicePort[];

      if (useJson) {
        console.log(JSON.stringify({
          schemaVersion: '1.0',
          ok: true,
          action: 'device.ports',
          data: {
            device: device.name,
            model: device.model,
            type: device.type,
            count: ports.length,
            ports,
          },
        }, null, 2));
        return;
      }

      console.log(chalk.bold(`${device.name} (${device.model ?? 'unknown'})`));
      console.log(chalk.gray(`${ports.length} puertos/interfaces`));

      for (const port of ports) {
        console.log(`  ${formatPortState(port)}`);
      }
    });
}
