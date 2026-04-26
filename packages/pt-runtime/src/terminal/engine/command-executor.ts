// ============================================================================
// Terminal Executor - Orquestación de executeTerminalCommand
// ============================================================================
// Este archivo orquesta la ejecución de comandos usando los componentes modulares:
// - CommandStateMachine: el state machine principal
// - PagerHandler: manejo de paginación
// - ConfirmHandler: manejo de confirmaciones
//
// Este archivo NO contiene lógica de estado - solo coordina.

import type { TerminalMode, TerminalSessionKind } from "../session-state";
import {
  detectConfirmPrompt,
  detectPager,
  detectHostBusy,
  detectDnsLookup,
  detectAuthPrompt,
  detectModeFromPrompt,
  isHostMode,
  normalizePrompt,
  readTerminalSnapshot,
  diffSnapshotStrict,
} from "../prompt-detector";
import { createPagerHandler } from "../pager-handler";
import { createConfirmHandler } from "../confirm-handler";
import { sanitizeCommandOutput } from "../command-sanitizer";
import type { CommandEndedPayload, TerminalEventRecord } from "../../pt/terminal/terminal-events";
import { TerminalErrors, type TerminalErrorCode } from "../terminal-errors";
import { ensureSession } from "../session-registry";
import { checkCommandCompletion } from "../stability-heuristic";
import { verifyIosOutput, verifyHostOutput } from "../terminal-semantic-verifier";
import { recoverTerminalSync } from "../terminal-recovery";
import {
  getPromptSafe,
  getModeSafe,
  isTerminalReadyForCommand,
  wakeTerminal,
  ensureTerminalReadySync,
} from "../terminal-ready";
import { extractCommandOutput, type CommandSessionKind } from "../command-output-extractor";
import {
  pushEvent,
  compactTerminalEvents,
  shouldFinalizeCommand,
  buildFinalOutput,
  resolveTerminalError,
  guessFailureStatus,
  isOnlyPrompt,
  detectDnsHangup,
  computeConfidenceString,
} from "./index.js";
import { detectWizardFromOutput, sleep, terminalOutputHasPager } from "../terminal-utils";
import { CommandStateMachine } from "./command-state-machine";

export interface PTCommandLine {
  getPrompt(): string;
  getOutput?(): string;
  getAllOutput?(): string;
  getBuffer?(): string;
  getCommandInput(): string;
  enterCommand(cmd: string): unknown;
  registerEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  unregisterEvent(eventName: string, context: null, handler: (src: unknown, args: unknown) => void): void;
  enterChar(charCode: number, modifiers: number): void;
  println?(text: string): void;
  flush?(): void;
  getConsole?(): any;
}

export interface ExecutionOptions {
  commandTimeoutMs?: number;
  stallTimeoutMs?: number;
  readyTimeoutMs?: number;
  expectedMode?: TerminalMode;
  expectedPromptPattern?: string;
  autoAdvancePager?: boolean;
  autoDismissWizard?: boolean;
  autoConfirm?: boolean;
  maxPagerAdvances?: number;
  allowEmptyOutput?: boolean;
  sendEnterFallback?: boolean;
  sessionKind?: TerminalSessionKind;
  ensurePrivileged?: boolean;
  allowPager?: boolean;
}

export interface CommandExecutionResult {
  ok: boolean;
  command: string;
  output: string;
  rawOutput: string;
  status: number | null;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  promptBefore: string;
  promptAfter: string;
  modeBefore: string;
  modeAfter: string;
  startedSeen: boolean;
  endedSeen: boolean;
  outputEvents: number;
  confidence: string;
  warnings: string[];
  events: TerminalEventRecord[];
  error?: string;
  code?: TerminalErrorCode;
}

const DEFAULT_COMMAND_TIMEOUT = 15000;
const DEFAULT_STALL_TIMEOUT = 5000;
const DEFAULT_READY_TIMEOUT = 3000;
const COMMAND_END_GRACE_MS = 250;
const COMMAND_END_MAX_WAIT_MS = 1000;
const HOST_COMMAND_END_GRACE_MS = 1500;

/**
 * Wrapper that delegates to CommandStateMachine while preserving
 * the same signature as the original executeTerminalCommand.
 */
export async function executeTerminalCommand(
  deviceName: string,
  command: string,
  terminal: PTCommandLine,
  options: ExecutionOptions = {},
): Promise<CommandExecutionResult> {
  const startedAt = Date.now();
  const commandTimeoutMs = options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT;
  const stallTimeoutMs = options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;
  const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT;

  const session = ensureSession(deviceName);
  const events: TerminalEventRecord[] = [];
  const warnings: string[] = [...(session.warnings || [])];
  const sessionKind = options.sessionKind ?? session.sessionKind ?? "ios";

  const promptBefore = getPromptSafe(terminal);
  const modeBefore = getModeSafe(terminal);

  try {
    // @ts-ignore ipc es global inyectado por PT kernel
    const net = (typeof ipc !== "undefined") ? (ipc as any).network?.() : null;
    if (net) {
      const dev = net.getDevice?.(deviceName);
      if (dev && typeof dev.getPower === "function" && !dev.getPower()) {
        return {
          ok: false, command, output: "", rawOutput: "", status: 1,
          startedAt, endedAt: Date.now(), durationMs: 0,
          promptBefore, promptAfter: promptBefore,
          modeBefore, modeAfter: modeBefore,
          startedSeen: false, endedSeen: false, outputEvents: 0,
          confidence: "failure", warnings: ["Device is powered off"],
          events,
          error: "Device is powered off", code: TerminalErrors.SESSION_BROKEN,
        };
      }
    }
  } catch (e) {}

  if (session.health === "broken") {
    return {
      ok: false, command, output: "", rawOutput: "", status: 1,
      startedAt, endedAt: Date.now(), durationMs: 0,
      promptBefore, promptAfter: promptBefore,
      modeBefore, modeAfter: modeBefore,
      startedSeen: false, endedSeen: false, outputEvents: 0,
      confidence: "failure", warnings: [...session.warnings],
      events,
      error: "Session is broken", code: TerminalErrors.SESSION_BROKEN,
    };
  }

  const readyResult = ensureTerminalReadySync(terminal, sessionKind, {
    maxRetries: 3,
    wakeUpOnFail: options.sendEnterFallback ?? true,
    ensurePrivileged: options.ensurePrivileged ?? false,
  });

  if (!readyResult.ready) {
    warnings.push("Terminal not ready after retries: " + readyResult.prompt);
  }

  const baselineSnapshot = readTerminalSnapshot(terminal);
  const baselineOutput = baselineSnapshot.raw;

  const pagerHandler = createPagerHandler({
    maxAdvances: options.maxPagerAdvances ?? 50,
  });

  const confirmHandler = createConfirmHandler({
    autoConfirm: options.autoConfirm ?? true,
  });

  // Run the state machine
  const stateMachine = new CommandStateMachine({
    deviceName,
    command,
    terminal,
    options,
    session,
    events,
    warnings,
    sessionKind,
    promptBefore,
    modeBefore,
    baselineSnapshot,
    baselineOutput,
  });

  return stateMachine.run();
}
