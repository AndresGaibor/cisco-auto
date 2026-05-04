// Deferred poller — maneja el loop de __pollDeferred

import type { AdapterTimingMap, FileBridgePort, TerminalPortResult } from "./types.js";
import { isDeferredValue, isStillPending, normalizeBridgeValue, buildTimingsEvidence } from "./types.js";
import {
  nowMs,
  addTiming,
  measureAdapterAsync,
  measureAdapterSync,
  recordBridgeResultTimings,
} from "./terminal-timings.js";
import { buildTerminalDeferredFailure } from "./terminal-errors.js";
import type { ResponseParser } from "./response-parser.js";
import type { TerminalPlan } from "./types.js";

export function computeDeferredPollTimeoutMs(
  plan: TerminalPlan,
  requestedTimeoutMs: number,
): number {
  const planTimeouts = plan.timeouts as { commandTimeoutMs?: number; stallTimeoutMs?: number } | undefined;
  const commandTimeoutMs = Number(planTimeouts?.commandTimeoutMs ?? requestedTimeoutMs ?? 30000);
  const stallTimeoutMs = Number(planTimeouts?.stallTimeoutMs ?? 15000);
  const stepCount = Math.max(plan.steps.length, 1);

  const perStepBudgetMs = commandTimeoutMs + stallTimeoutMs + 3000;
  const totalBudgetMs = perStepBudgetMs * stepCount;

  return Math.max(requestedTimeoutMs, totalBudgetMs, 25000);
}

export function computeDeferredPollIntervalMs(plan: TerminalPlan): number {
  const metadata = plan.metadata as {
    deferredPollIntervalMs?: unknown;
    terminalPlanPollIntervalMs?: unknown;
    pollIntervalMs?: unknown;
  } | undefined;

  const parsed = Number(
    metadata?.deferredPollIntervalMs ??
      metadata?.terminalPlanPollIntervalMs ??
      metadata?.pollIntervalMs,
  );

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }

  return Math.max(75, Math.min(Math.trunc(parsed), 500));
}

export async function pollDeferredUntilDone(
  bridge: FileBridgePort,
  plan: TerminalPlan,
  ticket: string,
  timeoutMs: number,
  timings: AdapterTimingMap,
  responseParser: ResponseParser,
  parseCommand: string,
  parseEventStep: { kind: "command"; command: string },
): Promise<TerminalPortResult> {
  const startedAt = nowMs();
  const pollTimeoutMs = computeDeferredPollTimeoutMs(plan, timeoutMs);
  const pollIntervalMs = computeDeferredPollIntervalMs(plan);

  timings.terminalPlanPollTimeoutMs = pollTimeoutMs;
  timings.terminalPlanPollIntervalMs = pollIntervalMs;
  timings.terminalPlanPollCount = 0;
  timings.terminalPlanPollPendingCount = 0;
  timings.terminalPlanPollCompletedCount = 0;

  let pollValue: unknown = null;

  while (nowMs() - startedAt < pollTimeoutMs) {
    try {
      timings.terminalPlanPollCount += 1;
      const pollResult = await measureAdapterAsync(timings, "terminalPlanPollBridgeMs", () =>
        bridge.sendCommandAndWait(
          "__pollDeferred",
          { ticket },
          Math.max(pollTimeoutMs - (nowMs() - startedAt), 1000),
          { resolveDeferred: false },
        ),
      );

      recordBridgeResultTimings(timings, "terminalPlanPoll", pollResult);
      pollValue = normalizeBridgeValue(pollResult);

      if (isStillPending(pollValue)) {
        addTiming(timings, "terminalPlanPollPendingCount", 1);
      } else {
        addTiming(timings, "terminalPlanPollCompletedCount", 1);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "Unknown poll error");
      const elapsedMs = nowMs() - startedAt;

      return buildTerminalDeferredFailure(
        "TERMINAL_DEFERRED_POLL_TIMEOUT",
        `__pollDeferred no respondió en ${pollTimeoutMs}ms para ticket ${ticket}: ${message}`,
        {
          phase: "terminal-plan-poll",
          ticket,
          pollTimeoutMs,
          elapsedMs,
          error: message,
        },
      );
    }

    if (!isStillPending(pollValue)) {
      break;
    }

    const remainingMs = pollTimeoutMs - (nowMs() - startedAt);
    if (remainingMs <= 0) {
      break;
    }

    const sleepMs = Math.min(pollIntervalMs, remainingMs);
    await measureAdapterAsync(timings, "terminalPlanPollSleepMs", () =>
      new Promise((resolve) => setTimeout(resolve, sleepMs)),
    );
  }

  if (isStillPending(pollValue)) {
    const elapsedMs = nowMs() - startedAt;
    return buildTerminalDeferredFailure(
      "TERMINAL_DEFERRED_STALLED",
      `terminal.plan.run creó el ticket ${ticket}, pero el job siguió pendiente después de ${pollTimeoutMs}ms.`,
      {
        phase: "terminal-plan-poll",
        ticket,
        pollTimeoutMs,
        elapsedMs,
        pollValue,
      },
    );
  }

  const parsed = measureAdapterSync(timings, "terminalPlanParseResponseMs", () =>
    responseParser.parseCommandResponse(pollValue, {
      stepIndex: 0,
      isHost: false,
      command: parseCommand,
    }),
  );

  const warnings = [...parsed.warnings];
  const mismatchWarning = responseParser.checkPromptMismatch(parsed, plan.steps[0] ?? {});
  if (mismatchWarning) warnings.push(mismatchWarning);

  return {
    ok: parsed.ok,
    output: parsed.raw.trim(),
    status: parsed.status,
    promptBefore: parsed.promptBefore,
    promptAfter: parsed.promptAfter,
    modeBefore: parsed.modeBefore,
    modeAfter: parsed.modeAfter,
    events: [responseParser.buildEventFromResponse(parsed, parseEventStep, 0)],
    warnings,
    parsed: parsed.parsed,
    evidence: buildTimingsEvidence(timings),
    confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
  };
}

export async function pollNativeDeferredUntilDone(
  bridge: FileBridgePort,
  plan: TerminalPlan,
  ticket: string,
  timeoutMs: number,
  responseParser: ResponseParser,
  command: string,
): Promise<{ result: TerminalPortResult; timings: AdapterTimingMap }> {
  const timings: AdapterTimingMap = {};
  const startedAt = nowMs();
  const pollTimeoutMs = computeDeferredPollTimeoutMs(plan, timeoutMs);
  const pollIntervalMs = 300;
  let pollValue: unknown = null;

  while (nowMs() - startedAt < pollTimeoutMs) {
    try {
      const pollResult = await bridge.sendCommandAndWait(
        "__pollDeferred",
        { ticket },
        Math.max(pollTimeoutMs - (nowMs() - startedAt), 1000),
        { resolveDeferred: false },
      );

      recordBridgeResultTimings(timings, "nativePoll", pollResult);
      pollValue = normalizeBridgeValue(pollResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "Unknown poll error");
      const elapsedMs = nowMs() - startedAt;

      return {
        result: buildTerminalDeferredFailure(
          "TERMINAL_NATIVE_DEFERRED_POLL_TIMEOUT",
          `__pollDeferred no respondió en ${pollTimeoutMs}ms para ticket ${ticket}: ${message}`,
          {
            phase: "terminal-native-poll",
            ticket,
            pollTimeoutMs,
            elapsedMs,
            error: message,
          },
        ),
        timings,
      };
    }

    if (!isStillPending(pollValue)) {
      break;
    }

    const remainingMs = pollTimeoutMs - (nowMs() - startedAt);
    if (remainingMs <= 0) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, remainingMs)));
  }

  if (isStillPending(pollValue)) {
    const elapsedMs = nowMs() - startedAt;
    return {
      result: buildTerminalDeferredFailure(
        "TERMINAL_NATIVE_DEFERRED_STALLED",
        `terminal.native.exec creó el ticket ${ticket}, pero el job siguió pendiente después de ${pollTimeoutMs}ms.`,
        {
          phase: "terminal-native-poll",
          ticket,
          pollTimeoutMs,
          elapsedMs,
          pollValue,
        },
      ),
      timings,
    };
  }

  const parsed = responseParser.parseCommandResponse(pollValue, {
    stepIndex: 0,
    isHost: false,
    command,
  });

  const warnings = [...parsed.warnings];
  const mismatchWarning = responseParser.checkPromptMismatch(parsed, plan.steps[0] ?? {});
  if (mismatchWarning) warnings.push(mismatchWarning);

  return {
    result: {
      ok: parsed.ok,
      output: parsed.raw.trim(),
      status: parsed.status,
      promptBefore: parsed.promptBefore,
      promptAfter: parsed.promptAfter,
      modeBefore: parsed.modeBefore,
      modeAfter: parsed.modeAfter,
      events: [responseParser.buildEventFromResponse(parsed, { kind: "command", command }, 0)],
      warnings,
      parsed: parsed.parsed,
      evidence: buildTimingsEvidence(timings),
      confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
    },
    timings,
  };
}