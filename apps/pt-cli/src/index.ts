#!/usr/bin/env bun

import { Command } from 'commander';
import { addGlobalFlags, type GlobalFlags, getGlobalFlags } from './flags';
import { createDeviceCommand } from './commands/device/index';
import { createShowCommand } from './commands/show';
import { createConfigHostCommand } from './commands/config-host';
import { createLabVlanCommand } from './commands/vlan';
import { createEtherchannelCommand } from './commands/etherchannel';
import { createLinkCommand } from './commands/link/index';
import { createConfigIOSCommand } from './commands/config-ios';
import { createRoutingCommand } from './commands/routing';
import { createACLCommand } from './commands/acl';
import { createStpCommand } from './commands/stp';
import { createLabServicesCommand } from './commands/services';
import { createResultsCommand } from './commands/results';
import { createLogsCommand } from './commands/logs';
import { createHelpCommand } from './commands/help';
import { createHistoryCommand } from './commands/history';
import { createDoctorCommand } from './commands/doctor';
import { createCompletionCommand } from './commands/completion';
import { createTopologyCommand } from './commands/topology/index';
import { createStatusCommand } from './commands/status';
import { ExitCodes } from './errors/index';

function createBuildCommand(): Command {
  const cmd = new Command('build')
    .description('Build y deploy de archivos a ~/pt-dev/')
    .action(async () => {
      const { execSync } = await import('child_process');
      const { resolve } = await import('path');
      
      console.log('🔨 Build y deploy de PT Runtime...\n');
      
      const rootDir = resolve(import.meta.dirname, '../..');
      
      try {
        execSync('bun run pt:build', { stdio: 'inherit', cwd: rootDir });
        console.log('\n✅ Build completado. Archivos deployados a ~/pt-dev/');
        console.log('💡 Ahora carga ~/pt-dev/main.js en Packet Tracer');
      } catch (error) {
        process.exit(1);
      }
    });
    
  return cmd;
}

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

program.addCommand(createBuildCommand());
program.addCommand(createDeviceCommand());
program.addCommand(createShowCommand());
program.addCommand(createConfigHostCommand());
program.addCommand(createLabVlanCommand());
program.addCommand(createEtherchannelCommand());
program.addCommand(createLinkCommand());
program.addCommand(createConfigIOSCommand());
program.addCommand(createRoutingCommand());
program.addCommand(createACLCommand());
program.addCommand(createStpCommand());
program.addCommand(createLabServicesCommand());
program.addCommand(createResultsCommand());
program.addCommand(createLogsCommand());
program.addCommand(createHelpCommand());
program.addCommand(createHistoryCommand());
program.addCommand(createDoctorCommand());
program.addCommand(createCompletionCommand());
program.addCommand(createTopologyCommand());
program.addCommand(createStatusCommand());

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
