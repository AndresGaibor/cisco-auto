// packages/pt-runtime/src/pt/terminal/terminal-session.ts
// Terminal session state - single source of truth

import type { SessionStateSnapshot } from "../../domain";

export interface TerminalSessionState {
  device: string;
  mode: string;
  prompt: string;
  paging: boolean;
  awaitingConfirm: boolean;
  lastOutputAt: number;
  busyJobId: string | null;
  healthy: boolean;
}

export function createTerminalSession(device: string): TerminalSessionState {
  return {
    device,
    mode: "unknown",
    prompt: "",
    paging: false,
    awaitingConfirm: false,
    lastOutputAt: Date.now(),
    busyJobId: null,
    healthy: true,
  };
}

export function ptTerminalToSnapshot(state: TerminalSessionState): SessionStateSnapshot {
  return {
    mode: state.mode,
    prompt: state.prompt,
    paging: state.paging,
    awaitingConfirm: state.awaitingConfirm,
  };
}

export function ptTerminalUpdateMode(state: TerminalSessionState, mode: string): TerminalSessionState {
  return { ...state, mode, lastOutputAt: Date.now() };
}

export function ptTerminalUpdatePrompt(state: TerminalSessionState, prompt: string): TerminalSessionState {
  return { ...state, prompt, lastOutputAt: Date.now() };
}

export function ptTerminalSetPaging(state: TerminalSessionState, paging: boolean): TerminalSessionState {
  return { ...state, paging };
}

export function ptTerminalSetBusy(state: TerminalSessionState, jobId: string | null): TerminalSessionState {
  return { ...state, busyJobId: jobId };
}