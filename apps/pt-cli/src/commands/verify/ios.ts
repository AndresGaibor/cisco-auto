#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController } from '@cisco-auto/pt-control';
import { buildIosVerificationReport, evidenceFromResult, parseEvidenceInput, renderIosVerificationReport } from '../../application/verify-ios.js';

export interface VerifyIosOptions {
  evidence?: string;
  json?: boolean;
  timeout?: string;
}

export async function runVerifyIos(device: string, commandParts: string[], options: VerifyIosOptions): Promise<void> {
  const command = commandParts.join(' ');
  let evidence;

  if (options.evidence) {
    evidence = parseEvidenceInput(options.evidence);
  } else {
    const controller = createDefaultPTController();
    try {
      await controller.start();
      const result = await controller.execIosWithEvidence(device, command, true, Number(options.timeout ?? '5000'));
      evidence = evidenceFromResult(result);
    } finally {
      await controller.stop();
    }
  }

  const report = buildIosVerificationReport(evidence);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const rendered = renderIosVerificationReport(report);
  console.log(chalk.bold(rendered));
  if (!report.ok) {
    process.exitCode = 1;
  }
}

export function createVerifyIosCommand(): Command {
  return new Command('ios')
    .description('Verificar evidencia de ejecución IOS')
    .argument('<device>', 'Dispositivo destino')
    .argument('<command...>', 'Comando IOS ejecutado')
    .option('--evidence <json>', 'Usar evidencia JSON preconstruida')
    .option('--timeout <ms>', 'Timeout de ejecución real', '5000')
    .option('--json', 'Salida en JSON', false)
    .action(async (device: string, commandParts: string[], options: VerifyIosOptions) => {
      await runVerifyIos(device, commandParts, options);
    });
}
