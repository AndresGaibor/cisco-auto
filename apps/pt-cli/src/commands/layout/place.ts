#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { LayoutPlannerService } from '@cisco-auto/pt-control';

export async function runLayoutPlace(options: { device: string; anchor?: string; relation?: 'left-of' | 'right-of' | 'above' | 'below'; gap?: number; json?: boolean }): Promise<void> {
  const controller = createDefaultPTController();
  const planner = new LayoutPlannerService();

  try {
    await controller.start();
    const snapshot = await controller.snapshot();
    const result = planner.suggestPlacement(snapshot, {
      device: options.device,
      anchorDevice: options.anchor,
      relation: options.relation,
      gap: options.gap,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const suggestion = result.suggestions[0];
    if (!suggestion) {
      console.log(chalk.yellow('No se pudo generar una sugerencia de layout.'));
      return;
    }

    console.log(chalk.bold(`\n📐 Layout para ${suggestion.device}\n`));
    console.log(`  Posición sugerida: (${suggestion.x}, ${suggestion.y})`);
    if (suggestion.anchor) {
      console.log(`  Ancla: ${suggestion.anchor}`);
    }
    if (suggestion.relation) {
      console.log(`  Relación: ${suggestion.relation}`);
    }
    if (suggestion.zoneIds.length > 0) {
      console.log(`  Zonas: ${suggestion.zoneIds.join(', ')}`);
    }
    if (suggestion.reasoning.length > 0) {
      console.log(`  Razones: ${suggestion.reasoning.join(' | ')}`);
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

export function createLayoutPlaceCommand(): Command {
  return new Command('place')
    .description('Proponer ubicación relativa para un dispositivo')
    .argument('<device>', 'Dispositivo a mover')
    .option('-a, --anchor <device>', 'Dispositivo ancla')
    .option('-r, --relation <relation>', 'Relación espacial (left-of|right-of|above|below)', 'right-of')
    .option('--gap <gap>', 'Separación en píxeles', '160')
    .option('--json', 'Salida en JSON', false)
    .action(async function (device: string, options: { anchor?: string; relation?: string; gap?: string; json?: boolean }) {
      await runLayoutPlace({
        device,
        anchor: options.anchor,
        relation: options.relation as any,
        gap: Number(options.gap ?? '160'),
        json: options.json,
      });
    });
}
