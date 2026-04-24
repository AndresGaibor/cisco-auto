/**
 * EtherChannel Workflow - Configura EtherChannel con evidencia
 * 
 * @module workflows/etherchannel-workflow
 */

import type { RuntimeTerminalPort, TerminalPlan } from '../ports/runtime-terminal-port.js';

export interface EtherChannelWorkflowConfig {
  switchA: string;
  switchB: string;
  ports: string[];
  mode: "active" | "passive" | "desirable" | "auto" | "on";
  vlanId?: number;
}

export async function configureEtherChannel(
  controller: { terminalPort: RuntimeTerminalPort },
  config: EtherChannelWorkflowConfig
): Promise<{ ok: boolean; evidence: Record<string, unknown> }> {
  const { switchA, switchB, ports, mode, vlanId } = config;
  const commandsExecuted: { device: string; command: string; result: boolean }[] = [];

  const portChannelNum = 1;
  const channelGroupCmd = `channel-group ${portChannelNum} mode ${mode}`;

  for (const port of ports) {
    const cmdA = `interface ${port}\n${channelGroupCmd}`;
    const planA: TerminalPlan = {
      id: `ec-${Date.now()}-a`,
      device: switchA,
      steps: cmdA.split('\n').map(cmd => ({ command: cmd })),
    };
    const resultA = await controller.terminalPort.runTerminalPlan(planA, { timeoutMs: 30000 });
    commandsExecuted.push({ device: switchA, command: cmdA, result: resultA.ok });

    const cmdB = `interface ${port}\n${channelGroupCmd}`;
    const planB: TerminalPlan = {
      id: `ec-${Date.now()}-b`,
      device: switchB,
      steps: cmdB.split('\n').map(cmd => ({ command: cmd })),
    };
    const resultB = await controller.terminalPort.runTerminalPlan(planB, { timeoutMs: 30000 });
    commandsExecuted.push({ device: switchB, command: cmdB, result: resultB.ok });
  }

  if (vlanId !== undefined) {
    const trunkCmdA = `interface Port-channel ${portChannelNum}\nswitchport trunk allowed vlan ${vlanId}`;
    const planTrunkA: TerminalPlan = {
      id: `ec-trunk-${Date.now()}-a`,
      device: switchA,
      steps: trunkCmdA.split('\n').map(cmd => ({ command: cmd })),
    };
    const trunkResultA = await controller.terminalPort.runTerminalPlan(planTrunkA, { timeoutMs: 30000 });
    commandsExecuted.push({ device: switchA, command: trunkCmdA, result: trunkResultA.ok });

    const trunkCmdB = `interface Port-channel ${portChannelNum}\nswitchport trunk allowed vlan ${vlanId}`;
    const planTrunkB: TerminalPlan = {
      id: `ec-trunk-${Date.now()}-b`,
      device: switchB,
      steps: trunkCmdB.split('\n').map(cmd => ({ command: cmd })),
    };
    const trunkResultB = await controller.terminalPort.runTerminalPlan(planTrunkB, { timeoutMs: 30000 });
    commandsExecuted.push({ device: switchB, command: trunkCmdB, result: trunkResultB.ok });
  }

  const allSuccessful = commandsExecuted.every(c => c.result);

  return {
    ok: allSuccessful,
    evidence: {
      switchA,
      switchB,
      ports,
      mode,
      vlanId,
      commandsExecuted,
      portChannel: `Port-channel ${portChannelNum}`,
    },
  };
}