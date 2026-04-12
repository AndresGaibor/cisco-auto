// packages/pt-runtime/src/pt/terminal/terminal-engine.ts
// Single owner of terminal sessions in PT
// NOTE: Implementation requires PT API investigation

import { createTerminalSession, toSnapshot, type TerminalSessionState } from "./terminal-session";
import type { SessionStateSnapshot } from "../../domain";

export interface TerminalEngineConfig {
  commandTimeoutMs: number;
  stallTimeoutMs: number;
}

export interface ExecuteOptions {
  timeout?: number;
  expectedPrompt?: string;
  stopOnError?: boolean;
}

export interface TerminalResult {
  ok: boolean;
  output: string;
  status: number;
  session: SessionStateSnapshot;
}

export function createTerminalEngine(config: TerminalEngineConfig) {
  const sessions = new Map<string, TerminalSessionState>();
  
  // Attach listener to PT TerminalLine
  // NOTE: Requires PT API investigation
  function attach(device: string, terminal: unknown): void {
    // TODO: Attach event listeners to PT TerminalLine API
    // Events: commandStarted, outputWritten, commandEnded, modeChanged, promptChanged, moreDisplayed
    sessions.set(device, createTerminalSession(device));
  }
  
  // Detach listeners
  function detach(device: string): void {
    sessions.delete(device);
  }
  
  // Get session snapshot
  function getSession(device: string): SessionStateSnapshot | null {
    const state = sessions.get(device);
    return state ? toSnapshot(state) : null;
  }
  
  // Execute command and wait for result
  // NOTE: PT TerminalLine.enterCommand() returns void
  // Result comes via events
  async function execute(
    device: string,
    command: string,
    options?: ExecuteOptions
  ): Promise<TerminalResult> {
    // TODO: Implement command execution via events
    throw new Error("TerminalEngine.execute not implemented");
  }
  
  return {
    attach,
    detach,
    getSession,
    execute,
  };
}