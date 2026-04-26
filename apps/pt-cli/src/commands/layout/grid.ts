#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control/controller';
import { LayoutPlannerService } from '@cisco-auto/pt-control/services';

export async function runLayoutGrid(options: { devices: string[]; columns?: number; gap?: number; json?: boolean }): Promise<void> {
  const controller = createDefaultPTController();
  const planner = new LayoutPlannerService();

  try {
    await controller.start();
    const snapshot = await controller.snapshot();
    const result = planner.gridDevices(snapshot, {
      devices: options.devices,
      columns: options.columns ?? 3,
      gap: options.gap ?? 180,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold(`\n🧱 Grid layout (${options.columns ?? 3} columns)\n`));
    for (const suggestion of result.suggestions) {
      console.log(`  ${suggestion.device} -> (${suggestion.x}, ${suggestion.y})`);
    }
    if (result.warnings.length > 0) {
      console.log('\n  Warnings:');
      for (const warning of result.warnings) {
        console.log(`   - ${warning}`);
      }
    }
    console.log();
  } finally {
    await controller.stop();
  }
}

export function createLayoutGridCommand(): Command {
  return new Command('grid')
    .description('Disponer dispositivos en cuadrícula')
    .argument('<devices...>', 'Dispositivos a distribuir en la cuadrícula')
    .option('-c, --columns <columns>', 'Número de columnas', '3')
    .option('--gap <gap>', 'Separación en píxeles', '180')
    .option('--json', 'Salida en JSON', false)
    .action(async function (devices: string[], options: { columns?: string; gap?: string; json?: boolean }) {
      await runLayoutGrid({
        devices,
        columns: Number(options.columns ?? '3'),
        gap: Number(options.gap ?? '180'),
        json: options.json,
      });
    });
}
