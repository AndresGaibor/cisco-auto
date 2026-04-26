#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control/controller';
import type { PTController } from '@cisco-auto/pt-control/controller';
import { inspectTopologySnapshot } from './topology.js';

export interface NeighborInspectionResult {
  device: string;
  neighbors: Array<{ name: string; ports: string[] }>;
}

function collectNeighborMap(links: Array<{ device1: string; port1: string; device2: string; port2: string }>, device: string): NeighborInspectionResult {
  const map = new Map<string, Set<string>>();

  for (const link of links) {
    if (link.device1 === device) {
      if (!map.has(link.device2)) map.set(link.device2, new Set());
      map.get(link.device2)!.add(link.port2 || '');
    } else if (link.device2 === device) {
      if (!map.has(link.device1)) map.set(link.device1, new Set());
      map.get(link.device1)!.add(link.port1 || '');
    }
  }

  return {
    device,
    neighbors: Array.from(map.entries()).map(([name, ports]) => ({
      name,
      ports: Array.from(ports).filter(Boolean),
    })),
  };
}

export async function inspectNeighbors(controller: PTController, device: string): Promise<NeighborInspectionResult> {
  try {
      // Usar el snapshot global que es el método más robusto y validado
      const snapshot = await controller.snapshot();
      const links = Object.values(snapshot.links);
      
      const liveNeighbors = new Map<string, Set<string>>();
      
      for (const link of links) {
          const dev1 = link.device1;
          const port1 = link.port1;
          const dev2 = link.device2;
          const port2 = link.port2;

          if (dev1 === device) {
              if (!liveNeighbors.has(dev2)) liveNeighbors.set(dev2, new Set());
              liveNeighbors.get(dev2)!.add(port1 + " ↔ " + port2);
          } else if (dev2 === device) {
              if (!liveNeighbors.has(dev1)) liveNeighbors.set(dev1, new Set());
              liveNeighbors.get(dev1)!.add(port2 + " ↔ " + port1);
          }
      }

      return {
          device,
          neighbors: Array.from(liveNeighbors.entries()).map(([name, ports]) => ({
              name,
              ports: Array.from(ports),
          })),
      };
  } catch (e) {
      // Fallback final: intentar lo que diga el snapshot local
      const topology = await inspectTopologySnapshot(controller);
      return collectNeighborMap(topology.links, device);
  }
}

export async function runInspectNeighbors(options: { device: string; json?: boolean; deprecationLabel?: string }): Promise<void> {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    const result = await inspectNeighbors(controller, options.device);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (options.deprecationLabel) {
      console.log(chalk.yellow(options.deprecationLabel));
    }

    console.log(chalk.bold(`\n🔎 Vecinos de ${result.device}\n`));
    if (result.neighbors.length === 0) {
      console.log(chalk.gray('  Sin vecinos detectados.'));
      return;
    }

    for (const neighbor of result.neighbors) {
      console.log(`  ${chalk.cyan(neighbor.name)} ${chalk.gray(`[${neighbor.ports.join(', ')}]`)}`);
    }
    console.log();
  } finally {
    await controller.stop();
  }
}

export function createInspectNeighborsCommand(): Command {
  return new Command('neighbors')
    .description('Mostrar vecinos inmediatos de un dispositivo')
    .argument('<device>', 'Nombre del dispositivo')
    .option('--json', 'Salida en JSON', false)
    .action(async function (device: string, options: { json?: boolean }) {
      await runInspectNeighbors({ device, json: options.json });
    });
}
