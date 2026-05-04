// Plan run transport — ejecuta terminal.plan.run y maneja polling diferido

import type { AdapterTimingMap, TerminalPlan, TerminalPortResult, FileBridgePort } from "./types.js";
import { isDeferredValue, isStillPending, normalizeBridgeValue, buildTimingsEvidence, isUnsupportedTerminalPlanRun } from "./types.js";
import {
  nowMs,
  addTiming,
  measureAdapterAsync,
  measureAdapterSync,
  recordBridgeResultTimings,
} from "./terminal-timings.js";
import { buildTerminalDeferredFailure } from "./terminal-errors.js";
import type { ResponseParser } from "./response-parser.js";

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

export function computeTerminalPlanSubmitTimeoutMs(
  plan: TerminalPlan,
  requestedTimeoutMs: number,
): number {
  const firstStepTimeoutMs = Number(plan.steps[0]?.timeout ?? requestedTimeoutMs ?? 30000);

  return Math.max(
    15000,
    Math.min(firstStepTimeoutMs, 30000),
  );
}

export function getTerminalPlanParseCommand(plan: TerminalPlan): string {
  const visibleSteps = plan.steps.filter((step: { metadata?: { internal?: boolean }; command?: string }) => {
    const metadata = step.metadata as { internal?: boolean } | undefined;
    return metadata?.internal !== true && String(step.command ?? "").trim().length > 0;
  }) as Array<{ command: string }>;

  if (visibleSteps.length === 1) {
    return String(visibleSteps[0]?.command ?? "").trim();
  }

  for (let index = visibleSteps.length - 1; index >= 0; index -= 1) {
    const command = String(visibleSteps[index]?.command ?? "").trim();
    if (command) return command;
  }

  return "terminal.plan.run";
}

export function getTerminalPlanEventStep(plan: TerminalPlan): { kind: "command"; command: string } {
  return {
    kind: "command",
    command: getTerminalPlanParseCommand(plan),
  };
}

export async function executeTerminalPlanRun(
  bridge: FileBridgePort,
  plan: TerminalPlan,
  timeoutMs: number,
  timings: AdapterTimingMap,
  responseParser: ResponseParser,
): Promise<TerminalPortResult | null> {
  const parseCommand = getTerminalPlanParseCommand(plan);
  const parseEventStep = getTerminalPlanEventStep(plan);
  const submitTimeoutMs = computeTerminalPlanSubmitTimeoutMs(plan, timeoutMs);

  const submitResult = await measureAdapterAsync(timings, "terminalPlanSubmitMs", () =>
    bridge.sendCommandAndWait(
      "terminal.plan.run",
      { plan, options: { timeoutMs } },
      submitTimeoutMs,
      { resolveDeferred: false },
    ),
  );

  let finalTimings: unknown = submitResult.timings;
  recordBridgeResultTimings(timings, "terminalPlanSubmit", submitResult);

  if (isUnsupportedTerminalPlanRun(submitResult)) {
    return null;
  }

  const submitValue = normalizeBridgeValue(submitResult);

  if (
    submitValue &&
    typeof submitValue === "object" &&
    (submitValue as { ok?: unknown }).ok === false
  ) {
    const parsed = measureAdapterSync(timings, "terminalPlanParseResponseMs", () =>
      responseParser.parseCommandResponse(submitValue, {
        stepIndex: 0,
        isHost: false,
        command: parseCommand,
      }),
    );

    return {
      ok: false,
      output: parsed.raw.trim(),
      status: parsed.status || 1,
      promptBefore: parsed.promptBefore,
      promptAfter: parsed.promptAfter,
      modeBefore: parsed.modeBefore,
      modeAfter: parsed.modeAfter,
      events: [responseParser.buildEventFromResponse(parsed, parseEventStep, 0)],
      warnings: parsed.warnings,
      parsed: parsed.parsed,
      evidence: buildTimingsEvidence(submitResult.timings),
      confidence: 0,
    };
  }

  if (isDeferredValue(submitValue)) {
    return handleDeferredPoll(
      bridge,
      plan,
      submitValue.ticket,
      timeoutMs,
      timings,
      responseParser,
      parseCommand,
      parseEventStep,
    );
  }

  const parsed = measureAdapterSync(timings, "terminalPlanParseResponseMs", () =>
    responseParser.parseCommandResponse(submitValue, {
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
    evidence: buildTimingsEvidence(submitResult.timings),
    confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
  };
}

async function handleDeferredPoll(
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