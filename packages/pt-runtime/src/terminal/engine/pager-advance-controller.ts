// ============================================================================
// PagerAdvanceController - Controla el avance del pager (--More--)
// ============================================================================
// Extraído de command-state-machine.ts para separar la lógica de pager.

import type { TerminalEventRecord } from "../../pt/terminal/terminal-events";
import type { PTCommandLine } from "../command-executor";
import { createPagerHandler } from "../pager-handler";
import { detectPager, readTerminalSnapshot } from "../prompt-detector";
import { pushEvent } from "./index.js";

export interface PagerAdvanceControllerConfig {
  maxPagerAdvances?: number;
  autoAdvancePager?: boolean;
}

export interface PagerAdvanceController {
  advance: () => void;
  shouldAutoAdvance: () => boolean;
  getPagerLines: () => number;
  handlePagerOutput: (chunk: string) => boolean;
  handleMoreDisplayed: () => boolean;
  isLoop: () => boolean;
  canContinue: () => boolean;
  reset: () => void;
  canAdvanceNow: () => boolean;
}

export function createPagerAdvanceController(
  config: PagerAdvanceControllerConfig,
): PagerAdvanceController {
  const pagerHandler = createPagerHandler({
    maxAdvances: config.maxPagerAdvances ?? 50,
    enabled: config.autoAdvancePager !== false,
  });

  let lastPagerAdvanceAt = 0;

  return {
    advance(): void {
      pagerHandler.advance();
    },

    shouldAutoAdvance(): boolean {
      return config.autoAdvancePager !== false && pagerHandler.canContinue();
    },

    getPagerLines(): number {
      return pagerHandler.state.advances;
    },

    handlePagerOutput(chunk: string): boolean {
      if (!detectPager(chunk)) {
        return false;
      }
      pagerHandler.handleOutput(chunk);
      return true;
    },

    handleMoreDisplayed(): boolean {
      pagerHandler.handleOutput("--More--");
      return true;
    },

    isLoop(): boolean {
      return pagerHandler.isLoop();
    },

    canContinue(): boolean {
      return pagerHandler.canContinue();
    },

    reset(): void {
      pagerHandler.reset();
    },

    canAdvanceNow(): boolean {
      const now = Date.now();
      if (now - lastPagerAdvanceAt < 120) {
        return false;
      }
      lastPagerAdvanceAt = now;
      return true;
    },
  };
}

export function defaultSendPagerAdvance(
  terminal: PTCommandLine,
  events: TerminalEventRecord[],
  sessionId: string,
  deviceName: string,
  source: string,
): boolean {
  let sent = false;

  try {
    terminal.enterChar?.(32, 0);
    sent = true;
  } catch {}

  pushEvent(
    events,
    sessionId,
    deviceName,
    sent ? "pagerAdvance" : "pagerAdvanceFailed",
    "SPACE",
    sent ? `SPACE sent to pager from ${source}` : `Failed to send SPACE to pager from ${source}`,
  );

  return sent;
}

export function sendPagerAdvanceWithFallback(
  terminal: PTCommandLine,
  events: TerminalEventRecord[],
  sessionId: string,
  deviceName: string,
  source: string,
  setTimeoutFn: (fn: () => void, ms: number) => number,
): boolean {
  const sent = defaultSendPagerAdvance(terminal, events, sessionId, deviceName, source);

  setTimeoutFn(() => {
    try {
      if (!terminalSnapshotTailHasActivePager(terminal)) return;

      terminal.enterChar?.(32, 0);

      pushEvent(
        events,
        sessionId,
        deviceName,
        "pagerAdvanceFallback",
        "SPACE",
        `Fallback SPACE char sent to active pager from ${source}`,
      );
    } catch {
      pushEvent(
        events,
        sessionId,
        deviceName,
        "pagerAdvanceFallbackFailed",
        "SPACE",
        `Fallback SPACE char failed from ${source}`,
      );
    }
  }, 150);

  return sent;
}

export function terminalSnapshotTailHasActivePager(terminal: PTCommandLine): boolean {
  try {
    const snapshot = readTerminalSnapshot(terminal);
    const tail = String(snapshot.raw || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .slice(-800);

    if (!tail.trim()) {
      return false;
    }

    return (
      /--More--\s*$/i.test(tail) ||
      /\s--More--\s*$/i.test(tail) ||
      /More:\s*$/i.test(tail) ||
      /Press any key to continue\s*$/i.test(tail)
    );
  } catch {
    return false;
  }
}
