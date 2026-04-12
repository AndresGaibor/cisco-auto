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

export function toSnapshot(state: TerminalSessionState): SessionStateSnapshot {
  return {
    mode: state.mode,
    prompt: state.prompt,
    paging: state.paging,
    awaitingConfirm: state.awaitingConfirm,
  };
}

export function updateMode(state: TerminalSessionState, mode: string): TerminalSessionState {
  return { ...state, mode, lastOutputAt: Date.now() };
}

export function updatePrompt(state: TerminalSessionState, prompt: string): TerminalSessionState {
  return { ...state, prompt, lastOutputAt: Date.now() };
}

export function setPaging(state: TerminalSessionState, paging: boolean): TerminalSessionState {
  return { ...state, paging };
}

export function setBusy(state: TerminalSessionState, jobId: string | null): TerminalSessionState {
  return { ...state, busyJobId: jobId };
}