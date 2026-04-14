// TerminalEngine - Single owner of IOS session in PT
// Uses PT TerminalLine events for async command execution

import type { TerminalSessionState } from "./terminal-session";
import type { SessionStateSnapshot } from "../../domain";
import {
  createTerminalSession,
  toSnapshot,
  updateMode,
  updatePrompt,
  setPaging,
  setBusy,
} from "./terminal-session";
import { parsePrompt, type IosMode } from "./prompt-parser";
import { CommandStatus, isStatusOk } from "./terminal-events";

export interface TerminalEngineConfig {
  commandTimeoutMs: number;
  stallTimeoutMs: number;
  pagerTimeoutMs: number;
}

export interface ExecuteOptions {
  timeout?: number;
  expectedPrompt?: string;
  stopOnError?: boolean;
  ensureMode?: IosMode;
}

export interface TerminalResult {
  ok: boolean;
  output: string;
  status: number;
  session: SessionStateSnapshot;
  mode: IosMode;
}

/**
 * PT TerminalLine API interface
 */
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

/**
 * TerminalEngine - manages IOS sessions using PT TerminalLine API
 */
export function createTerminalEngine(config: TerminalEngineConfig) {
  const sessions = new Map<string, TerminalSessionState>();
  const terminals = new Map<string, PTCommandLine>();

  function attach(device: string, term: PTCommandLine): void {
    terminals.set(device, term);
    sessions.set(device, createTerminalSession(device));

    term.registerEvent("promptChanged", null, (_src, args) => {
      const current = sessions.get(device);
      if (!current) return;
      const prompt = (args as { prompt?: string })?.prompt || "";
      const parsed = parsePrompt(prompt);
      let updated = updatePrompt(current, parsed.hostname);
      updated = updateMode(updated, parsed.mode);
      sessions.set(device, updated);
    });

    term.registerEvent("moreDisplayed", null, (_src, args) => {
      const current = sessions.get(device);
      if (!current) return;
      const active = (args as { active?: boolean })?.active || false;
      sessions.set(device, setPaging(current, active));
    });

    term.registerEvent("modeChanged", null, (_src, args) => {
      const current = sessions.get(device);
      if (!current) return;
      const newMode = (args as { newMode?: string })?.newMode || "";
      if (newMode) {
        sessions.set(device, updateMode(current, newMode));
      }
    });

    term.registerEvent("commandStarted", null, (_src, args) => {
      const current = sessions.get(device);
      if (!current) return;
      const inputMode = (args as { inputMode?: string })?.inputMode || "";
      if (inputMode) {
        sessions.set(device, updateMode(current, inputMode as IosMode));
      }
    });
  }

  function detach(device: string): void {
    terminals.delete(device);
    sessions.delete(device);
  }

  function getSession(device: string): SessionStateSnapshot | null {
    const state = sessions.get(device);
    return state ? toSnapshot(state) : null;
  }

  function getMode(device: string): IosMode {
    const state = sessions.get(device);
    return state ? (state.mode as IosMode) : "unknown";
  }

  function isBusy(device: string): boolean {
    const state = sessions.get(device);
    return state ? state.busyJobId !== null : false;
  }

  function executeCommand(
    device: string,
    command: string,
    options?: ExecuteOptions,
  ): Promise<TerminalResult> {
    const term = terminals.get(device);
    if (!term) {
      return Promise.reject(new Error(`No terminal attached to ${device}`));
    }
    const terminal = term;

    const timeout = options?.timeout ?? config.commandTimeoutMs;

    // Helper to read current session state (avoids stale closure references)
    function currentSession(): TerminalSessionState {
      const s = sessions.get(device);
      if (!s) throw new Error(`Session lost for ${device} during executeCommand`);
      return s;
    }

    return new Promise((resolve, reject) => {
      const buffer: string[] = [];
      let settled = false;
      let moreListener: ((src: unknown, args: unknown) => void) | null = null;

      sessions.set(device, setBusy(currentSession(), `cmd-${Date.now()}`));

      const timeoutHandle = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            terminal.unregisterEvent("outputWritten", null, onOutput);
          } catch {}
          try {
            terminal.unregisterEvent("commandEnded", null, onEnded);
          } catch {}
          if (moreListener) {
            try {
              terminal.unregisterEvent("moreDisplayed", null, moreListener);
            } catch {}
          }
          sessions.set(device, setBusy(currentSession(), null));
          reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
        }
      }, timeout);

      function onOutput(_src: unknown, args: unknown) {
        const a = args as { newOutput?: string; data?: string; output?: string };
        const data = a?.newOutput ?? a?.data ?? a?.output ?? "";
        if (data) {
          buffer.push(String(data));
        }
      }

      function onMore(_src: unknown, _args: unknown) {
        const cs = currentSession();
        sessions.set(device, setPaging(cs, true));
      }
      moreListener = onMore;

      function onEnded(_src: unknown, args: unknown) {
        if (settled) return;

        const a = args as { status?: number };
        const status = a?.status ?? 1;

        settled = true;
        clearTimeout(timeoutHandle);

        try {
          terminal.unregisterEvent("outputWritten", null, onOutput);
        } catch {}
        try {
          terminal.unregisterEvent("commandEnded", null, onEnded);
        } catch {}
        try {
          terminal.unregisterEvent("moreDisplayed", null, moreListener as any);
        } catch {}

        // Read the LATEST session state - prompt/mode/paging from events
        const finalSession = currentSession();
        sessions.set(device, setBusy(finalSession, null));

        const output = buffer.join("");
        resolve({
          ok: isStatusOk(status),
          output,
          status,
          session: toSnapshot(finalSession),
          mode: finalSession.mode as IosMode,
        });
      }

      try {
        terminal.registerEvent("outputWritten", null, onOutput);
      } catch {}
      try {
        terminal.registerEvent("commandEnded", null, onEnded);
      } catch {}
      try {
        terminal.registerEvent("moreDisplayed", null, moreListener as any);
      } catch {}

      // Send the command - returns void, state comes via events
      terminal.enterCommand(command);
    });
  }

  function continuePager(device: string): void {
    const term = terminals.get(device);
    if (term) {
      term.enterChar(32, 0);
    }
  }

  function confirmPrompt(device: string): void {
    const term = terminals.get(device);
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
    executeCommand,
    continuePager,
    confirmPrompt,
  };
}

export type { PTCommandLine };
export type TerminalEngine = ReturnType<typeof createTerminalEngine>;
