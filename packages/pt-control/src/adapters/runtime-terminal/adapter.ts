// RuntimeTerminalAdapter — orchestrator (runTerminalPlan)
// Coordinates step handlers, status normalization, and device detection.
// No pure logic lives here — it delegates to specialized modules.

import type { FileBridgePort } from "../../application/ports/file-bridge.port.js";
import type {
  RuntimeTerminalPort,
  TerminalPortOptions,
  TerminalPortResult,
  TerminalPlan,
  TerminalPlanTimeouts,
  TerminalPlanPolicies,
} from "../../ports/runtime-terminal-port.js";
import { detectDeviceType } from "./device-type-detector.js";
import { handleEnsureModeStep } from "./step-handlers/ensure-mode-handler.js";
import { handleConfirmStep } from "./step-handlers/confirm-handler.js";
import { ensureSession, pollTerminalJob } from "./terminal-session.js";
import { createPayloadBuilder } from "./payload-builder.js";
import { createResponseParser } from "./response-parser.js";
import { createTerminalPlanAdapter } from "./terminal-plan-adapter.js";

export interface RuntimeTerminalAdapterDeps {
  bridge: FileBridgePort;
  generateId: () => string;
  defaultTimeout?: number;
}

export function createRuntimeTerminalAdapter(
  deps: RuntimeTerminalAdapterDeps,
): RuntimeTerminalPort {
  const { bridge, generateId, defaultTimeout = 30000 } = deps;

  const payloadBuilder = createPayloadBuilder({ bridge });
  const responseParser = createResponseParser();
  const planAdapter = createTerminalPlanAdapter();

  async function runTerminalPlan(
    plan: TerminalPlan,
    options?: TerminalPortOptions,
  ): Promise<TerminalPortResult> {
    const timeoutMs = options?.timeoutMs ?? defaultTimeout;

    const validation = planAdapter.validatePlan(plan);
    if (!validation.valid) {
      return {
        ok: false,
        output: "",
        status: 1,
        promptBefore: "",
        promptAfter: "",
        modeBefore: "",
        modeAfter: "",
        events: [],
        warnings: validation.errors,
        confidence: 0,
      };
    }

    if (validation.warnings.length > 0) {
      console.warn("[runtime-terminal] Plan warnings:", validation.warnings);
    }

    const normalizedPlan = planAdapter.normalizePlan(plan);

    let promptBefore = "";
    let modeBefore = "";
    let promptAfter = "";
    let modeAfter = "";
    let aggregatedOutput = "";
    let finalStatus = 0;
    let finalParsed: unknown = undefined;

    const warnings: string[] = [];
    const events: Array<Record<string, unknown>> = [];

    const deviceType = await detectDeviceType(bridge, normalizedPlan.device);
    const isHost = deviceType === "host";
    const handlerName = isHost ? "execPc" : "execIos";

    const defaultTimeouts: TerminalPlanTimeouts = normalizedPlan.timeouts ??
      payloadBuilder.getDefaultTimeouts();
    const defaultPolicies: TerminalPlanPolicies = normalizedPlan.policies ??
      payloadBuilder.getDefaultPolicies();

    for (let i = 0; i < normalizedPlan.steps.length; i += 1) {
      const step = normalizedPlan.steps[i]!;

      if (step.kind === "ensureMode") {
        const { event, result, returnEarly, returnValue } = await handleEnsureModeStep(
          {
            bridge,
            device: normalizedPlan.device,
            isHost,
            handlerName,
            defaultTimeouts,
            planTargetMode: normalizedPlan.targetMode,
          },
          step,
          i,
        );

        if (result.promptBefore && !promptBefore) {
          promptBefore = result.promptBefore;
        }
        if (result.modeBefore && !modeBefore) {
          modeBefore = result.modeBefore;
        }
        if (result.promptAfter) {
          promptAfter = result.promptAfter;
        }
        if (result.modeAfter) {
          modeAfter = result.modeAfter;
        }
        if (result.finalParsed) {
          finalParsed = result.finalParsed;
        }

        events.push(event);

        if (returnEarly && returnValue) {
          return returnValue;
        }
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
        const { event } = await handleConfirmStep(
          {
            bridge,
            device: normalizedPlan.device,
            isHost,
            handlerName,
            defaultTimeouts,
          },
          i,
        );
        events.push(event);
        continue;
      }

      const command = String(step.command ?? "");
      const stepTimeout = step.timeout ?? defaultTimeouts.commandTimeoutMs;
      const stepStallTimeout = defaultTimeouts.stallTimeoutMs;

      const stepPolicies = {
        allowPager: step.allowPager ?? defaultPolicies.autoAdvancePager,
        allowConfirm: step.allowConfirm ?? false,
      };

      const ensurePrivileged = payloadBuilder.shouldEnsurePrivilegedForStep({
        isHost,
        planTargetMode: normalizedPlan.targetMode,
        command,
        stepIndex: i,
      });

      const payload = payloadBuilder.buildCommandPayload({
        handlerName,
        device: normalizedPlan.device,
        command,
        targetMode: normalizedPlan.targetMode,
        expectMode: step.expectMode,
        expectPromptPattern: step.expectPromptPattern,
        allowPager: stepPolicies.allowPager,
        allowConfirm: stepPolicies.allowConfirm,
        ensurePrivileged,
        commandTimeoutMs: stepTimeout,
        stallTimeoutMs: stepStallTimeout,
      });

      const bridgeResult = await bridge.sendCommandAndWait<unknown>(
        handlerName,
        payload,
        stepTimeout,
      );

      const res = (bridgeResult as any)?.value ?? bridgeResult ?? {};

      const parsed = responseParser.parseCommandResponse(res, {
        stepIndex: i,
        isHost,
        command,
      });

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

      const event = responseParser.buildEventFromResponse(parsed, step, i);
      events.push(event);

      const mismatchWarning = responseParser.checkPromptMismatch(parsed, step);
      if (mismatchWarning) {
        warnings.push(mismatchWarning);
      }

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
      confidence: warnings.length > 0 ? 0.8 : 1,
    };
  }

  return {
    runTerminalPlan,
    ensureSession,
    pollTerminalJob,
  };
}