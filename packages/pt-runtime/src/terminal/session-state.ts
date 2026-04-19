// ============================================================================
// Terminal Session State - Estado persistente por dispositivo
// ============================================================================

import type { SessionStateSnapshot } from "../domain";

export type TerminalMode =
  | "unknown"
  | "user-exec"
  | "privileged-exec"
  | "global-config"
  | "config-if"
  | "config-line"
  | "config-router"
  | "config-vlan"
  | "config-subif"
  | "wizard"
  | "confirm"
  | "pager"
  | "boot";

export type TerminalHealth = "healthy" | "stale" | "desynced" | "blocked" | "broken";

export interface TerminalSessionState {
  deviceName: string;
  sessionId: string;
  createdAt: number;
  lastActivityAt: number;
  isOpen: boolean;
  isBooting: boolean;
  wizardDetected: boolean;
  pagerActive: boolean;
  confirmPromptActive: boolean;
  lastPrompt: string;
  lastMode: TerminalMode;
  lastCommand: string;
  lastCommandStartedAt: number;
  lastCommandEndedAt: number;
  pendingCommand: string | null;
  outputBuffer: string;
  recentOutputs: string[];
  warnings: string[];
  health: TerminalHealth;
  listenersAttached: boolean;
}

export function createTerminalSessionState(deviceName: string): TerminalSessionState {
  const sessionId = "session_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  const now = Date.now();
  return {
    deviceName,
    sessionId,
    createdAt: now,
    lastActivityAt: now,
    isOpen: false,
    isBooting: false,
    wizardDetected: false,
    pagerActive: false,
    confirmPromptActive: false,
    lastPrompt: "",
    lastMode: "unknown",
    lastCommand: "",
    lastCommandStartedAt: 0,
    lastCommandEndedAt: 0,
    pendingCommand: null,
    outputBuffer: "",
    recentOutputs: [],
    warnings: [],
    health: "healthy",
    listenersAttached: false,
  };
}

export function toSnapshot(state: TerminalSessionState): SessionStateSnapshot {
  return {
    mode: state.lastMode,
    prompt: state.lastPrompt,
    paging: state.pagerActive,
    awaitingConfirm: state.confirmPromptActive,
  };
}

export function updateMode(state: TerminalSessionState, mode: TerminalMode): TerminalSessionState {
  return { ...state, lastActivityAt: Date.now(), lastMode: mode };
}

export function updatePrompt(state: TerminalSessionState, prompt: string): TerminalSessionState {
  return { ...state, lastPrompt: prompt, lastActivityAt: Date.now() };
}

export function setPaging(state: TerminalSessionState, paging: boolean): TerminalSessionState {
  return { ...state, pagerActive: paging };
}

export function markWizardDetected(state: TerminalSessionState): TerminalSessionState {
  return { ...state, wizardDetected: true, confirmPromptActive: false };
}

export function markConfirmPrompt(state: TerminalSessionState): TerminalSessionState {
  return { ...state, confirmPromptActive: true, wizardDetected: false };
}

export function setCommandStarted(state: TerminalSessionState, command: string): TerminalSessionState {
  return {
    ...state,
    lastCommand: command,
    lastCommandStartedAt: Date.now(),
    pendingCommand: command,
    outputBuffer: "",
  };
}

export function setCommandEnded(state: TerminalSessionState): TerminalSessionState {
  return {
    ...state,
    lastCommandEndedAt: Date.now(),
    pendingCommand: null,
  };
}

export function appendOutput(state: TerminalSessionState, output: string): TerminalSessionState {
  const newBuffer = state.outputBuffer + output;
  const newRecent = [...state.recentOutputs, output].slice(-10);
  return {
    ...state,
    outputBuffer: newBuffer,
    recentOutputs: newRecent,
    lastActivityAt: Date.now(),
  };
}

export function addWarning(state: TerminalSessionState, warning: string): TerminalSessionState {
  return { ...state, warnings: [...state.warnings, warning] };
}

export function markBroken(state: TerminalSessionState, reason: string): TerminalSessionState {
  return {
    ...state,
    health: "broken",
    isOpen: false,
    warnings: [...state.warnings, `Session broken: ${reason}`],
  };
}

export function markHealthy(state: TerminalSessionState): TerminalSessionState {
  return { ...state, health: "healthy" };
}

export function setOpen(state: TerminalSessionState, isOpen: boolean): TerminalSessionState {
  return { ...state, isOpen };
}

export function setBooting(state: TerminalSessionState, isBooting: boolean): TerminalSessionState {
  return { ...state, isBooting };
}