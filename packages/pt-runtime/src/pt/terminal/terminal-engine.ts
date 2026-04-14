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

    const session = sessions.get(device)!;

    term.registerEvent("promptChanged", null, (src, args) => {
      const prompt = (args as { prompt?: string })?.prompt || "";
      const parsed = parsePrompt(prompt);
      sessions.set(device, updatePrompt(session, parsed.hostname));
      sessions.set(device, updateMode(session, parsed.mode));
    });

    term.registerEvent("moreDisplayed", null, (src, args) => {
      const active = (args as { active?: boolean })?.active || false;
      sessions.set(device, setPaging(session, active));
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
    const session = sessions.get(device)!;

    return new Promise((resolve, reject) => {
      const buffer: string[] = [];
      let settled = false;

      sessions.set(device, setBusy(session, `cmd-${Date.now()}`));

      const timeoutHandle = setTimeout(() => {
        if (!settled) {
          settled = true;
          // Limpiar event listeners para evitar memory leaks
          try {
            terminal.unregisterEvent("outputWritten", null, onOutput);
          } catch {
            // PT API puede fallar en unregister, ignorar silenciosamente
          }
          try {
            terminal.unregisterEvent("commandEnded", null, onEnded);
          } catch {
            // PT API puede fallar en unregister, ignorar silenciosamente
          }
          sessions.set(device, setBusy(session, null));
          reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
        }
      }, timeout);

      function onOutput(src: unknown, args: unknown) {
        const a = args as { newOutput?: string; data?: string; output?: string };
        const data = a?.newOutput ?? a?.data ?? a?.output ?? "";
        if (data) {
          buffer.push(String(data));
        }

        if (buffer.join("").includes("--More--")) {
          sessions.set(device, setPaging(session, true));
        }
      }

      function onEnded(src: unknown, args: unknown) {
        if (settled) return;

        const a = args as { status?: number };
        const status = a?.status ?? 1;

        settled = true;
        clearTimeout(timeoutHandle);

        try {
          terminal.unregisterEvent("outputWritten", null, onOutput);
        } catch {
          // PT API puede fallar en unregister, ignorar silenciosamente
        }
        try {
          terminal.unregisterEvent("commandEnded", null, onEnded);
        } catch {
          // PT API puede fallar en unregister, ignorar silenciosamente
        }

        sessions.set(device, setBusy(session, null));

        const output = buffer.join("");
        resolve({
          ok: isStatusOk(status),
          output,
          status,
          session: toSnapshot(session),
          mode: session.mode as IosMode,
        });
      }

      try {
        terminal.registerEvent("outputWritten", null, onOutput);
      } catch {
        // PT API puede fallar en register, ignorar silenciosamente
      }
      try {
        terminal.registerEvent("commandEnded", null, onEnded);
      } catch {
        // PT API puede fallar en register, ignorar silenciosamente
      }

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
