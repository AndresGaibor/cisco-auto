#!/usr/bin/env bun
import { Command } from 'commander';
import { runInspectTopology } from '../inspect/topology.js';

export function createTopologyShowCommand(): Command {
  return new Command('show')
    .description('Mostrar topología materializada del canvas PT (alias de pt inspect topology)')
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--json', 'Salida en JSON', false)
    .action(async function (options: { device?: string; json?: boolean }) {
      await runInspectTopology({
        device: options.device,
        json: options.json,
        deprecationLabel: '⚠️  topology show está deprecado; usa `pt inspect topology`.',
      });
    });
}
