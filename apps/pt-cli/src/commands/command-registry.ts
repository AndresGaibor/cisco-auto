import type { Command } from 'commander';
import { createDeviceCommand } from './device/index';
import { createShowCommand } from './show';
import { createShowRunCommand } from './show-run';
import { createShowRouteCommand } from './show-route';
import { createShowVlanCommand } from './show-vlan';
import { createShowCdpCommand } from './show-cdp';
import { createConfigHostCommand } from './config-host';
import { createLabVlanCommand } from './vlan';
import { createEtherchannelCommand } from './etherchannel';
import { createLinkCommand } from './link/index';
import { createConfigIOSCommand } from './config-ios';
import { createConfigOspfCommand } from './config-ospf';
import { createConfigEigrpCommand } from './config-eigrp';
import { createConfigBgpCommand } from './config-bgp';
import { createConfigAclCommand } from './config-acl';
import { createConfigVlanCommand } from './config-vlan';
import { createConfigInterfaceCommand } from './config-interface';
import { createConfigApplyCommand } from './config-apply';
import { createRoutingCommand } from './routing';
import { createRouterCommand } from './router/index';
import { createACLCommand } from './acl';
import { createStpCommand } from './stp';
import { createLabServicesCommand } from './services';
import { createLabCommand } from './lab/index';
import { createResultsCommand } from './results';
import { createLogsCommand } from './logs';
import { createHelpCommand } from './help';
import { createCompletionCommand } from './completion';
import { createHistoryCommand } from './history';
import { createHistorySearchCommand } from './history-search';
import { createHistoryFailedCommand } from './history-failed';
import { createDoctorCommand } from './doctor';
import { createTopologyCommand } from './topology/index';
import { createTopologyShowCommand } from './topology-show';
import { createStatusCommand } from './status';
import { createBuildCommand } from './build';
import { createSetupCommand } from './setup';
import { createRuntimeCommand } from './runtime';
import { createDevicesListCommand } from './devices-list';
import { createDevicesAddCommand } from './devices-add';
import { createConfigPrefsCommand } from './config-prefs';
import { createAuditTailCommand } from './audit-tail';
import { createAuditExportCommand } from './audit-export';
import { createAuditFailedCommand } from './audit-failed';
import { createAuditQueryCommand } from './audit-query';
import { createBridgeCommand } from './bridge';

export type CommandFactory = () => Command;

export const COMMAND_FACTORIES: CommandFactory[] = [
  createDeviceCommand,
  createShowCommand,
  createShowRunCommand,
  createShowRouteCommand,
  createShowVlanCommand,
  createShowCdpCommand,
  createConfigHostCommand,
  createConfigOspfCommand,
  createConfigEigrpCommand,
  createConfigBgpCommand,
  createConfigAclCommand,
  createConfigVlanCommand,
  createConfigInterfaceCommand,
  createConfigApplyCommand,
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
  createCompletionCommand,
  createHistoryCommand,
  createHistorySearchCommand,
  createHistoryFailedCommand,
  createDoctorCommand,
  createTopologyCommand,
  createTopologyShowCommand,
  createStatusCommand,
  createBuildCommand,
  createSetupCommand,
  createRuntimeCommand,
  createDevicesListCommand,
  createDevicesAddCommand,
  createConfigPrefsCommand,
  createAuditTailCommand,
  createAuditExportCommand,
  createAuditFailedCommand,
  createAuditQueryCommand,
  createBridgeCommand,
];

export function getRegisteredCommandIds(): string[] {
  return COMMAND_FACTORIES.map((factory) => factory().name()).sort();
}
