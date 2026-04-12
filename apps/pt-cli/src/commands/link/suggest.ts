#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController, LinkFeasibilityService } from '@cisco-auto/pt-control';

export async function runLinkSuggest(options: { sourceDevice: string; targetDevice: string; json?: boolean }): Promise<void> {
  const controller = createDefaultPTController();
  const planner = new LinkFeasibilityService();

  try {
    await controller.start();
    const snapshot = await controller.snapshot();
    const result = planner.suggestLink(snapshot, options.sourceDevice, options.targetDevice);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold(`\n🔗 Sugerencia de enlace ${options.sourceDevice} → ${options.targetDevice}\n`));
    console.log(`  Factible: ${result.feasible ? 'sí' : 'no'}`);
    if (result.source) console.log(`  Puerto origen: ${result.source.port}`);
    if (result.target) console.log(`  Puerto destino: ${result.target.port}`);
    if (result.reasons.length > 0) {
      console.log('  Razones:');
      for (const reason of result.reasons) {
        console.log(`   - ${reason}`);
      }
    }
    console.log();
  } finally {
    await controller.stop();
  }
}

export function createLinkSuggestCommand(): Command {
  return new Command('suggest')
    .description('Sugerir puertos libres para conectar dos dispositivos')
    .argument('<sourceDevice>', 'Dispositivo origen')
    .argument('<targetDevice>', 'Dispositivo destino')
    .option('--json', 'Salida en JSON', false)
    .action(async function (sourceDevice: string, targetDevice: string, options: { json?: boolean }) {
      await runLinkSuggest({ sourceDevice, targetDevice, json: options.json });
    });
}
