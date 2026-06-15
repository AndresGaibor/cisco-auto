// ============================================================================
// OutputPoller - Loop de polling de output del terminal
// ============================================================================
// Extraído de command-state-machine.ts para separar la lógica de polling.
// Verifica periódicamente el estado del terminal para detectar output nuevo
// y cambios de prompt cuando los eventos no son suficientes.

import type { TerminalMode, TerminalSessionKind } from "../session-state";
import { detectModeFromPrompt, normalizePrompt } from "../prompt-detector";

export interface OutputPollerConfig {
  deviceName: string;
  sessionKind: TerminalSessionKind;
  options: {
    autoAdvancePager?: boolean;
    expectedMode?: TerminalMode;
  };
  baselineSnapshot?: { raw: string; source: string };
  initialPrompt?: string;
  session: {
    pagerActive: boolean;
    confirmPromptActive: boolean;
    lastPrompt?: string;
    lastMode?: string;
    lastActivityAt: number;
  };
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
  readTerminalSnapshotFn: (terminal: any) => { raw: string; source: string };
  getPromptSafeFn: (terminal: any) => string;
  getModeSafeFn: (terminal: any) => string;
  now: () => number;
}

export interface OutputPollerCallbacks {
  onOutput: (chunk: string) => void;
  onPromptChanged: (prompt: string, mode: TerminalMode) => void;
  scheduleFinalizeAfterCommandEnd: () => void;
  debug: (message: string) => void;
}

export interface OutputPoller {
  start: () => void;
  stop: () => void;
  getTimer: () => ReturnType<typeof setInterval> | null;
}

export function createOutputPoller(
  config: OutputPollerConfig,
  callbacks: OutputPollerCallbacks,
  terminal: any,
): OutputPoller {
  let outputPollTimer: ReturnType<typeof setInterval> | null = null;
  let lastTerminalSnapshot = config.baselineSnapshot ?? { raw: "", source: "init" };
  let previousPrompt = config.initialPrompt ?? "";
  let lastOutputAt = config.now();

  function poll(): void {
    const currentRaw = config.readTerminalSnapshotFn(terminal);
    const rawTail = String(currentRaw.raw || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .slice(-800);
    const pagerVisible =
      /--More--\s*$/i.test(rawTail) ||
      /\s--More--\s*$/i.test(rawTail) ||
      /More:\s*$/i.test(rawTail) ||
      /Press RETURN to get started\s*$/i.test(rawTail) ||
      /Press any key to continue\s*$/i.test(rawTail);

    if (pagerVisible) {
      config.session.pagerActive = true;
      callbacks.debug("poll pager visible tail=" + JSON.stringify(rawTail.slice(-120)));

      if (config.options.autoAdvancePager !== false) {
        try {
          terminal.enterChar(32, 0);
          callbacks.debug("poll pager advanced with space");
          config.session.pagerActive = true;
          lastOutputAt = config.now();
          config.session.lastActivityAt = config.now();
        } catch (error) {
          callbacks.debug("poll pager advance failed error=" + String(error));
        }
      }
    }

    if (currentRaw.raw.length < lastTerminalSnapshot.raw.length) {
      lastTerminalSnapshot = { raw: "", source: "reset" };
    }

    try {
      const prompt = config.getPromptSafeFn(terminal);
      if (prompt && prompt !== previousPrompt) {
        previousPrompt = prompt;
        const mode = detectModeFromPrompt(normalizePrompt(prompt));
        config.session.lastPrompt = normalizePrompt(prompt);
        config.session.lastMode = mode;

        callbacks.debug("poll prompt=" + JSON.stringify(prompt) + " mode=" + mode);
        callbacks.onPromptChanged(prompt, mode);
        callbacks.scheduleFinalizeAfterCommandEnd();
      }
    } catch {}

    if (currentRaw.raw.length > lastTerminalSnapshot.raw.length) {
      const delta = currentRaw.raw.substring(lastTerminalSnapshot.raw.length);
      lastTerminalSnapshot = currentRaw;
      callbacks.debug("poll output deltaLen=" + delta.length);
      callbacks.onOutput(delta);
    }
  }

  function start(): void {
    poll();
    outputPollTimer = config.setInterval(poll, 250) as unknown as ReturnType<typeof setInterval>;
  }

  function stop(): void {
    if (outputPollTimer) {
      config.clearInterval(outputPollTimer);
      outputPollTimer = null;
    }
  }

  return {
    start,
    stop,
    getTimer: () => outputPollTimer,
  };
}
