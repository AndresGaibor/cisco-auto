// TerminalEngine - Gestor de sesiones IOS en PT
// Delega ejecución de comandos a CommandExecutor

import type { TerminalSessionState } from "./terminal-session";
import type { SessionStateSnapshot } from "../../domain";
import {
  createTerminalSession,
  ptTerminalToSnapshot as toSnapshot,
  ptTerminalUpdateMode as updateMode,
  ptTerminalUpdatePrompt as updatePrompt,
  ptTerminalSetPaging as setPaging,
  ptTerminalSetBusy as setBusy,
} from "./terminal-session";
import type { IosMode } from "./prompt-parser";
import {
  createCommandExecutor,
  type ExecutionOptions as ExecuteOptions,
  type CommandExecutionResult,
} from "../../terminal/command-executor";
import { getPromptSafe } from "../../terminal/terminal-ready";

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

function inferIosModeFromPrompt(prompt: string): string | null {
  const p = String(prompt ?? "").trim();

  if (/\(config-if-range\)#\s*$/i.test(p)) return "config-if-range";
  if (/\(config-if\)#\s*$/i.test(p)) return "config-if";
  if (/\(config-subif\)#\s*$/i.test(p)) return "config-subif";
  if (/\(config-router\)#\s*$/i.test(p)) return "config-router";
  if (/\(config-line\)#\s*$/i.test(p)) return "config-line";
  if (/\(config-vlan\)#\s*$/i.test(p)) return "config-vlan";
  if (/\(config\)#\s*$/i.test(p)) return "global-config";

  if (/#\s*$/.test(p)) return "privileged-exec";
  if (/>$/.test(p)) return "user-exec";

  return null;
}

function normalizePacketTracerMode(mode: unknown, prompt: string): string {
  const raw = String(mode ?? "").trim().toLowerCase();
  const promptMode = inferIosModeFromPrompt(prompt);

  if (promptMode) return promptMode;

  if (raw === "user") return "user-exec";
  if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
  if (raw === "config" || raw === "global-config") return "global-config";
  if (raw === "config-if") return "config-if";
  if (raw === "config-if-range") return "config-if-range";
  if (raw === "config-subif") return "config-subif";
  if (raw === "config-router") return "config-router";
  if (raw === "config-line") return "config-line";
  if (raw === "config-vlan") return "config-vlan";
  if (raw === "logout") return "logout";

  return raw || "unknown";
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

    try {
      const prompt = getPromptSafe(term);
      const rawMode = typeof (term as any).getMode === "function" ? (term as any).getMode() : "";
      let updated = updatePrompt(sessions[device], prompt);
      updated = updateMode(updated, normalizePacketTracerMode(rawMode, prompt));
      sessions[device] = updated;
    } catch {}

    term.registerEvent("promptChanged", null, (_src, args) => {
      const current = sessions[device];
      if (!current) return;
      const prompt = (args as { prompt?: string })?.prompt || "";
      const rawMode = typeof (term as any).getMode === "function" ? (term as any).getMode() : "";
      let updated = updatePrompt(current, prompt);
      updated = updateMode(updated, normalizePacketTracerMode(rawMode, prompt));
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
        sessions[device] = updateMode(current, normalizePacketTracerMode(newMode, current.prompt));
      }
    });

    term.registerEvent("commandStarted", null, (_src, args) => {
      const current = sessions[device];
      if (!current) return;
      const inputMode = (args as { inputMode?: string })?.inputMode || "";
      if (inputMode && typeof inputMode === "string") {
        sessions[device] = updateMode(current, normalizePacketTracerMode(inputMode, current.prompt));
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

    const busyToken =
      "cmd:" +
      String(Date.now()) +
      ":" +
      String(Math.floor(Math.random() * 100000));

    try {
      const current = sessions[device];

      if (current) {
        sessions[device] = setBusy(current, busyToken);
      }
    } catch {}

    try {
      const execResult = await executeCommand(device, command, term as any, options);

      try {
        const current = sessions[device];

        if (current) {
          let updated = setBusy(current, null);
          updated = updatePrompt(updated, execResult.promptAfter);
          updated = updateMode(updated, normalizePacketTracerMode(execResult.modeAfter, execResult.promptAfter));
          sessions[device] = updated;
        }
      } catch {}

      return {
        ok: execResult.ok,
        output: execResult.output,
        status: execResult.status ?? 0,
        session: {
          mode: execResult.modeAfter as any,
          prompt: execResult.promptAfter,
          paging: execResult.warnings.some((w) => w.toLowerCase().includes("paginación")),
          awaitingConfirm: execResult.warnings.some((w) => w.toLowerCase().includes("confirmación")),
        },
        mode: execResult.modeAfter as IosMode,
      };
    } catch (error) {
      try {
        const current = sessions[device];

        if (current) {
          sessions[device] = setBusy(current, null);
        }
      } catch {}

      throw error;
    }
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
