#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController, LayoutPlannerService } from '@cisco-auto/pt-control';

export async function runLayoutAlign(options: { devices: string[]; orientation?: 'horizontal' | 'vertical'; gap?: number; json?: boolean }): Promise<void> {
  const controller = createDefaultPTController();
  const planner = new LayoutPlannerService();

  try {
    await controller.start();
    const snapshot = await controller.snapshot();
    const result = planner.alignDevices(snapshot, options.devices, options.orientation ?? 'horizontal', options.gap ?? 160);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold(`\n🧭 Alineación ${options.orientation ?? 'horizontal'}\n`));
    for (const suggestion of result.suggestions) {
      console.log(`  ${suggestion.device} -> (${suggestion.x}, ${suggestion.y})${suggestion.anchor ? ` anchored to ${suggestion.anchor}` : ''}`);
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

export function createLayoutAlignCommand(): Command {
  return new Command('align')
    .description('Alinear dispositivos horizontal o verticalmente')
    .argument('<devices...>', 'Dispositivos a alinear')
    .option('-o, --orientation <orientation>', 'horizontal|vertical', 'horizontal')
    .option('--gap <gap>', 'Separación en píxeles', '160')
    .option('--json', 'Salida en JSON', false)
    .action(async function (devices: string[], options: { orientation?: string; gap?: string; json?: boolean }) {
      await runLayoutAlign({
        devices,
        orientation: options.orientation === 'vertical' ? 'vertical' : 'horizontal',
        gap: Number(options.gap ?? '160'),
        json: options.json,
      });
    });
}
