// CommandExecutor - Ejecuta comandos IOS con timeout y manejo de eventos

import type { TerminalSessionState } from "./terminal-session";
import { toSnapshot, setBusy } from "./terminal-session";
import { isStatusOk } from "./terminal-events";
import type { IosMode } from "./prompt-parser";
import type { SessionStateSnapshot } from "../../domain";

export interface CommandExecutorConfig {
  commandTimeoutMs: number;
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

export function createCommandExecutor(config: CommandExecutorConfig) {
  function executeCommand(
    device: string,
    command: string,
    term: PTCommandLine,
    sessions: Record<string, TerminalSessionState>,
    options?: ExecuteOptions,
  ): Promise<TerminalResult> {
    const timeout = options?.timeout ?? config.commandTimeoutMs;

    try {
      dprint(
        "[term] EXEC START device=" +
          device +
          " cmd='" +
          command.substring(0, 50) +
          "' timeout=" +
          timeout,
      );
    } catch {}

    function currentSession(): TerminalSessionState {
      const s = sessions[device];
      if (!s) throw new Error(`Session lost for ${device} during executeCommand`);
      return s;
    }

    return new Promise((resolve, reject) => {
      const buffer: string[] = [];
      let settled = false;
      let moreListener: ((src: unknown, args: unknown) => void) | null = null;

      sessions[device] = setBusy(currentSession(), `cmd-${Date.now()}`);

      const timeoutHandle = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanupListeners();
          sessions[device] = setBusy(currentSession(), null);
          try {
            dprint(
              "[term] EXEC TIMEOUT device=" + device + " cmd='" + command.substring(0, 50) + "'",
            );
          } catch {}
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
        sessions[device] = { ...cs, paging: true };
        try {
          dprint("[term] PAGER detected device=" + device);
        } catch {}
      }
      moreListener = onMore;

      function cleanupListeners() {
        const cleanupOps = [
          ["outputWritten", null, onOutput],
          ["commandEnded", null, onEnded],
          ["moreDisplayed", null, moreListener] as [
            string,
            null,
            (src: unknown, args: unknown) => void,
          ],
        ] as const;

        for (const [eventName, filter, handler] of cleanupOps) {
          try {
            term.unregisterEvent(eventName, filter, handler as any);
          } catch (e) {
            try {
              dprint(`[term] cleanup unregister ${eventName}: ` + String(e));
            } catch {}
          }
        }
      }

      function onEnded(_src: unknown, args: unknown) {
        if (settled) return;

        const a = args as { status?: number };
        const status = a?.status ?? 1;

        settled = true;
        clearTimeout(timeoutHandle);
        cleanupListeners();

        const finalSession = currentSession();
        sessions[device] = setBusy(finalSession, null);

        const output = buffer.join("");
        try {
          dprint(
            "[term] EXEC END device=" +
              device +
              " status=" +
              status +
              " outputLen=" +
              output.length,
          );
        } catch {}
        resolve({
          ok: isStatusOk(status),
          output,
          status,
          session: toSnapshot(finalSession),
          mode: finalSession.mode as IosMode,
        });
      }

      const registerOps = [
        ["outputWritten", null, onOutput],
        ["commandEnded", null, onEnded],
        ["moreDisplayed", null, moreListener as any],
      ] as const;

      for (const [eventName, filter, handler] of registerOps) {
        try {
          term.registerEvent(eventName, filter, handler);
        } catch (e) {
          try {
            dprint(`[term] register ${eventName} error: ` + String(e));
          } catch {}
        }
      }

      term.enterCommand(command);
    });
  }

  return { executeCommand };
}
