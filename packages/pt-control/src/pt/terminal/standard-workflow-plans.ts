import type { TerminalPlan } from "../../ports/runtime-terminal-port.js";
import {
  createIosConfigPlan,
  createIosEnablePlan,
  createIosShowPlan,
  createIosRunningConfigPlan,
} from "./standard-terminal-plans.js";

export interface VlanWorkflowInput {
  device: string;
  vlanId: number;
  vlanName: string;
  ports: string[];
}

export function createVlanSimplePlan(input: VlanWorkflowInput): TerminalPlan {
  const commands = [
    `vlan ${input.vlanId}`,
    `name ${input.vlanName}`,
    "exit",
  ];

  for (const port of input.ports) {
    commands.push(`interface ${port}`);
    commands.push(`switchport mode access`);
    commands.push(`switchport access vlan ${input.vlanId}`);
    commands.push("exit");
  }

  return createIosConfigPlan(input.device, commands, { save: true });
}

export interface TrunkWorkflowInput {
  device: string;
  port: string;
  nativeVlan?: number;
  allowedVlans?: number[];
}

export function createTrunkSimplePlan(input: TrunkWorkflowInput): TerminalPlan {
  const commands: string[] = [
    `interface ${input.port}`,
    "switchport mode trunk",
  ];

  if (input.nativeVlan) {
    commands.push(`switchport trunk native vlan ${input.nativeVlan}`);
  }

  if (input.allowedVlans && input.allowedVlans.length > 0) {
    commands.push(`switchport trunk allowed vlan ${input.allowedVlans.join(",")}`);
  }

  commands.push("exit");

  return createIosConfigPlan(input.device, commands, { save: true });
}

export interface RouterSubinterfaceInput {
  device: string;
  parentInterface: string;
  vlanId: number;
  ipAddress: string;
  subnetMask: string;
  nativeVlan?: number;
}

export function createRouterOnStickPlan(input: RouterSubinterfaceInput): TerminalPlan {
  const commands: string[] = [
    `interface ${input.parentInterface}.${input.vlanId}`,
  ];

  if (input.nativeVlan && input.nativeVlan !== input.vlanId) {
    commands.push(`encapsulation dot1Q ${input.vlanId} native`);
  } else {
    commands.push(`encapsulation dot1Q ${input.vlanId}`);
  }

  commands.push(`ip address ${input.ipAddress} ${input.subnetMask}`);
  commands.push("no shutdown");
  commands.push("exit");

  return createIosConfigPlan(input.device, commands, { save: true });
}

export function createIpRoutingPlan(device: string): TerminalPlan {
  return createIosConfigPlan(device, ["ip routing", "exit"], { save: false });
}

export interface DhcpPoolInput {
  device: string;
  poolName: string;
  network: string;
  subnetMask: string;
  defaultRouter: string;
  dnsServers?: string[];
  domainName?: string;
}

export function createDhcpPoolPlan(input: DhcpPoolInput): TerminalPlan {
  const commands = [
    `ip dhcp pool ${input.poolName}`,
    `network ${input.network} ${input.subnetMask}`,
    `default-router ${input.defaultRouter}`,
  ];

  if (input.dnsServers?.length) {
    commands.push(`dns-server ${input.dnsServers.join(" ")}`);
  }

  if (input.domainName) {
    commands.push(`domain-name ${input.domainName}`);
  }

  commands.push("exit");

  return createIosConfigPlan(input.device, commands, { save: true });
}

export function createDhcpExclusionPlan(
  device: string,
  startIp: string,
  endIp: string,
): TerminalPlan {
  return createIosConfigPlan(device, [
    `ip dhcp excluded-address ${startIp} ${endIp}`,
  ], { save: true });
}

export interface OspfNetworkInput {
  device: string;
  processId: number;
  network: string;
  wildcard: string;
  area: number;
}

export function createOspfNetworkPlan(input: OspfNetworkInput): TerminalPlan {
  const commands = [
    `router ospf ${input.processId}`,
    `network ${input.network} ${input.wildcard} area ${input.area}`,
  ];

  return createIosConfigPlan(input.device, commands, { save: true });
}

export function createSaveConfigPlan(device: string): TerminalPlan {
  return createIosConfigPlan(device, [], { save: true });
}

export function createEnablePlan(device: string): TerminalPlan {
  return createIosEnablePlan(device);
}

export function createShowPlan(device: string, command: string): TerminalPlan {
  return createIosShowPlan(device, command);
}

export function createRunningConfigPlan(device: string): TerminalPlan {
  return createIosRunningConfigPlan(device);
}