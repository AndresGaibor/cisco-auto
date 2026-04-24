/**
 * OSPF Workflow - Configura OSPF con evidencia
 * 
 * @module workflows/ospf-workflow
 */

import type { RuntimeTerminalPort, TerminalPlan } from '../ports/runtime-terminal-port.js';

export interface OspfWorkflowConfig {
  routerName: string;
  networks: { network: string; wildcard: string; area: number }[];
  processId?: number;
}

export async function configureOspf(
  controller: { terminalPort: RuntimeTerminalPort },
  config: OspfWorkflowConfig
): Promise<{ ok: boolean; evidence: Record<string, unknown> }> {
  const { routerName, networks, processId = 1 } = config;
  const evidence: Record<string, unknown> = {
    routerName,
    processId,
    networks,
    commandsExecuted: [] as { device: string; command: string; result: boolean }[],
  };

  const commands = [`configure terminal`, `router ospf ${processId}`];
  
  for (const net of networks) {
    commands.push(`network ${net.network} ${net.wildcard} area ${net.area}`);
  }
  
  commands.push(`exit`);

  const plan: TerminalPlan = {
    id: `ospf-${Date.now()}`,
    device: routerName,
    steps: commands.map(cmd => ({ command: cmd })),
  };

  const result = await controller.terminalPort.runTerminalPlan(plan, { timeoutMs: 30000 });
  
  evidence.commandsExecuted = commands.map(cmd => ({ device: routerName, command: cmd, result: result.ok }));
  evidence.routerOspfResult = result;

  return { ok: result.ok, evidence };
}