#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController, LinkFeasibilityService } from '@cisco-auto/pt-control';

export async function runLinkVerify(options: { sourceDevice: string; sourcePort: string; targetDevice: string; targetPort: string; json?: boolean }): Promise<void> {
  const controller = createDefaultPTController();
  const planner = new LinkFeasibilityService();

  try {
    await controller.start();
    const snapshot = await controller.snapshot();
    const result = planner.verifyLink(snapshot, options.sourceDevice, options.sourcePort, options.targetDevice, options.targetPort);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold(`\n✅ Verificación de enlace ${options.sourceDevice}:${options.sourcePort} ↔ ${options.targetDevice}:${options.targetPort}\n`));
    console.log(`  Factible: ${result.feasible ? 'sí' : 'no'}`);
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

export function createLinkVerifyCommand(): Command {
  return new Command('verify')
    .description('Verificar la factibilidad de un enlace entre dos puertos')
    .argument('<sourceDevice>', 'Dispositivo origen')
    .argument('<sourcePort>', 'Puerto origen')
    .argument('<targetDevice>', 'Dispositivo destino')
    .argument('<targetPort>', 'Puerto destino')
    .option('--json', 'Salida en JSON', false)
    .action(async function (sourceDevice: string, sourcePort: string, targetDevice: string, targetPort: string, options: { json?: boolean }) {
      await runLinkVerify({ sourceDevice, sourcePort, targetDevice, targetPort, json: options.json });
    });
}
