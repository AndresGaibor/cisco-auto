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

type AdapterTimingMap = Record<string, number>;

function nowMs(): number {
  return Date.now();
}

function addTiming(timings: AdapterTimingMap, name: string, value: number): void {
  timings[name] = (timings[name] ?? 0) + Math.max(0, value);
}

async function measureAdapterAsync<T>(
  timings: AdapterTimingMap,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = nowMs();

  try {
    return await fn();
  } finally {
    addTiming(timings, name, nowMs() - startedAt);
  }
}

function measureAdapterSync<T>(
  timings: AdapterTimingMap,
  name: string,
  fn: () => T,
): T {
  const startedAt = nowMs();

  try {
    return fn();
  } finally {
    addTiming(timings, name, nowMs() - startedAt);
  }
}

function mergeTimingScope(
  evidence: unknown,
  scope: string,
  timings: AdapterTimingMap,
): Record<string, unknown> {
  const base =
    evidence && typeof evidence === "object"
      ? { ...(evidence as Record<string, unknown>) }
      : {};

  const existingTimings =
    base.timings && typeof base.timings === "object"
      ? { ...(base.timings as Record<string, unknown>) }
      : {};

  base.timings = {
    ...existingTimings,
    [scope]: {
      ...(existingTimings[scope] && typeof existingTimings[scope] === "object"
        ? (existingTimings[scope] as Record<string, unknown>)
        : {}),
      ...timings,
    },
  };

  return base;
}

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

  function normalizeBridgeValue(result: unknown): unknown {
    return (result as { value?: unknown })?.value ?? result ?? {};
  }

  function buildTimingsEvidence(timings: unknown): Record<string, unknown> {
    return timings ? { timings } : {};
  }

  function isDeferredValue(value: unknown): value is { deferred: true; ticket: string } {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as { deferred?: unknown }).deferred === true &&
      typeof (value as { ticket?: unknown }).ticket === "string"
    );
  }

  function isStillPending(value: unknown): boolean {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Record<string, unknown>;
    if (record.deferred === true) return true;
    if (record.done === false) return true;
    if (record.status === "pending") return true;
    if (record.status === "in-flight") return true;
    if (record.status === "running") return true;
    return false;
  }

  function isUnsupportedTerminalPlanRun(result: unknown): boolean {
    const value = result as { error?: unknown; value?: { error?: unknown } } | null | undefined;
    const text = String(value?.error ?? value?.value?.error ?? "").toLowerCase();
    return (
      text.includes("unknown command") ||
      text.includes("not found") ||
      text.includes("unsupported") ||
      text.includes("unrecognized") ||
      text.includes("no existe")
    );
  }

  function normalizeCommand(command: string): string {
    return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function isProbablyConfigChangingCommand(command: string): boolean {
    const cmd = normalizeCommand(command);

    if (!cmd) return false;

    return (
      cmd === "configure terminal" ||
      cmd === "conf t" ||
      cmd === "end" ||
      cmd === "exit" ||
      cmd.startsWith("interface ") ||
      cmd.startsWith("router ") ||
      cmd.startsWith("line ") ||
      cmd.startsWith("vlan ") ||
      cmd.startsWith("ip route ") ||
      cmd.startsWith("no ") ||
      cmd.startsWith("hostname ") ||
      cmd.startsWith("enable secret ") ||
      cmd.startsWith("username ")
    );
  }

  function getVisibleCommandSteps(plan: TerminalPlan): Array<{ command: string; kind?: string }> {
    return plan.steps.filter((step) => {
      const metadata = step.metadata as { internal?: boolean } | undefined;

      return metadata?.internal !== true && String(step.command ?? "").trim().length > 0;
    }) as Array<{ command: string; kind?: string }>;
  }

  function getSingleVisibleCommand(plan: TerminalPlan): string | null {
    const commands = getVisibleCommandSteps(plan);

    if (commands.length !== 1) return null;

    const command = String(commands[0]?.command ?? "").trim();
    return command || null;
  }

  function getLastVisibleCommand(plan: TerminalPlan): string | null {
    const commands = getVisibleCommandSteps(plan);

    for (let index = commands.length - 1; index >= 0; index -= 1) {
      const command = String(commands[index]?.command ?? "").trim();

      if (command) {
        return command;
      }
    }

    return null;
  }

  function getTerminalPlanParseCommand(plan: TerminalPlan): string {
    return getSingleVisibleCommand(plan) ?? getLastVisibleCommand(plan) ?? "terminal.plan.run";
  }

  function getTerminalPlanEventStep(plan: TerminalPlan): { kind: "command"; command: string } {
    return {
      kind: "command",
      command: getTerminalPlanParseCommand(plan),
    };
  }

  function shouldUseNativeExec(plan: TerminalPlan): boolean {
    const metadata = plan.metadata as {
      deviceKind?: string;
      transport?: string;
      nativeExec?: boolean;
      experimentalNativeExec?: boolean;
    } | undefined;

    if (metadata?.deviceKind !== "ios") return false;

    /**
     * terminal.native.exec queda desactivado como ruta default.
     *
     * Motivo:
     * - terminal.plan.run/config está estable.
     * - terminal.native.exec presentó fallos intermitentes con output vacío
     *   en comandos read-only repetidos como show version/show running-config.
     *
     * Se conserva como opt-in explícito para futuras pruebas, pero no debe
     * usarse automáticamente por pt cmd.
     */
    return (
      metadata?.transport === "terminal.native.exec" ||
      metadata?.nativeExec === true ||
      metadata?.experimentalNativeExec === true
    );
  }

  function buildTerminalTransportFailure(
    message: string,
    evidence?: Record<string, unknown>,
  ): TerminalPortResult {
    return {
      ok: false,
      output: "",
      status: 1,
      promptBefore: "",
      promptAfter: "",
      modeBefore: "",
      modeAfter: "",
      events: [],
      warnings: [message],
      parsed: {
        ok: false,
        code: "TERMINAL_PLAN_TRANSPORT_FAILED",
        error: message,
      },
      evidence,
      confidence: 0,
    };
  }

  function buildTerminalDeferredFailure(
    code: string,
    message: string,
    evidence?: Record<string, unknown>,
  ): TerminalPortResult {
    return {
      ok: false,
      output: "",
      status: 1,
      promptBefore: "",
      promptAfter: "",
      modeBefore: "",
      modeAfter: "",
      events: [],
      warnings: [message],
      parsed: {
        ok: false,
        code,
        error: message,
      },
      evidence,
      confidence: 0,
    };
  }

  async function executeLegacyPlan(
    normalizedPlan: ReturnType<typeof planAdapter.normalizePlan>,
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
      detectDeviceType(bridge, normalizedPlan.device),
    );
    const isHost = deviceType === "host";
    const handlerName = isHost ? "execPc" : "execIos";

    const defaultTimeouts = normalizedPlan.timeouts ?? payloadBuilder.getDefaultTimeouts();
    const defaultPolicies = normalizedPlan.policies ?? payloadBuilder.getDefaultPolicies();

    for (let i = 0; i < normalizedPlan.steps.length; i += 1) {
      const step = normalizedPlan.steps[i]!;

      if (step.kind === "ensureMode") {
        const { event, result, returnEarly, returnValue } = await measureAdapterAsync(
          timings,
          "legacyEnsureModeMs",
          () =>
            handleEnsureModeStep(
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
              bridge,
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
        payloadBuilder.buildCommandPayload({
          handlerName,
          device: normalizedPlan.device,
          command,
          targetMode: normalizedPlan.targetMode,
          expectMode: step.expectMode,
          expectPromptPattern: step.expectPromptPattern,
          allowPager: step.allowPager ?? defaultPolicies.autoAdvancePager,
          allowConfirm: step.allowConfirm ?? false,
          ensurePrivileged: payloadBuilder.shouldEnsurePrivilegedForStep({
            isHost,
            planTargetMode: normalizedPlan.targetMode,
            command,
            stepIndex: i,
          }),
          commandTimeoutMs: stepTimeout,
          stallTimeoutMs: stepStallTimeout,
        }),
      );

      const bridgeResult = await measureAdapterAsync(timings, "legacyBridgeCommandMs", () =>
        bridge.sendCommandAndWait<unknown>(handlerName, payload, stepTimeout),
      );
      finalTimings = bridgeResult.timings;
      const parsed = measureAdapterSync(timings, "legacyParseResponseMs", () =>
        responseParser.parseCommandResponse(normalizeBridgeValue(bridgeResult), {
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
      const event = responseParser.buildEventFromResponse(parsed, step, i);
      events.push(event);

      const mismatchWarning = responseParser.checkPromptMismatch(parsed, step);
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

  function computeDeferredPollTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
    const planTimeouts = plan.timeouts as TerminalPlanTimeouts | undefined;
    const commandTimeoutMs = Number(planTimeouts?.commandTimeoutMs ?? requestedTimeoutMs ?? 30000);
    const stallTimeoutMs = Number(planTimeouts?.stallTimeoutMs ?? 15000);
    const stepCount = Math.max(plan.steps.length, 1);

    const perStepBudgetMs = commandTimeoutMs + stallTimeoutMs + 3000;
    const totalBudgetMs = perStepBudgetMs * stepCount;

    return Math.max(requestedTimeoutMs, totalBudgetMs, 25000);
  }

  function clampDeferredPollIntervalMs(value: unknown, fallbackMs: number): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallbackMs;
    }

    return Math.max(75, Math.min(Math.trunc(parsed), 500));
  }

  function computeDeferredPollIntervalMs(plan: TerminalPlan): number {
    const metadata = plan.metadata as {
      deferredPollIntervalMs?: unknown;
      terminalPlanPollIntervalMs?: unknown;
      pollIntervalMs?: unknown;
    } | undefined;

    return clampDeferredPollIntervalMs(
      metadata?.deferredPollIntervalMs ??
        metadata?.terminalPlanPollIntervalMs ??
        metadata?.pollIntervalMs,
      100,
    );
  }

  function computeTerminalPlanSubmitTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
    const firstStepTimeoutMs = Number(plan.steps[0]?.timeout ?? requestedTimeoutMs ?? 30000);

    // terminal.plan.run solo debe crear el ticket; no ejecuta todo el comando.
    // Pero Packet Tracer puede tardar en reclamar archivos si el kernel está ocupado,
    // hay polling activo, o el filesystem compartido va lento.
    return Math.max(
      15000,
      Math.min(firstStepTimeoutMs, 30000),
    );
  }

  async function executeTerminalPlanRun(
    plan: TerminalPlan,
    timeoutMs: number,
    timings: AdapterTimingMap,
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
    timings.terminalPlanSubmitBridgeWaitMs = Number((submitResult as any)?.timings?.waitMs ?? 0);

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
        events: [
          responseParser.buildEventFromResponse(parsed, parseEventStep, 0),
        ],
        warnings: parsed.warnings,
        parsed: parsed.parsed,
        evidence: buildTimingsEvidence(submitResult.timings),
        confidence: 0,
      };
    }

    if (isDeferredValue(submitValue)) {
      const startedAt = Date.now();
      const pollTimeoutMs = computeDeferredPollTimeoutMs(plan, timeoutMs);
      const pollIntervalMs = computeDeferredPollIntervalMs(plan);
      timings.terminalPlanPollTimeoutMs = pollTimeoutMs;
      timings.terminalPlanPollIntervalMs = pollIntervalMs;
      timings.terminalPlanPollCount = 0;

      let pollValue: unknown = null;

      while (Date.now() - startedAt < pollTimeoutMs) {
        try {
          timings.terminalPlanPollCount += 1;
          const pollResult = await measureAdapterAsync(timings, "terminalPlanPollBridgeMs", () =>
            bridge.sendCommandAndWait(
              "__pollDeferred",
              { ticket: submitValue.ticket },
              Math.max(pollTimeoutMs - (Date.now() - startedAt), 1000),
              { resolveDeferred: false },
            ),
          );

          finalTimings = pollResult.timings;
          pollValue = normalizeBridgeValue(pollResult);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error ?? "Unknown poll error");

          return buildTerminalDeferredFailure(
            "TERMINAL_DEFERRED_POLL_TIMEOUT",
            `__pollDeferred no respondió en ${pollTimeoutMs}ms para ticket ${submitValue.ticket}: ${message}`,
            {
              phase: "terminal-plan-poll",
              ticket: submitValue.ticket,
              pollTimeoutMs,
              elapsedMs: Date.now() - startedAt,
              error: message,
            },
          );
        }

        if (!isStillPending(pollValue)) {
          break;
        }

        const remainingMs = pollTimeoutMs - (Date.now() - startedAt);
        if (remainingMs <= 0) {
          break;
        }

        const sleepMs = Math.min(pollIntervalMs, remainingMs);
        await measureAdapterAsync(timings, "terminalPlanPollSleepMs", () =>
          new Promise((resolve) => setTimeout(resolve, sleepMs)),
        );
      }

      if (isStillPending(pollValue)) {
        return buildTerminalDeferredFailure(
          "TERMINAL_DEFERRED_STALLED",
          `terminal.plan.run creó el ticket ${submitValue.ticket}, pero el job siguió pendiente después de ${pollTimeoutMs}ms.`,
          {
            phase: "terminal-plan-poll",
            ticket: submitValue.ticket,
            pollTimeoutMs,
            elapsedMs: Date.now() - startedAt,
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
        evidence: buildTimingsEvidence(finalTimings),
        confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
      };
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

  async function executeTerminalNativeExec(
    plan: TerminalPlan,
    timeoutMs: number,
  ): Promise<TerminalPortResult> {
    const command = String(getSingleVisibleCommand(plan) ?? "").trim();
    const stepTimeoutMs = Number(plan.steps[0]?.timeout ?? timeoutMs ?? defaultTimeout);
    const nativeTimeoutMs = Math.max(stepTimeoutMs, 10000);

    const nativeResult = await bridge.sendCommandAndWait(
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
    );

    let finalTimings: unknown = nativeResult.timings;
    let nativeValue = normalizeBridgeValue(nativeResult);

    if (isDeferredValue(nativeValue)) {
      const ticket = nativeValue.ticket;
      const startedAt = Date.now();
      const pollTimeoutMs = computeDeferredPollTimeoutMs(plan, timeoutMs);
      const pollIntervalMs = 300;
      let pollValue: unknown = null;

      while (Date.now() - startedAt < pollTimeoutMs) {
        try {
          const pollResult = await bridge.sendCommandAndWait(
            "__pollDeferred",
            { ticket },
            Math.max(pollTimeoutMs - (Date.now() - startedAt), 1000),
            { resolveDeferred: false },
          );

          finalTimings = pollResult.timings;
          pollValue = normalizeBridgeValue(pollResult);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error ?? "Unknown poll error");

          return buildTerminalDeferredFailure(
            "TERMINAL_NATIVE_DEFERRED_POLL_TIMEOUT",
            `__pollDeferred no respondió en ${pollTimeoutMs}ms para ticket ${ticket}: ${message}`,
            {
              phase: "terminal-native-poll",
              ticket,
              pollTimeoutMs,
              elapsedMs: Date.now() - startedAt,
              error: message,
            },
          );
        }

        if (!isStillPending(pollValue)) {
          nativeValue = pollValue;
          break;
        }

        const remainingMs = pollTimeoutMs - (Date.now() - startedAt);
        if (remainingMs <= 0) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, remainingMs)));
      }

      if (isStillPending(nativeValue)) {
        return buildTerminalDeferredFailure(
          "TERMINAL_NATIVE_DEFERRED_STALLED",
          `terminal.native.exec creó el ticket ${ticket}, pero el job siguió pendiente después de ${pollTimeoutMs}ms.`,
          {
            phase: "terminal-native-poll",
            ticket,
            pollTimeoutMs,
            elapsedMs: Date.now() - startedAt,
            pollValue: nativeValue,
          },
        );
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
    };
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
    );

    if (shouldUseNativeExec(normalizedPlan)) {
      return finalizeAdapterResult(
        await measureAdapterAsync(timings, "nativeExecMs", () =>
          executeTerminalNativeExec(normalizedPlan, timeoutMs),
        ),
        timings,
        adapterStartedAt,
      );
    }

    const deferredResult = await measureAdapterAsync(timings, "terminalPlanRunMs", () =>
      executeTerminalPlanRun(normalizedPlan, timeoutMs, timings),
    );
    if (deferredResult) {
      return finalizeAdapterResult(deferredResult, timings, adapterStartedAt);
    }

    return finalizeAdapterResult(
      await measureAdapterAsync(timings, "legacyPlanMs", () =>
        executeLegacyPlan(normalizedPlan, timings),
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
