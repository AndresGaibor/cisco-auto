#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController, type PTController } from '@cisco-auto/pt-control';

export interface DriftInspectionResult {
  driftDetected: boolean;
  snapshotDeviceCount: number;
  snapshotLinkCount: number;
  systemDeviceCount: number;
  systemLinkCount: number;
  warnings: string[];
}

export async function inspectDrift(controller: PTController): Promise<DriftInspectionResult> {
  const snapshot = await controller.snapshot();
  const system = controller.getSystemContext();
  const snapshotDeviceCount = Object.keys(snapshot.devices ?? {}).length;
  const snapshotLinkCount = Object.keys(snapshot.links ?? {}).length;
  const warnings: string[] = [];

  if (snapshotDeviceCount !== system.deviceCount) {
    warnings.push(`Dispositivos: snapshot=${snapshotDeviceCount}, sistema=${system.deviceCount}`);
  }
  if (snapshotLinkCount !== system.linkCount) {
    warnings.push(`Enlaces: snapshot=${snapshotLinkCount}, sistema=${system.linkCount}`);
  }
  if (!system.topologyMaterialized) {
    warnings.push('La topología aún no está materializada en el contexto del sistema.');
  }

  return {
    driftDetected: warnings.length > 0,
    snapshotDeviceCount,
    snapshotLinkCount,
    systemDeviceCount: system.deviceCount,
    systemLinkCount: system.linkCount,
    warnings,
  };
}

export async function runInspectDrift(options: { json?: boolean; deprecationLabel?: string }): Promise<void> {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    const result = await inspectDrift(controller);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (options.deprecationLabel) {
      console.log(chalk.yellow(options.deprecationLabel));
    }

    console.log(chalk.bold('\n🧭 Drift de contexto\n'));
    console.log(`  Snapshot: ${result.snapshotDeviceCount} dispositivos / ${result.snapshotLinkCount} enlaces`);
    console.log(`  Sistema  : ${result.systemDeviceCount} dispositivos / ${result.systemLinkCount} enlaces`);
    console.log(`  Drift    : ${result.driftDetected ? chalk.red('sí') : chalk.green('no')}`);
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

export function createInspectDriftCommand(): Command {
  return new Command('drift')
    .description('Comparar snapshot viva contra el contexto del sistema')
    .option('--json', 'Salida en JSON', false)
    .action(async function (options: { json?: boolean }) {
      await runInspectDrift({ json: options.json });
    });
}
