#!/usr/bin/env bun

import { Command } from 'commander';
import { addGlobalFlags, type GlobalFlags } from './flags.ts';
import { createDeviceCommand } from './commands/device/index.ts';
import { createLabVlanCommand } from './commands/vlan.ts';
import { createLinkCommand } from './commands/link/index.ts';
import { createConfigIOSCommand } from './commands/config-ios.ts';
import { createRoutingCommand } from './commands/routing.ts';
import { createACLCommand } from './commands/acl.ts';
import { createStpCommand } from './commands/stp.ts';
import { createLabServicesCommand } from './commands/services.ts';
import { createShowCommand } from './commands/show.ts';
import { createConfigHostCommand } from './commands/config-host.ts';
import { ExitCodes } from './errors/index.ts';

const program = new Command();

addGlobalFlags(program);

program
  .name('pt')
  .description('CLI para controlar Cisco Packet Tracer en tiempo real')
  .version('0.2.0')
  .exitOverride()
  .configureOutput({
    writeErr: (str) => console.error(str.trim()),
  });

program.addCommand(createDeviceCommand());
program.addCommand(createShowCommand());
program.addCommand(createConfigHostCommand());
program.addCommand(createLabVlanCommand());
program.addCommand(createLinkCommand());
program.addCommand(createConfigIOSCommand());
program.addCommand(createRoutingCommand());
program.addCommand(createACLCommand());
program.addCommand(createStpCommand());
program.addCommand(createLabServicesCommand());

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
