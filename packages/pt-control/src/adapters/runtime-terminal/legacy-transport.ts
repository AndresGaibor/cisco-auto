// Legacy transport — fallback para execIos/configIos

import type { AdapterTimingMap, FileBridgePort, TerminalPlan, TerminalPortResult } from "./types.js";
import {
  nowMs,
  addTiming,
  measureAdapterAsync,
  measureAdapterSync,
} from "./terminal-timings.js";
import { buildTimingsEvidence } from "./types.js";
import type { ResponseParser } from "./response-parser.js";
import type { PayloadBuilder } from "./payload-builder.js";
import { detectDeviceType } from "./device-type-detector.js";
import { handleEnsureModeStep } from "./step-handlers/ensure-mode-handler.js";
import { handleConfirmStep } from "./step-handlers/confirm-handler.js";

export interface LegacyTransportDeps {
  bridge: FileBridgePort;
  payloadBuilder: PayloadBuilder;
  responseParser: ResponseParser;
}

export interface NormalizedPlan {
  id: string;
  device: string;
  targetMode: string;
  steps: Array<{
    kind?: string;
    command?: string;
    expectMode?: string;
    expectPromptPattern?: string;
    allowPager?: boolean;
    allowConfirm?: boolean;
    timeout?: number;
    metadata?: Record<string, unknown>;
  }>;
  timeouts?: { commandTimeoutMs: number; stallTimeoutMs: number };
  policies?: {
    autoBreakWizard: boolean;
    autoAdvancePager: boolean;
    maxPagerAdvances: number;
    maxConfirmations: number;
    abortOnPromptMismatch: boolean;
    abortOnModeMismatch: boolean;
  };
  metadata?: Record<string, unknown>;
}

export async function executeLegacyPlan(
  deps: LegacyTransportDeps,
  normalizedPlan: NormalizedPlan,
  timings: AdapterTimingMap,
): Promise<TerminalPortResult> {
  let promptBefore = "";
  let modeBefore = "";
  let promptAfter = "";
  let modeAfter = "";
  let aggregatedOutput = "";
  let finalStatus = 0;
  let finalParsed: unknown = undefined;
  let finalTimings: unknown = undefined;

  const warnings: string[] = [];
  const events: Array<Record<string, unknown>> = [];

  const deviceType = await measureAdapterAsync(timings, "legacyDetectDeviceTypeMs", () =>
    detectDeviceType(deps.bridge, normalizedPlan.device),
  );
  const isHost = deviceType === "host";
  const handlerName = isHost ? "execPc" : "execIos";

  const defaultTimeouts = normalizedPlan.timeouts ?? deps.payloadBuilder.getDefaultTimeouts();
  const defaultPolicies = normalizedPlan.policies ?? deps.payloadBuilder.getDefaultPolicies();

  for (let i = 0; i < normalizedPlan.steps.length; i += 1) {
    const step = normalizedPlan.steps[i]!;

    if (step.kind === "ensureMode") {
      const { event, result, returnEarly, returnValue } = await measureAdapterAsync(
        timings,
        "legacyEnsureModeMs",
        () =>
          handleEnsureModeStep(
            {
              bridge: deps.bridge,
              device: normalizedPlan.device,
              isHost,
              handlerName,
              defaultTimeouts,
              planTargetMode: normalizedPlan.targetMode as any,
            },
            step as any,
            i,
          ),
      );

      if (result.promptBefore && !promptBefore) promptBefore = result.promptBefore;
      if (result.modeBefore && !modeBefore) modeBefore = result.modeBefore;
      if (result.promptAfter) promptAfter = result.promptAfter;
      if (result.modeAfter) modeAfter = result.modeAfter;
      if (result.finalParsed) finalParsed = result.finalParsed;

      events.push(event);

      if (returnEarly && returnValue) return returnValue;
      continue;
    }

    if (step.kind === "expectPrompt") {
      events.push({
        stepIndex: i,
        kind: "expectPrompt",
        expectPromptPattern: step.expectPromptPattern,
      });
      continue;
    }

    if (step.kind === "confirm") {
      const { event } = await measureAdapterAsync(timings, "legacyConfirmMs", () =>
        handleConfirmStep(
          {
            bridge: deps.bridge,
            device: normalizedPlan.device,
            isHost,
            handlerName,
            defaultTimeouts,
          },
          i,
        ),
      );
      events.push(event);
      continue;
    }

    const command = String(step.command ?? "");
    const stepTimeout = step.timeout ?? defaultTimeouts.commandTimeoutMs;
    const stepStallTimeout = defaultTimeouts.stallTimeoutMs;

    const payload = measureAdapterSync(timings, "legacyBuildPayloadMs", () =>
      deps.payloadBuilder.buildCommandPayload({
        handlerName,
        device: normalizedPlan.device,
        command,
        targetMode: normalizedPlan.targetMode as any,
        expectMode: step.expectMode as any,
        expectPromptPattern: step.expectPromptPattern,
        allowPager: step.allowPager ?? defaultPolicies.autoAdvancePager,
        allowConfirm: step.allowConfirm ?? false,
        ensurePrivileged: deps.payloadBuilder.shouldEnsurePrivilegedForStep({
          isHost,
          planTargetMode: normalizedPlan.targetMode as any,
          command,
          stepIndex: i,
        }),
        commandTimeoutMs: stepTimeout,
        stallTimeoutMs: stepStallTimeout,
      }),
    );

    const bridgeResult = await measureAdapterAsync(timings, "legacyBridgeCommandMs", () =>
      deps.bridge.sendCommandAndWait<unknown>(handlerName, payload, stepTimeout),
    );
    finalTimings = bridgeResult.timings;
    const parsed = measureAdapterSync(timings, "legacyParseResponseMs", () =>
      deps.responseParser.parseCommandResponse(normalizeBridgeValue(bridgeResult), {
        stepIndex: i,
        isHost,
        command,
      }),
    );

    if (i === 0) {
      promptBefore = parsed.promptBefore;
      modeBefore = parsed.modeBefore;
    }

    promptAfter = parsed.promptAfter;
    modeAfter = parsed.modeAfter;
    aggregatedOutput += parsed.raw.endsWith("\n") ? parsed.raw : `${parsed.raw}\n`;
    finalStatus = parsed.status;
    finalParsed = parsed.parsed;

    warnings.push(...parsed.warnings);
    const event = deps.responseParser.buildEventFromResponse(parsed, step as any, i);
    events.push(event);

    const mismatchWarning = deps.responseParser.checkPromptMismatch(parsed, step as any);
    if (mismatchWarning) warnings.push(mismatchWarning);

    if (!parsed.ok || parsed.status !== 0) {
      return {
        ok: false,
        output: aggregatedOutput.trim(),
        status: parsed.status || 1,
        promptBefore,
        promptAfter,
        modeBefore,
        modeAfter,
        events,
        warnings,
        parsed: finalParsed,
        evidence: buildTimingsEvidence(bridgeResult.timings),
        confidence: 0,
      };
    }
  }

  return {
    ok: true,
    output: aggregatedOutput.trim(),
    status: finalStatus,
    promptBefore,
    promptAfter,
    modeBefore,
    modeAfter,
    events,
    warnings,
    parsed: finalParsed,
    evidence: buildTimingsEvidence(finalTimings),
    confidence: warnings.length > 0 ? 0.8 : 1,
  };
}

function normalizeBridgeValue(result: unknown): unknown {
  return (result as { value?: unknown })?.value ?? result ?? {};
}