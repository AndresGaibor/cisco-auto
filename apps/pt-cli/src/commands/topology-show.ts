#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { runInspectTopology } from './inspect/topology.js';

export function createTopologyShowCommand(): Command {
  return new Command('topology-show')
    .description('⚠️  DEPRECADO - Usa `pt topology show` o `pt inspect topology`')
    .addHelpText('before', chalk.yellow('⚠️  Este comando está deprecado. Usa:\n  pt topology show\n  pt inspect topology\n\n'))
    .option('--device <device>', 'Filtrar por dispositivo')
    .option('--json', 'Salida en JSON', false)
    .action(async function (options: { device?: string; json?: boolean }) {
      console.log(chalk.yellow('⚠️  topology-show está deprecado. Usa `pt topology show` o `pt inspect topology`.'));
      await runInspectTopology({
        device: options.device,
        json: options.json,
        deprecationLabel: undefined,
      });
    });
}
