import type { Command } from 'commander';
import { createDeviceCommand } from './device/index';
import { createShowCommand } from './show';
import { createConfigHostCommand } from './config-host';
import { createLabVlanCommand } from './vlan';
import { createEtherchannelCommand } from './etherchannel';
import { createLinkCommand } from './link/index';
import { createConfigIOSCommand } from './config-ios';
import { createRoutingCommand } from './routing';
import { createRouterCommand } from './router/index';
import { createACLCommand } from './acl';
import { createStpCommand } from './stp';
import { createLabServicesCommand } from './services';
import { createLabCommand } from './lab/index';
import { createResultsCommand } from './results';
import { createLogsCommand } from './logs';
import { createHelpCommand } from './help';
import { createHistoryCommand } from './history';
import { createDoctorCommand } from './doctor';
import { createTopologyCommand } from './topology/index';
import { createStatusCommand } from './status';
import { createSetupCommand } from './setup';
import { createRuntimeCommand } from './runtime';
import { createBuildCommand } from './build';

export type CommandFactory = () => Command;

export const COMMAND_FACTORIES: CommandFactory[] = [
  createDeviceCommand,
  createShowCommand,
  createConfigHostCommand,
  createLabVlanCommand,
  createEtherchannelCommand,
  createLinkCommand,
  createConfigIOSCommand,
  createRoutingCommand,
  createRouterCommand,
  createACLCommand,
  createStpCommand,
  createLabServicesCommand,
  createLabCommand,
  createResultsCommand,
  createLogsCommand,
  createHelpCommand,
  createHistoryCommand,
  createDoctorCommand,
  createTopologyCommand,
  createStatusCommand,
  createBuildCommand,
  createSetupCommand,
  createRuntimeCommand,
];

export function getRegisteredCommandIds(): string[] {
  return COMMAND_FACTORIES.map((factory) => factory().name()).sort();
}
