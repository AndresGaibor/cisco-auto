#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control/controller';
import type { PTController } from '@cisco-auto/pt-control/controller';

export interface FreePortsInspectionResult {
  device: string;
  freePorts: string[];
  occupiedPorts: string[];
}

function normalizePorts(deviceState: any): Array<{ name: string; link?: unknown }> {
  if (Array.isArray(deviceState?.ports)) {
    return deviceState.ports.map((port: any) => ({ name: String(port?.name ?? ''), link: port?.link }));
  }

  if (deviceState?.ports && typeof deviceState.ports === 'object') {
    return Object.entries(deviceState.ports).map(([name, port]: [string, any]) => ({
      name,
      link: port?.link,
    }));
  }

  return [];
}

export async function inspectFreePorts(controller: PTController, device: string): Promise<FreePortsInspectionResult> {
  const deviceState = await controller.inspectDevice(device);
  const ports = normalizePorts(deviceState);
  const freePorts = ports.filter((port) => !port.link).map((port) => port.name).filter(Boolean);
  const occupiedPorts = ports.filter((port) => port.link).map((port) => port.name).filter(Boolean);

  return { device, freePorts, occupiedPorts };
}

export async function runInspectFreePorts(options: { device: string; json?: boolean; deprecationLabel?: string }): Promise<void> {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    const result = await inspectFreePorts(controller, options.device);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (options.deprecationLabel) {
      console.log(chalk.yellow(options.deprecationLabel));
    }

    console.log(chalk.bold(`\n🔌 Puertos libres de ${result.device}\n`));
    console.log(chalk.cyan('Libres:'));
    console.log(result.freePorts.length > 0 ? `  ${result.freePorts.join(', ')}` : chalk.gray('  Sin puertos libres.'));
    console.log(chalk.cyan('Ocupados:'));
    console.log(result.occupiedPorts.length > 0 ? `  ${result.occupiedPorts.join(', ')}` : chalk.gray('  Sin puertos ocupados.'));
    console.log();
  } finally {
    await controller.stop();
  }
}

export function createInspectFreePortsCommand(): Command {
  return new Command('free-ports')
    .description('Mostrar puertos libres y ocupados de un dispositivo')
    .argument('<device>', 'Nombre del dispositivo')
    .option('--json', 'Salida en JSON', false)
    .action(async function (device: string, options: { json?: boolean }) {
      await runInspectFreePorts({ device, json: options.json });
    });
}
