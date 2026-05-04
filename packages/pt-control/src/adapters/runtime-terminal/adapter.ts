// RuntimeTerminalAdapter — orchestrator (runTerminalPlan)
// Coordina step handlers, normalización de estado, y detección de dispositivo.
// No hay lógica pura aquí — delega a módulos especializados.

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
import {
  executeTerminalPlanRun,
  computeTerminalPlanSubmitTimeoutMs,
} from "./plan-run-transport.js";
import { executeTerminalNativeExec } from "./native-exec-transport.js";
import { executeLegacyPlan } from "./legacy-transport.js";
import type { AdapterTimingMap, NormalizedPlan } from "./types.js";
import { nowMs, measureAdapterSync, measureAdapterAsync, mergeTimingScope } from "./terminal-timings.js";
import type { TerminalPlanAdapter } from "./terminal-plan-adapter.js";

function finalizeAdapterResult(
  result: TerminalPortResult,
  timings: AdapterTimingMap,
  startedAt: number,
): TerminalPortResult {
  timings.adapterTotalMs = Math.max(0, nowMs() - startedAt);
  result.evidence = mergeTimingScope(result.evidence, "adapter", timings);
  return result;
}

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

  function shouldUseNativeExec(plan: TerminalPlan): boolean {
    const metadata = plan.metadata as {
      deviceKind?: string;
      transport?: string;
      nativeExec?: boolean;
      experimentalNativeExec?: boolean;
    } | undefined;

    if (metadata?.deviceKind !== "ios") return false;

    return (
      metadata?.transport === "terminal.native.exec" ||
      metadata?.nativeExec === true ||
      metadata?.experimentalNativeExec === true
    );
  }

  async function runTerminalPlan(
    plan: TerminalPlan,
    options?: TerminalPortOptions,
  ): Promise<TerminalPortResult> {
    const adapterStartedAt = nowMs();
    const timings: AdapterTimingMap = {};
    const timeoutMs = options?.timeoutMs ?? defaultTimeout;

    const validation = measureAdapterSync(timings, "validatePlanMs", () =>
      planAdapter.validatePlan(plan),
    );
    if (!validation.valid) {
      return finalizeAdapterResult(
        {
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
        },
        timings,
        adapterStartedAt,
      );
    }

    if (validation.warnings.length > 0) {
      console.warn("[runtime-terminal] Plan warnings:", validation.warnings);
    }

    const normalizedPlan = measureAdapterSync(timings, "normalizePlanMs", () =>
      planAdapter.normalizePlan(plan),
    ) as NormalizedPlan;

    if (shouldUseNativeExec(normalizedPlan)) {
      const { result, timings: nativeTimings } = await measureAdapterAsync(
        timings,
        "nativeExecMs",
        () => executeTerminalNativeExec(bridge, normalizedPlan, timeoutMs, responseParser, defaultTimeout),
      );
      Object.assign(timings, nativeTimings);
      return finalizeAdapterResult(result, timings, adapterStartedAt);
    }

    const deferredResult = await measureAdapterAsync(timings, "terminalPlanRunMs", () =>
      executeTerminalPlanRun(bridge, normalizedPlan, timeoutMs, timings, responseParser),
    );
    if (deferredResult) {
      return finalizeAdapterResult(deferredResult, timings, adapterStartedAt);
    }

    return finalizeAdapterResult(
      await measureAdapterAsync(timings, "legacyPlanMs", () =>
        executeLegacyPlan(
          {
            bridge,
            payloadBuilder,
            responseParser,
          },
          normalizedPlan,
          timings,
        ),
      ),
      timings,
      adapterStartedAt,
    );
  }

  return {
    runTerminalPlan,
    ensureSession,
    pollTerminalJob,
  };
}