#!/usr/bin/env bun

import { Command } from 'commander';
import { addGlobalFlags, getGlobalFlags, type GlobalFlags } from './flags.ts';
import { createLabCommand } from './commands/lab/index.ts';
import { createConfigCommand } from './commands/config.ts';
import { createDeviceCommand } from './commands/device/index.ts';
import { createTopologyCommand } from './commands/topology/index.ts';
import { createStpCommand } from './commands/stp.ts';
import { createLinkCommand } from './commands/link/index.ts';
import { createConfigIOSCommand } from './commands/config-ios.ts';
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
program.addCommand(createLinkCommand());
program.addCommand(createConfigIOSCommand());

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
