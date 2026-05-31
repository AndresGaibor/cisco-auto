// Plan run transport — ejecuta terminal.plan.run y maneja polling diferido

import type { AdapterTimingMap, TerminalPlan, TerminalPortResult, FileBridgePort, TerminalPortOptions } from "./types.js";
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

export function computeRecommendedDeferredPollSleepMs(
  pollValue: unknown,
  fallbackMs: number,
): number {
  if (!pollValue || typeof pollValue !== "object") {
    return fallbackMs;
  }

  const raw = (pollValue as { recommendedPollAfterMs?: unknown }).recommendedPollAfterMs;
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackMs;
  }

  return Math.max(75, Math.min(Math.trunc(parsed), 1000));
}

export function computeInitialDeferredPollDelayMs(
  plan: TerminalPlan,
  command: string,
): number {
  const metadata = plan.metadata as {
    deferredInitialPollDelayMs?: unknown;
    terminalPlanInitialPollDelayMs?: unknown;
    initialPollDelayMs?: unknown;
  } | undefined;

  const configured = Number(
    metadata?.deferredInitialPollDelayMs ??
      metadata?.terminalPlanInitialPollDelayMs ??
      metadata?.initialPollDelayMs,
  );

  if (Number.isFinite(configured) && configured >= 0) {
    return Math.max(0, Math.min(Math.trunc(configured), 1000));
  }

  const normalized = String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();

  if (/^show\s+(running-config|startup-config|run|start)\b/.test(normalized)) {
    return 250;
  }

  if (/^show\s+interfaces?\b/.test(normalized)) {
    return 250;
  }

  if (/^show\s+version\b/.test(normalized)) {
    return 0;
  }

  if (
    /^show\s+ip\s+interface\s+brief\b/.test(normalized) ||
    /^show\s+vlan(?:\s+brief)?\b/.test(normalized) ||
    /^show\s+cdp\s+neighbors\b/.test(normalized)
  ) {
    return 150;
  }

  return 0;
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

function buildDeferredFailureEvidence(
  timings: AdapterTimingMap,
  details: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...details,
    ...buildTimingsEvidence(timings),
  };
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

function isInlineCompletedTerminalPlan(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;

  return (
    record.inlineCompleted === true ||
    record.status === "completed" ||
    record.state === "completed" ||
    record.completed === true ||
    (record.ok === true &&
      typeof record.output === "string" &&
      !("ticket" in record) &&
      !("jobId" in record))
  );
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRuntimeStepResults(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) return [];

  const rootStepResults = value.stepResults;
  if (Array.isArray(rootStepResults)) {
    return rootStepResults.filter(isRecord);
  }

  const result = isRecord(value.result) ? value.result : null;
  const nestedStepResults = result?.stepResults;
  if (Array.isArray(nestedStepResults)) {
    return nestedStepResults.filter(isRecord);
  }

  return [];
}

function getVisibleCommandSteps(plan: TerminalPlan): Array<{ step: any; planStepIndex: number }> {
  return plan.steps
    .map((step: any, planStepIndex: number) => ({ step, planStepIndex }))
    .filter(({ step }) => {
      const metadata = isRecord(step?.metadata) ? step.metadata : {};
      return metadata.internal !== true && String(step?.command ?? "").trim().length > 0;
    });
}

function getStepRawOutput(step: Record<string, unknown>): string {
  return String(
    step.raw ??
      step.rawOutput ??
      step.output ??
      "",
  );
}

function getStepStatus(step: Record<string, unknown>): number {
  const parsed = Number(step.status ?? step.statusCode ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getStepDurationMs(step: Record<string, unknown>): number | undefined {
  const startedAt = Number(step.startedAt ?? step.startedAtMs);
  const completedAt = Number(step.completedAt ?? step.completedAtMs);
  const durationMs = Number(step.durationMs);

  if (Number.isFinite(durationMs) && durationMs >= 0) {
    return Math.round(durationMs);
  }

  if (Number.isFinite(startedAt) && Number.isFinite(completedAt) && completedAt >= startedAt) {
    return Math.round(completedAt - startedAt);
  }

  return undefined;
}

function mergeWarnings(...sources: unknown[]): string[] {
  const result: string[] = [];

  for (const source of sources) {
    if (!Array.isArray(source)) continue;

    for (const item of source) {
      const text = String(item ?? "").trim();
      if (text && !result.includes(text)) {
        result.push(text);
      }
    }
  }

  return result;
}

function parseRuntimeStepResults(
  value: unknown,
  plan: TerminalPlan,
  responseParser: ResponseParser,
): Array<{
  stepIndex: number;
  kind?: string;
  command: string;
  ok: boolean;
  output: string;
  rawOutput?: string;
  status: number;
  durationMs?: number;
  warnings: string[];
  parsed?: unknown;
  error?: string;
}> {
  const runtimeSteps = getRuntimeStepResults(value);
  if (runtimeSteps.length === 0) return [];

  const visibleSteps = getVisibleCommandSteps(plan);
  const results: Array<{
    stepIndex: number;
    kind?: string;
    command: string;
    ok: boolean;
    output: string;
    rawOutput?: string;
    status: number;
    durationMs?: number;
    warnings: string[];
    parsed?: unknown;
    error?: string;
  }> = [];

  for (const { step, planStepIndex } of visibleSteps) {
    const command = String(step.command ?? "").trim();
    if (!command) continue;

    const runtimeStep =
      runtimeSteps.find((item) => Number(item.stepIndex) === planStepIndex) ??
      runtimeSteps.find((item) => String(item.command ?? "").trim().toLowerCase() === command.toLowerCase());

    if (!runtimeStep) continue;

    const rawOutput = getStepRawOutput(runtimeStep);
    const status = getStepStatus(runtimeStep);
    const parsed = responseParser.parseCommandResponse(
      {
        ok: status === 0 && !runtimeStep.error,
        status,
        output: rawOutput,
        raw: rawOutput,
        warnings: Array.isArray(runtimeStep.warnings) ? runtimeStep.warnings : [],
        session: {},
        diagnostics: {
          statusCode: status,
        },
      },
      {
        stepIndex: planStepIndex,
        isHost: false,
        command,
      },
    );

    const warnings = mergeWarnings(
      parsed.warnings,
      runtimeStep.warnings,
    );

    results.push({
      stepIndex: planStepIndex,
      kind: String(runtimeStep.stepType ?? runtimeStep.kind ?? step.kind ?? "command"),
      command,
      ok: parsed.ok && parsed.status === 0,
      output: parsed.raw.trim(),
      rawOutput,
      status: parsed.status,
      durationMs: getStepDurationMs(runtimeStep),
      warnings,
      parsed: parsed.parsed,
      error: typeof runtimeStep.error === "string" ? runtimeStep.error : parsed.error,
    });
  }

  return results;
}

function combineStepOutput(stepResults: Array<{ output: string }>): string {
  return stepResults
    .map((item) => String(item.output ?? "").trim())
    .filter((value) => value.length > 0)
    .join("\n\n");
}

function combineStepWarnings(
  baseWarnings: string[],
  stepResults: Array<{ warnings: string[] }>,
): string[] {
  return mergeWarnings(baseWarnings, stepResults.flatMap((item) => item.warnings));
}

function getStepResultsStatus(
  fallbackStatus: number,
  stepResults: Array<{ ok: boolean; status: number }>,
): number {
  if (stepResults.length === 0) return fallbackStatus;
  return stepResults.every((item) => item.ok && item.status === 0) ? 0 : 1;
}


function parseInlineTerminalPlanResult(
  submitValue: unknown,
  plan: TerminalPlan,
  timings: AdapterTimingMap,
  responseParser: ResponseParser,
  parseCommand: string,
  parseEventStep: { kind: "command"; command: string },
  submitTimings: unknown,
): TerminalPortResult {
  const parsed = measureAdapterSync(timings, "terminalPlanParseResponseMs", () =>
    responseParser.parseCommandResponse(submitValue, {
      stepIndex: 0,
      isHost: false,
      command: parseCommand,
    }),
  );

  const warnings = [...parsed.warnings];
  const mismatchWarning = responseParser.checkPromptMismatch(parsed, {} as never);
  if (mismatchWarning) warnings.push(mismatchWarning);

  const inlineStepResults = parseRuntimeStepResults(submitValue, plan, responseParser);
  const inlineOutput = combineStepOutput(inlineStepResults);
  const inlineWarnings = combineStepWarnings(warnings, inlineStepResults);
  const inlineStatus = getStepResultsStatus(parsed.status, inlineStepResults);

  return {
    ok: inlineStepResults.length > 0 ? inlineStatus === 0 : parsed.ok,
    output: inlineStepResults.length > 0 ? inlineOutput : parsed.raw.trim(),
    status: inlineStatus,
    promptBefore: parsed.promptBefore,
    promptAfter: parsed.promptAfter,
    modeBefore: parsed.modeBefore,
    modeAfter: parsed.modeAfter,
    events: [responseParser.buildEventFromResponse(parsed, parseEventStep, 0)],
    warnings: inlineWarnings,
    parsed: parsed.parsed,
    evidence: buildTimingsEvidence(submitTimings),
    confidence: inlineStatus !== 0 ? 0 : inlineWarnings.length > 0 ? 0.8 : 1,
    stepResults: inlineStepResults.length > 0 ? inlineStepResults : undefined,
    rawOutput: inlineStepResults.length > 0 ? inlineStepResults.map((item) => item.rawOutput ?? item.output).join("\n\n") : parsed.raw.trim(),
  };
}

export async function executeTerminalPlanRun(
  bridge: FileBridgePort,
  plan: TerminalPlan,
  timeoutMs: number,
  timings: AdapterTimingMap,
  responseParser: ResponseParser,
  options?: TerminalPortOptions,
): Promise<TerminalPortResult | null> {
  const parseCommand = getTerminalPlanParseCommand(plan);
  const parseEventStep = getTerminalPlanEventStep(plan);
  const submitTimeoutMs = computeTerminalPlanSubmitTimeoutMs(plan, timeoutMs);

  const waitForCompletion = options?.waitForCompletion ?? plan.metadata?.waitForCompletion ?? true;
  const inlineTimeoutMs = options?.inlineTimeoutMs ?? plan.metadata?.inlineTimeoutMs ?? 1_200;

  const submitResult = await measureAdapterAsync(timings, "terminalPlanSubmitMs", () =>
    bridge.sendCommandAndWait(
      "terminal.plan.run",
      { plan, options: { timeoutMs }, waitForCompletion, inlineTimeoutMs },
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

  if (isInlineCompletedTerminalPlan(submitValue)) {
    timings.terminalPlanInlineCompleted = 1;
    copyFastDeferredTimingsToAdapterTimings(submitValue, timings);
    timings.terminalPlanPollCount = 0;
    timings.terminalPlanPollPendingCount = 0;
    timings.terminalPlanPollCompletedCount = 0;

    return parseInlineTerminalPlanResult(submitValue, plan, timings, responseParser, parseCommand, parseEventStep, submitResult.timings);
  }

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

  const initialPollDelayMs = computeInitialDeferredPollDelayMs(plan, parseCommand);
  timings.terminalPlanPollInitialDelayMs = initialPollDelayMs;

  if (initialPollDelayMs > 0) {
    const remainingBeforeInitialPollMs = pollTimeoutMs - (nowMs() - startedAt);
    const initialSleepMs = Math.min(initialPollDelayMs, Math.max(remainingBeforeInitialPollMs, 0));

    if (initialSleepMs > 0) {
      timings.terminalPlanPollInitialDelaySleepMs = initialSleepMs;

      await measureAdapterAsync(timings, "terminalPlanPollSleepMs", () =>
        new Promise((resolve) => setTimeout(resolve, initialSleepMs)),
      );
    }
  }

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
        buildDeferredFailureEvidence(timings, {
          phase: "terminal-plan-poll",
          ticket,
          pollTimeoutMs,
          elapsedMs,
          error: message,
          pollValue,
        }),
      );
    }

    if (!isStillPending(pollValue)) {
      break;
    }

    const remainingMs = pollTimeoutMs - (nowMs() - startedAt);
    if (remainingMs <= 0) {
      break;
    }

    const recommendedSleepMs = computeRecommendedDeferredPollSleepMs(pollValue, pollIntervalMs);
    const sleepMs = Math.min(recommendedSleepMs, remainingMs);

    timings.terminalPlanPollLastSleepMs = sleepMs;

    if (recommendedSleepMs !== pollIntervalMs) {
      timings.terminalPlanPollRecommendedCount =
        (timings.terminalPlanPollRecommendedCount ?? 0) + 1;
      timings.terminalPlanPollLastRecommendedSleepMs = recommendedSleepMs;
    }

    await measureAdapterAsync(timings, "terminalPlanPollSleepMs", () =>
      new Promise((resolve) => setTimeout(resolve, sleepMs)),
    );
  }

  if (isStillPending(pollValue)) {
    const elapsedMs = nowMs() - startedAt;
    return buildTerminalDeferredFailure(
      "TERMINAL_DEFERRED_STALLED",
      `terminal.plan.run creó el ticket ${ticket}, pero el job siguió pendiente después de ${pollTimeoutMs}ms.`,
      buildDeferredFailureEvidence(timings, {
        phase: "terminal-plan-poll",
        ticket,
        pollTimeoutMs,
        elapsedMs,
        pollValue,
      }),
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

  const deferredStepResults = parseRuntimeStepResults(pollValue, plan, responseParser);
  const deferredOutput = combineStepOutput(deferredStepResults);
  const deferredWarnings = combineStepWarnings(warnings, deferredStepResults);
  const deferredStatus = getStepResultsStatus(parsed.status, deferredStepResults);

  const parsedOk = deferredStepResults.length > 0 ? deferredStatus === 0 : parsed.ok && parsed.status === 0;
  const finalEvidence = parsedOk
    ? buildTimingsEvidence(timings)
    : buildDeferredFailureEvidence(timings, {
        phase: "terminal-plan-poll",
        ticket,
        pollTimeoutMs,
        elapsedMs: nowMs() - startedAt,
        pollValue,
      });

  return {
    ok: parsedOk,
    output: deferredStepResults.length > 0 ? deferredOutput : parsed.raw.trim(),
    status: deferredStepResults.length > 0 ? deferredStatus : parsed.status,
    promptBefore: parsed.promptBefore,
    promptAfter: parsed.promptAfter,
    modeBefore: parsed.modeBefore,
    modeAfter: parsed.modeAfter,
    events: [responseParser.buildEventFromResponse(parsed, parseEventStep, 0)],
    warnings: deferredWarnings,
    parsed: parsed.parsed,
    evidence: finalEvidence,
    confidence: parsedOk ? (deferredWarnings.length > 0 ? 0.8 : 1) : 0,
    stepResults: deferredStepResults.length > 0 ? deferredStepResults : undefined,
    rawOutput: deferredStepResults.length > 0 ? deferredStepResults.map((item) => item.rawOutput ?? item.output).join("\n\n") : parsed.raw.trim(),
  };
}

function copyFastDeferredTimingsToAdapterTimings(value: unknown, timings: any): void {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  const resultRecord =
    record?.result && typeof record.result === "object" && !Array.isArray(record.result)
      ? (record.result as Record<string, unknown>)
      : null;

  const diagnosticsRecord =
    record?.diagnostics && typeof record.diagnostics === "object" && !Array.isArray(record.diagnostics)
      ? (record.diagnostics as Record<string, unknown>)
      : null;

  const rootFastDeferred =
    record?.fastDeferred && typeof record.fastDeferred === "object" && !Array.isArray(record.fastDeferred)
      ? (record.fastDeferred as Record<string, unknown>)
      : null;

  const resultFastDeferred =
    resultRecord?.fastDeferred && typeof resultRecord.fastDeferred === "object" && !Array.isArray(resultRecord.fastDeferred)
      ? (resultRecord.fastDeferred as Record<string, unknown>)
      : null;

  const diagnosticsFastDeferred =
    diagnosticsRecord?.fastDeferred && typeof diagnosticsRecord.fastDeferred === "object" && !Array.isArray(diagnosticsRecord.fastDeferred)
      ? (diagnosticsRecord.fastDeferred as Record<string, unknown>)
      : null;

  const fastDeferred = rootFastDeferred ?? resultFastDeferred ?? diagnosticsFastDeferred;

  if (!fastDeferred || !timings) {
    return;
  }

  timings.terminalPlanFastDeferredEnabled = fastDeferred.enabled === true ? 1 : 0;
  timings.terminalPlanFastDeferredHit = fastDeferred.hit === true ? 1 : 0;

  if (typeof fastDeferred.waitMs === "number" && Number.isFinite(fastDeferred.waitMs)) {
    timings.terminalPlanFastDeferredWaitMs = Math.round(fastDeferred.waitMs);
  }

  if (typeof fastDeferred.budgetMs === "number" && Number.isFinite(fastDeferred.budgetMs)) {
    timings.terminalPlanFastDeferredBudgetMs = Math.round(fastDeferred.budgetMs);
  }

  if (typeof fastDeferred.intervalMs === "number" && Number.isFinite(fastDeferred.intervalMs)) {
    timings.terminalPlanFastDeferredIntervalMs = Math.round(fastDeferred.intervalMs);
  }

  if (typeof fastDeferred.checks === "number" && Number.isFinite(fastDeferred.checks)) {
    timings.terminalPlanFastDeferredChecks = Math.round(fastDeferred.checks);
  }
}
