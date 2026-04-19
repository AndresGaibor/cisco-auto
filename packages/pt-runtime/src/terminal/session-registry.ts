// ============================================================================
// Session Registry - Una sesión por dispositivo
// ============================================================================

import type { TerminalSessionState, TerminalMode } from "./session-state";
import {
  createTerminalSessionState,
  setOpen,
  setBooting,
  updateMode,
  updatePrompt,
  setPaging,
  markWizardDetected,
  markConfirmPrompt,
  setCommandStarted,
  setCommandEnded,
  appendOutput,
  addWarning,
  markBroken,
  markHealthy,
} from "./session-state";

export interface SessionRegistry {
  getSession(deviceName: string): TerminalSessionState | undefined;
  ensureSession(deviceName: string): TerminalSessionState;
  markBroken(deviceName: string, reason: string): void;
  disposeSession(deviceName: string): void;
  disposeAllSessions(): void;
  getAllSessions(): TerminalSessionState[];
}

const sessions: Record<string, TerminalSessionState> = {};

export function getSession(deviceName: string): TerminalSessionState | undefined {
  return sessions[deviceName];
}

export function ensureSession(deviceName: string): TerminalSessionState {
  let session = sessions[deviceName];
  if (!session) {
    session = createTerminalSessionState(deviceName);
    sessions[deviceName] = session;
  }
  return session;
}

export function markBrokenSession(deviceName: string, reason: string): void {
  const session = sessions[deviceName];
  if (session) {
    sessions[deviceName] = markBroken(session, reason);
  }
}

export function disposeSession(deviceName: string): void {
  delete sessions[deviceName];
}

export function disposeAllSessions(): void {
  for (const deviceName in sessions) {
    delete sessions[deviceName];
  }
}

export function getAllSessions(): TerminalSessionState[] {
  return Object.values(sessions);
}

// Re-export state functions for convenience
export {
  setOpen,
  setBooting,
  updateMode,
  updatePrompt,
  setPaging,
  markWizardDetected,
  markConfirmPrompt,
  setCommandStarted,
  setCommandEnded,
  appendOutput,
  addWarning,
  markBroken,
  markHealthy,
  createTerminalSessionState,
};

export type { TerminalSessionState, TerminalMode, TerminalHealth } from "./session-state";