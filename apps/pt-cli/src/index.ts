#!/usr/bin/env bun

import { Command } from 'commander';
import { addGlobalFlags, getGlobalFlags, type GlobalFlags } from './flags.ts';
import { createLabCommand } from './commands/lab/index.ts';
import { createParseCommand } from './commands/parse.ts';
import { createConfigCommand } from './commands/config.ts';
import { createValidateCommand } from './commands/validate.ts';
import { createDeviceCommand } from './commands/device/index.ts';
import { createDevicesCommand } from './commands/devices.ts';
import { createDeployCommand } from './commands/deploy.ts';
import { createInitCommand } from './commands/init.ts';
import { createTemplateCommand } from './commands/template.ts';
import { createCompletionCommand } from './commands/completion.ts';
import { createTopologyCommand } from './commands/topology/index.ts';
import { createStpCommand } from './commands/stp.ts';
import { ExitCodes } from './errors/index.ts';

const program = new Command();

addGlobalFlags(program);

program
  .name('cisco-auto')
  .description('Automatización de laboratorios Cisco Packet Tracer')
  .version('0.1.0')
  .exitOverride()
  .configureOutput({
    writeErr: (str) => console.error(str.trim()),
  });

program.addCommand(createLabCommand());
program.addCommand(createDeviceCommand());
program.addCommand(createTopologyCommand());
program.addCommand(createConfigCommand());
program.addCommand(createStpCommand());

const legacyCommand = new Command('legacy')
  .description('Comandos heredados (deprecated)')
  .hook('preAction', () => {
    console.warn('\n⚠️  ADVERTENCIA: Los comandos en "legacy" están deprecated.');
    console.warn('   Por favor usa los nuevos comandos estructurados por recurso:');
    console.warn('   • cisco-auto lab parse     (antes: cisco-auto parse)');
    console.warn('   • cisco-auto lab validate  (antes: cisco-auto validate)');
    console.warn('   • cisco-auto device list   (antes: cisco-auto devices)');
    console.warn('   • cisco-auto config        (antes: cisco-auto config)');
    console.warn('   • cisco-auto topology      (nuevo comando)');
    console.warn('');
  });

legacyCommand.addCommand(createParseCommand());
legacyCommand.addCommand(createValidateCommand());
legacyCommand.addCommand(createDevicesCommand());
legacyCommand.addCommand(createDeployCommand());
legacyCommand.addCommand(createInitCommand());
legacyCommand.addCommand(createTemplateCommand());
legacyCommand.addCommand(createCompletionCommand());

program.addCommand(legacyCommand);

try {
  program.parse(process.argv);
} catch (error) {
  if (error instanceof Error) {
    const errorCode = (error as { code?: string }).code;
    switch (errorCode) {
      case 'commander.unknownCommand':
      case 'commander.unknownOption':
        process.exit(ExitCodes.INVALID_USAGE);
        break;
      case 'commander.help':
      case 'commander.version':
        process.exit(ExitCodes.SUCCESS);
        break;
      default:
        process.exit(ExitCodes.ERROR);
    }
  }
  process.exit(ExitCodes.ERROR);
}
