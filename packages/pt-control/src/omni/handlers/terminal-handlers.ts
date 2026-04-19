import type { RuntimeTerminalPort, TerminalPlan, TerminalPortResult, SessionResult } from "../../ports/runtime-terminal-port.js";

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
  const plan: TerminalPlan = {
    id: `cmd-${Date.now()}`,
    device: deviceId,
    steps: [{ command }],
  };
  return port.runTerminalPlan(plan);
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
