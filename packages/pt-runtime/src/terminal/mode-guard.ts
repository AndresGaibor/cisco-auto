// ============================================================================
// Mode Guard - Transiciones de modo explícitas
// ============================================================================

import type { TerminalSessionState, TerminalMode } from "./session-state";
import { getSession, ensureSession, updateMode } from "./session-registry";
import { detectModeFromPrompt } from "./prompt-detector";
import { createCommandExecutor, type CommandExecutionResult, type PTCommandLine } from "./command-executor";

export interface ModeTransitionResult {
  ok: boolean;
  fromMode: TerminalMode;
  toMode: TerminalMode;
  error?: string;
}

export function createModeGuard() {
  const executor = createCommandExecutor();

  async function ensureUserExec(
    deviceName: string,
    terminal: PTCommandLine
  ): Promise<ModeTransitionResult> {
    const session = ensureSession(deviceName);
    const currentMode = session.lastMode;

    if (currentMode === "user-exec") {
      return { ok: true, fromMode: currentMode, toMode: currentMode };
    }

    if (currentMode === "privileged-exec") {
      const result = await executor.executeCommand(deviceName, "disable", terminal);
      const newMode = detectModeFromPrompt(terminal.getPrompt());
      return result.ok
        ? { ok: true, fromMode: currentMode, toMode: newMode }
        : { ok: false, fromMode: currentMode, toMode: newMode, error: result.error };
    }

    return { ok: false, fromMode: currentMode, toMode: currentMode, error: "Cannot determine mode" };
  }

  async function ensurePrivilegedExec(
    deviceName: string,
    terminal: PTCommandLine
  ): Promise<ModeTransitionResult> {
    const session = ensureSession(deviceName);
    const currentMode = session.lastMode;

    if (currentMode === "privileged-exec") {
      return { ok: true, fromMode: currentMode, toMode: currentMode };
    }

    if (currentMode === "user-exec") {
      const result = await executor.executeCommand(deviceName, "enable", terminal);
      const newMode = detectModeFromPrompt(terminal.getPrompt());
      return result.ok
        ? { ok: true, fromMode: currentMode, toMode: newMode }
        : { ok: false, fromMode: currentMode, toMode: newMode, error: result.error };
    }

    return { ok: false, fromMode: currentMode, toMode: currentMode, error: "Cannot determine mode" };
  }

  async function ensureGlobalConfig(
    deviceName: string,
    terminal: PTCommandLine
  ): Promise<ModeTransitionResult> {
    const session = ensureSession(deviceName);
    const currentMode = session.lastMode;

    if (currentMode === "global-config" || currentMode.startsWith("config-")) {
      return { ok: true, fromMode: currentMode, toMode: currentMode };
    }

    if (currentMode === "privileged-exec") {
      const result = await executor.executeCommand(deviceName, "configure terminal", terminal);
      const newMode = detectModeFromPrompt(terminal.getPrompt());
      return result.ok
        ? { ok: true, fromMode: currentMode, toMode: newMode }
        : { ok: false, fromMode: currentMode, toMode: newMode, error: result.error };
    }

    return { ok: false, fromMode: currentMode, toMode: currentMode, error: "Cannot enter config mode" };
  }

  async function ensureReadyForPlan(
    deviceName: string,
    terminal: PTCommandLine,
    targetMode: TerminalMode
  ): Promise<ModeTransitionResult> {
    switch (targetMode) {
      case "user-exec":
        return ensureUserExec(deviceName, terminal);
      case "privileged-exec":
        return ensurePrivilegedExec(deviceName, terminal);
      case "global-config":
      case "config-if":
      case "config-line":
      case "config-router":
      case "config-vlan":
      case "config-subif":
        return ensureGlobalConfig(deviceName, terminal);
      default:
        return { ok: false, fromMode: "unknown", toMode: targetMode, error: `Unknown target mode: ${targetMode}` };
    }
  }

  return {
    ensureUserExec,
    ensurePrivilegedExec,
    ensureGlobalConfig,
    ensureReadyForPlan,
  };
}