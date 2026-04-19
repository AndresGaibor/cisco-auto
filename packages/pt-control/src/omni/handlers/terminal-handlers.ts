import type {
  RuntimeTerminalPort,
  TerminalPlan,
  TerminalPortResult,
  SessionResult,
} from "../../ports/runtime-terminal-port.js";
import {
  createHostArpPlan,
  createHostCommandPlan,
  createHostIpconfigPlan,
  createHostPingPlan,
  createHostTracertPlan,
  createIosEnablePlan,
  createIosRunningConfigPlan,
  createIosShowCdpNeighborsPlan,
  createIosShowIpInterfaceBriefPlan,
  createIosShowIpRoutePlan,
  createIosShowMacAddressTablePlan,
  createIosShowPlan,
  createIosShowVersionPlan,
  createIosShowVlanBriefPlan,
} from "../../pt/terminal/standard-terminal-plans.js";

export interface HandleOpenSessionResult extends SessionResult {}

export async function handleOpenSession(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandleOpenSessionResult> {
  return port.ensureSession(deviceId);
}

export interface HandleExecuteCommandResult extends TerminalPortResult {}

export async function handleExecuteCommand(
  deviceId: string,
  command: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  const plan: TerminalPlan = createIosShowPlan(deviceId, command, {
    id: `cmd-${Date.now()}`,
  });
  return port.runTerminalPlan(plan);
}

export async function handleShowVersion(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createIosShowVersionPlan(deviceId, { id: `show-version-${Date.now()}` }),
  );
}

export async function handleShowRunningConfig(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createIosRunningConfigPlan(deviceId, { id: `show-running-${Date.now()}` }),
  );
}

export async function handleShowIpInterfaceBrief(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createIosShowIpInterfaceBriefPlan(deviceId, { id: `show-ip-int-brief-${Date.now()}` }),
  );
}

export async function handleShowVlanBrief(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createIosShowVlanBriefPlan(deviceId, { id: `show-vlan-brief-${Date.now()}` }),
  );
}

export async function handleShowCdpNeighbors(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createIosShowCdpNeighborsPlan(deviceId, { id: `show-cdp-neighbors-${Date.now()}` }),
  );
}

export async function handleShowIpRoute(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createIosShowIpRoutePlan(deviceId, { id: `show-ip-route-${Date.now()}` }),
  );
}

export async function handleShowMacAddressTable(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createIosShowMacAddressTablePlan(deviceId, { id: `show-mac-table-${Date.now()}` }),
  );
}

export async function handleEnable(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createIosEnablePlan(deviceId, { id: `enable-${Date.now()}` }),
  );
}

export async function handleHostIpconfig(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createHostIpconfigPlan(deviceId, { id: `host-ipconfig-${Date.now()}` }),
  );
}

export async function handleHostPing(
  deviceId: string,
  target: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createHostPingPlan(deviceId, target, { id: `host-ping-${Date.now()}` }),
  );
}

export async function handleHostTracert(
  deviceId: string,
  target: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createHostTracertPlan(deviceId, target, { id: `host-tracert-${Date.now()}` }),
  );
}

export async function handleHostArp(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createHostArpPlan(deviceId, { id: `host-arp-${Date.now()}` }),
  );
}

export async function handleHostCommand(
  deviceId: string,
  command: string,
  port: RuntimeTerminalPort,
): Promise<HandleExecuteCommandResult> {
  return port.runTerminalPlan(
    createHostCommandPlan(deviceId, command, { id: `host-command-${Date.now()}` }),
  );
}

export interface HandlePagerAdvanceResult extends TerminalPortResult {}

export async function handlePagerAdvance(
  deviceId: string,
  port: RuntimeTerminalPort,
): Promise<HandlePagerAdvanceResult> {
  const plan: TerminalPlan = {
    id: `pager-${Date.now()}`,
    device: deviceId,
    steps: [{ command: " " }],
  };
  return port.runTerminalPlan(plan);
}

export {
  createIosShowPlan,
  createIosRunningConfigPlan,
  createIosShowVersionPlan,
  createIosShowIpInterfaceBriefPlan,
  createIosShowVlanBriefPlan,
  createIosShowCdpNeighborsPlan,
  createIosShowIpRoutePlan,
  createIosShowMacAddressTablePlan,
  createHostCommandPlan,
  createHostIpconfigPlan,
  createHostPingPlan,
  createHostTracertPlan,
  createHostArpPlan,
} from "../../pt/terminal/standard-terminal-plans.js";