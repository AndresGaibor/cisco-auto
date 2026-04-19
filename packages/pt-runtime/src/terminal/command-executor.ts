// ============================================================================
// Command Executor - Corazón de la ejecución IOS basada en eventos
// ============================================================================

import type { TerminalSessionState, TerminalMode } from "./session-state";
import { getSession, ensureSession, setCommandStarted, setCommandEnded, appendOutput, updateMode, updatePrompt, markWizardDetected, markConfirmPrompt, setPaging, markBrokenSession } from "./session-registry";
import { detectModeFromPrompt, detectWizardFromOutput, detectConfirmPrompt, detectPager } from "./prompt-detector";
import { createPagerHandler } from "./pager-handler";
import { isStatusOk, CommandEndedPayload, type TerminalEventRecord } from "../pt/terminal/terminal-events";
import { TerminalErrors, type TerminalErrorCode } from "./terminal-errors";

export interface PTCommandLine {
  getPrompt(): string;
  enterCommand(cmd: string): void;
  registerEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  unregisterEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  enterChar(charCode: number, modifiers: number): void;
}

export interface ExecutionOptions {
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
  expectedMode?: TerminalMode;
  autoAdvancePager?: boolean;
  autoDismissWizard?: boolean;
  maxPagerAdvances?: number;
}

export interface CommandExecutionResult {
  ok: boolean;
  command: string;
  status: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  promptBefore: string;
  promptAfter: string;
  modeBefore: TerminalMode;
  modeAfter: TerminalMode;
  output: string;
  events: TerminalEventRecord[];
  warnings: string[];
  error?: string;
  code?: TerminalErrorCode;
  confidence: number;
}

const DEFAULT_COMMAND_TIMEOUT = 8000;
const DEFAULT_STALL_TIMEOUT = 15000;

export function createCommandExecutor(config?: { commandTimeoutMs?: number; stallTimeoutMs?: number }) {
  const cmdTimeout = config?.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT;
  const stallTimeout = config?.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;

  function executeCommand(
    deviceName: string,
    command: string,
    terminal: PTCommandLine,
    options: ExecutionOptions = {}
  ): Promise<CommandExecutionResult> {
    const timeout = options.commandTimeoutMs ?? cmdTimeout;
    const startedAt = Date.now();

    const session = ensureSession(deviceName);
    const promptBefore = terminal.getPrompt();
    const modeBefore = detectModeFromPrompt(promptBefore);

    if (session.health === "broken") {
      return Promise.resolve({
        ok: false,
        command,
        status: 1,
        startedAt,
        endedAt: Date.now(),
        durationMs: 0,
        promptBefore,
        promptAfter: promptBefore,
        modeBefore,
        modeAfter: modeBefore,
        output: "",
        events: [],
        warnings: [],
        error: "Session is broken",
        code: "TERMINAL_SESSION_BROKEN",
        confidence: 0,
      });
    }

    return new Promise((resolve) => {
      const outputBuffer: string[] = [];
      const events: TerminalEventRecord[] = [];
      let settled = false;
      const pagerHandler = createPagerHandler({
        maxAdvances: options.maxPagerAdvances ?? 50,
        enabled: options.autoAdvancePager ?? true,
      });

      const cleanup = () => {
        const handlers = [
          ["outputWritten", null, onOutput],
          ["commandEnded", null, onEnded],
          ["modeChanged", null, onModeChanged],
          ["promptChanged", null, onPromptChanged],
          ["moreDisplayed", null, onMoreDisplayed],
        ] as const;
        for (const [eventName, _ctx, handler] of handlers) {
          try {
            terminal.unregisterEvent(eventName, null, handler);
          } catch {}
        }
      };

      function onOutput(_src: unknown, args: unknown) {
        const a = args as { newOutput?: string; data?: string; output?: string };
        const data = a?.newOutput ?? a?.data ?? a?.output ?? "";
        if (data) {
          outputBuffer.push(String(data));
          events.push({
            sessionId: session.sessionId,
            deviceName,
            eventType: "outputWritten",
            timestamp: Date.now(),
            raw: data,
            normalized: data.trim(),
          });
          if (detectPager(data)) {
            pagerHandler.advance();
            if (options.autoAdvancePager && pagerHandler.canContinue()) {
              terminal.enterChar(32, 0);
            }
          }
        }
      }

      function onEnded(_src: unknown, args: unknown) {
        if (settled) return;
        const payload = args as CommandEndedPayload;
        settled = true;

        clearTimeout(startTimeoutHandle);
        cleanup();

        const endedAt = Date.now();
        const finalPrompt = terminal.getPrompt();
        const finalMode = detectModeFromPrompt(finalPrompt);
        const output = outputBuffer.join("");

        const result: CommandExecutionResult = {
          ok: isStatusOk(payload.status ?? 1),
          command,
          status: payload.status ?? 1,
          startedAt,
          endedAt,
          durationMs: endedAt - startedAt,
          promptBefore,
          promptAfter: finalPrompt,
          modeBefore,
          modeAfter: finalMode,
          output,
          events,
          warnings: session.warnings,
          confidence: payload.status === 0 ? 1 : 0,
        };

        if (!result.ok) {
          result.error = `Command failed with status ${payload.status}`;
          result.code = TerminalErrors.COMMAND_END_TIMEOUT;
        }

        resolve(result);
      }

      function onModeChanged(_src: unknown, args: unknown) {
        const a = args as { from?: string; to?: string };
        events.push({
          sessionId: session.sessionId,
          deviceName,
          eventType: "modeChanged",
          timestamp: Date.now(),
          raw: `${a?.from} -> ${a?.to}`,
          normalized: a?.to ?? "",
        });
      }

      function onPromptChanged(_src: unknown, args: unknown) {
        const a = args as { prompt?: string };
        events.push({
          sessionId: session.sessionId,
          deviceName,
          eventType: "promptChanged",
          timestamp: Date.now(),
          raw: a?.prompt ?? "",
          normalized: a?.prompt?.trim() ?? "",
        });
      }

      function onMoreDisplayed(_src: unknown, _args: unknown) {
        events.push({
          sessionId: session.sessionId,
          deviceName,
          eventType: "moreDisplayed",
          timestamp: Date.now(),
          raw: "--More--",
          normalized: "--More--",
        });
      }

      const startTimeoutHandle = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          const endedAt = Date.now();

          resolve({
            ok: false,
            command,
            status: 1,
            startedAt,
            endedAt,
            durationMs: endedAt - startedAt,
            promptBefore,
            promptAfter: terminal.getPrompt(),
            modeBefore,
            modeAfter: detectModeFromPrompt(terminal.getPrompt()),
            output: outputBuffer.join(""),
            events,
            warnings: [...session.warnings, "Command start timeout"],
            error: "Command did not start within timeout",
            code: TerminalErrors.COMMAND_START_TIMEOUT,
            confidence: 0,
          });
        }
      }, timeout);

      const handlers = [
        ["outputWritten", null, onOutput],
        ["commandEnded", null, onEnded],
        ["modeChanged", null, onModeChanged],
        ["promptChanged", null, onPromptChanged],
        ["moreDisplayed", null, onMoreDisplayed],
      ] as const;

      for (const [eventName, _ctx, handler] of handlers) {
        try {
          terminal.registerEvent(eventName, null, handler);
} catch (e) {
            // Silently ignore registration errors - the event handler is optional
          }
      }

      session.lastCommand = command;
      session.lastCommandStartedAt = startedAt;
      session.outputBuffer = "";

      terminal.enterCommand(command);
    });
  }

  return { executeCommand };
}