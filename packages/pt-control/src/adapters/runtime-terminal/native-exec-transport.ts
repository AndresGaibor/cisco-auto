// Native exec transport — ejecuta terminal.native.exec y maneja polling diferido

import type { AdapterTimingMap, FileBridgePort, TerminalPlan, TerminalPortResult } from "./types.js";
import { isDeferredValue, isStillPending, normalizeBridgeValue, buildTimingsEvidence } from "./types.js";
import {
  nowMs,
  measureAdapterAsync,
} from "./terminal-timings.js";
import { buildTerminalDeferredFailure } from "./terminal-errors.js";
import type { ResponseParser } from "./response-parser.js";
import { computeDeferredPollTimeoutMs } from "./deferred-poller.js";

export async function executeTerminalNativeExec(
  bridge: FileBridgePort,
  plan: TerminalPlan,
  timeoutMs: number,
  responseParser: ResponseParser,
  defaultTimeout: number,
): Promise<{ result: TerminalPortResult; timings: AdapterTimingMap }> {
  const timings: AdapterTimingMap = {};
  const command = String(getSingleVisibleCommand(plan) ?? "").trim();
  const stepTimeoutMs = Number(plan.steps[0]?.timeout ?? timeoutMs ?? defaultTimeout);
  const nativeTimeoutMs = Math.max(stepTimeoutMs, 10000);

  const nativeResult = await measureAdapterAsync(timings, "nativeExecMs", () =>
    bridge.sendCommandAndWait(
      "terminal.native.exec",
      {
        device: plan.device,
        command,
        timeoutMs: nativeTimeoutMs,
        maxPagerAdvances: plan.policies?.maxPagerAdvances ?? 80,
        stableSamples: 2,
        sampleDelayMs: 90,
      },
      nativeTimeoutMs,
      { resolveDeferred: false },
    ),
  );

  let finalTimings: unknown = nativeResult.timings;
  let nativeValue = normalizeBridgeValue(nativeResult);

  if (isDeferredValue(nativeValue)) {
    const ticket = nativeValue.ticket;
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

        finalTimings = pollResult.timings;
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
        nativeValue = pollValue;
        break;
      }

      const remainingMs = pollTimeoutMs - (nowMs() - startedAt);
      if (remainingMs <= 0) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, remainingMs)));
    }

    if (isStillPending(nativeValue)) {
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
            pollValue: nativeValue,
          },
        ),
        timings,
      };
    }
  }

  const parsed = responseParser.parseCommandResponse(nativeValue, {
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
      evidence: buildTimingsEvidence(finalTimings),
      confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
    },
    timings,
  };
}

function getSingleVisibleCommand(plan: TerminalPlan): string | null {
  const commands = plan.steps.filter((step: { metadata?: { internal?: boolean }; command?: string }) => {
    const metadata = step.metadata as { internal?: boolean } | undefined;
    return metadata?.internal !== true && String(step.command ?? "").trim().length > 0;
  }) as Array<{ command: string }>;

  if (commands.length !== 1) return null;

  const command = String(commands[0]?.command ?? "").trim();
  return command || null;
}