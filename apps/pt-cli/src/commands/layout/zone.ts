#!/usr/bin/env bun
import { Command } from 'commander';
import chalk from 'chalk';
import { createDefaultPTController, LayoutPlannerService } from '@cisco-auto/pt-control';

export async function runLayoutZoneAssign(options: { zoneId: string; devices: string[]; json?: boolean }): Promise<void> {
  const controller = createDefaultPTController();
  const planner = new LayoutPlannerService();

  try {
    await controller.start();
    const snapshot = await controller.snapshot();
    const result = planner.assignZone(snapshot, { zoneId: options.zoneId, devices: options.devices });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold(`\n🏷️  Zona ${options.zoneId}\n`));
    for (const suggestion of result.suggestions) {
      console.log(`  ${suggestion.device} -> ${suggestion.zoneIds.join(', ')}`);
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

function createLayoutZoneCreateCommand(): Command {
  return new Command('create')
    .description('Proponer una nueva zona lógica')
    .argument('<zoneId>', 'Identificador de la zona')
    .option('-l, --label <label>', 'Etiqueta visible')
    .option('-c, --color <color>', 'Color sugerido')
    .option('--json', 'Salida en JSON', false)
    .action(async function (zoneId: string, options: { label?: string; color?: string; json?: boolean }) {
      const result = {
        zoneId,
        label: options.label,
        color: options.color,
        action: 'create-zone',
        suggestions: [`Asignar manualmente ${zoneId} a los dispositivos objetivo`],
      };

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(chalk.bold(`\n🏷️  Crear zona ${zoneId}\n`));
      if (options.label) console.log(`  Etiqueta: ${options.label}`);
      if (options.color) console.log(`  Color: ${options.color}`);
      console.log(`  Sugerencia: ${result.suggestions[0]}`);
      console.log();
    });
}

function createLayoutZoneAssignCommand(): Command {
  return new Command('assign')
    .description('Asignar dispositivos a una zona')
    .argument('<zoneId>', 'Identificador de la zona')
    .argument('<devices...>', 'Dispositivos a asignar')
    .option('--json', 'Salida en JSON', false)
    .action(async function (zoneId: string, devices: string[], options: { json?: boolean }) {
      await runLayoutZoneAssign({ zoneId, devices, json: options.json });
    });
}

export function createLayoutZoneCommand(): Command {
  const command = new Command('zone')
    .description('Gestionar propuestas de zonas lógicas');

  command.addCommand(createLayoutZoneCreateCommand());
  command.addCommand(createLayoutZoneAssignCommand());

  return command;
}
