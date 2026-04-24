// TerminalEngine - Gestor de sesiones IOS en PT
// Delega ejecución de comandos a CommandExecutor

import type { TerminalSessionState } from "./terminal-session";
import type { SessionStateSnapshot } from "../../domain";
import {
  createTerminalSession,
  toSnapshot,
  updateMode,
  updatePrompt,
  setPaging,
} from "./terminal-session";
import { parsePrompt, type IosMode } from "./prompt-parser";
import {
  createCommandExecutor,
  type ExecutionOptions as ExecuteOptions,
  type CommandExecutionResult,
} from "../../terminal/command-executor";

export interface TerminalEngineConfig {
  commandTimeoutMs: number;
  stallTimeoutMs: number;
  pagerTimeoutMs: number;
}

export interface TerminalResult {
  ok: boolean;
  output: string;
  status: number;
  session: SessionStateSnapshot;
  mode: IosMode;
}

export type { ExecuteOptions };

interface PTCommandLine {
  getPrompt(): string;
  enterCommand(cmd: string): void;
  registerEvent(
    eventName: string,
    filter: unknown,
    callback: (src: unknown, args: unknown) => void,
  ): void;
  unregisterEvent(
    eventName: string,
    filter: unknown,
    callback: (src: unknown, args: unknown) => void,
  ): void;
  enterChar(charCode: number, modifiers: number): void;
}

export function createTerminalEngine(config: TerminalEngineConfig) {
  const sessions: Record<string, TerminalSessionState> = {};
  const terminals: Record<string, PTCommandLine> = {};

  const { executeCommand } = createCommandExecutor({
    commandTimeoutMs: config.commandTimeoutMs,
  });

  function attach(device: string, term: PTCommandLine): void {
    try {
      dprint("[term] ATTACH device=" + device);
    } catch {}
    terminals[device] = term;
    sessions[device] = createTerminalSession(device);

    term.registerEvent("promptChanged", null, (_src, args) => {
      const current = sessions[device];
      if (!current) return;
      const prompt = (args as { prompt?: string })?.prompt || "";
      const parsed = parsePrompt(prompt);
      let updated = updatePrompt(current, parsed.hostname);
      updated = updateMode(updated, parsed.mode);
      sessions[device] = updated;
    });

    term.registerEvent("moreDisplayed", null, (_src, args) => {
      const current = sessions[device];
      if (!current) return;
      const active = (args as { active?: boolean })?.active || false;
      sessions[device] = setPaging(current, active);
    });

    term.registerEvent("modeChanged", null, (_src, args) => {
      const current = sessions[device];
      if (!current) return;
      const newMode = (args as { newMode?: string })?.newMode || "";
      if (newMode) {
        sessions[device] = updateMode(current, newMode);
      }
    });

    term.registerEvent("commandStarted", null, (_src, args) => {
      const current = sessions[device];
      if (!current) return;
      const inputMode = (args as { inputMode?: string })?.inputMode || "";
      if (inputMode && typeof inputMode === "string") {
        const validModes = ["user-exec", "privileged-exec", "config", "config-if", "config-line", "config-router", "config-subif", "config-vlan", "unknown"] as const;
        const normalizedMode = validModes.includes(inputMode as typeof validModes[number]) ? inputMode : "unknown";
        sessions[device] = updateMode(current, normalizedMode);
      }
    });
    try {
      dprint("[term] ATTACH OK device=" + device);
    } catch {}
  }

  function detach(device: string): void {
    try {
      dprint("[term] DETACH device=" + device);
    } catch {}
    delete terminals[device];
    delete sessions[device];
    try {
      dprint("[term] DETACH OK device=" + device);
    } catch {}
  }

  function getSession(device: string): SessionStateSnapshot | null {
    const state = sessions[device];
    return state ? toSnapshot(state) : null;
  }

  function getMode(device: string): IosMode {
    const state = sessions[device];
    return state ? (state.mode as IosMode) : "unknown";
  }

  function isBusy(device: string): boolean {
    const state = sessions[device];
    return state ? state.busyJobId !== null : false;
  }

  function isAnyBusy(): boolean {
    for (const device in sessions) {
      if (sessions[device].busyJobId !== null) return true;
    }
    return false;
  }

  async function executeCmd(
    device: string,
    command: string,
    options?: ExecuteOptions,
  ): Promise<TerminalResult> {
    const term = terminals[device];
    if (!term) {
      try {
        dprint("[term] EXEC ERROR: no terminal for device=" + device);
      } catch {}
      return Promise.reject(new Error(`No terminal attached to ${device}`));
    }

    const execResult = await executeCommand(device, command, term as any, options);
    
    // Mapear al formato antiguo esperado por ExecutionEngine
    return {
      ok: execResult.ok,
      output: execResult.output,
      status: execResult.status,
      session: {
        mode: execResult.modeAfter as any,
        prompt: execResult.promptAfter,
        paging: execResult.warnings.some(w => w.toLowerCase().includes("paginación")),
        awaitingConfirm: execResult.warnings.some(w => w.toLowerCase().includes("confirmación")),
      },
      mode: execResult.modeAfter as IosMode,
    };
  }

  function continuePager(device: string): void {
    try {
      dprint("[term] PAGER CONTINUE device=" + device);
    } catch {}
    const term = terminals[device];
    if (term) {
      term.enterChar(32, 0);
    }
  }

  function confirmPrompt(device: string): void {
    try {
      dprint("[term] CONFIRM device=" + device);
    } catch {}
    const term = terminals[device];
    if (term) {
      term.enterChar(13, 0);
    }
  }

  return {
    attach,
    detach,
    getSession,
    getMode,
    isBusy,
    isAnyBusy,
    executeCommand: executeCmd,
    continuePager,
    confirmPrompt,
  };
}

export type { PTCommandLine };
export type TerminalEngine = ReturnType<typeof createTerminalEngine>;
