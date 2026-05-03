import type { RuntimeApi, RuntimeResult, DeferredJobPlan } from "../runtime/contracts.js";
import { createDeferredResult, createErrorResult } from "./result-factories.js";

interface NativeExecPayload {
  type?: "terminal.native.exec";
  device?: string;
  command?: string;
  timeoutMs?: number;
  stallTimeoutMs?: number;
  maxPagerAdvances?: number;
  stableSamples?: number;
  sampleDelayMs?: number;
  ensurePrivileged?: boolean;
  expectedMode?: string;
  expectedPromptPattern?: string;
  allowPager?: boolean;
  allowConfirm?: boolean;
  sessionKind?: string;
}

function isTerminalNativeObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function normalizeCommand(value: unknown): string {
  return String(value == null ? "" : value).replace(/^\s+|\s+$/g, "");
}

function commandLooksPrivileged(command: string): boolean {
  const cmd = command.replace(/\s+/g, " ").toLowerCase();

  return (
    /^show running-config\b/.test(cmd) ||
    /^show startup-config\b/.test(cmd) ||
    /^show archive\b/.test(cmd) ||
    /^show tech-support\b/.test(cmd) ||
    /^write\b/.test(cmd) ||
    /^copy\b/.test(cmd) ||
    /^erase\b/.test(cmd) ||
    /^reload\b/.test(cmd) ||
    /^clear\b/.test(cmd) ||
    /^debug\b/.test(cmd) ||
    /^undebug\b/.test(cmd)
  );
}

function buildNativeExecDeferredPlan(payload: NativeExecPayload, api: RuntimeApi): DeferredJobPlan | null {
  const device = String(payload.device || "").trim();
  const command = normalizeCommand(payload.command);

  if (!device || !command) {
    return null;
  }

  const commandTimeoutMs = Number(payload.timeoutMs || 0) || 30000;
  const stallTimeoutMs = Number(payload.stallTimeoutMs || 0) || 15000;
  const maxPagerAdvances = Number(payload.maxPagerAdvances || 0) || 50;

  const ensurePrivileged =
    payload.ensurePrivileged === true ||
    commandLooksPrivileged(command) ||
    payload.expectedMode === "privileged-exec";

  const steps: Array<Record<string, unknown>> = [];

  if (ensurePrivileged) {
    steps.push({
      type: "ensure-mode",
      kind: "ensure-mode",
      value: "privileged-exec",
      expectMode: "privileged-exec",
      allowPager: true,
      allowConfirm: false,
      optional: false,
      timeoutMs: commandTimeoutMs,
      options: {
        timeoutMs: commandTimeoutMs,
      },
      metadata: {
        source: "terminal.native.exec",
        reason: "ensure privileged before native command",
      },
    });
  }

  steps.push({
    type: "command",
    kind: "command",
    value: command,
    command,
    expectMode: payload.expectedMode,
    expectPromptPattern: payload.expectedPromptPattern,
    allowPager: payload.allowPager !== false,
    allowConfirm: payload.allowConfirm === true,
    optional: false,
    timeoutMs: commandTimeoutMs,
    options: {
      timeoutMs: commandTimeoutMs,
      expectedPrompt: payload.expectedPromptPattern,
      maxPagerAdvances,
    },
    metadata: {
      source: "terminal.native.exec",
      sessionKind: payload.sessionKind || "ios",
      stableSamples: payload.stableSamples,
      sampleDelayMs: payload.sampleDelayMs,
    },
  });

  const id =
    "terminal_native_exec_" +
    String(api.now ? api.now() : Date.now()) +
    "_" +
    String(Math.floor(Math.random() * 100000));

  return {
    id,
    kind: "ios-session",
    version: 1,
    device,
    plan: steps as any,
    options: {
      stopOnError: true,
      commandTimeoutMs,
      stallTimeoutMs,
    },
    payload: {
      source: "terminal.native.exec",
      command,
      metadata: {
        maxPagerAdvances,
        stableSamples: payload.stableSamples,
        sampleDelayMs: payload.sampleDelayMs,
        sessionKind: payload.sessionKind || "ios",
      },
    },
  } as unknown as DeferredJobPlan;
}

/**
 * Compatibility handler for pt cmd's terminal.native.exec path.
 *
 * IMPORTANT:
 * Packet Tracer runtime handlers must be synchronous. This handler used to be
 * async and returned a Promise, which the dispatcher correctly rejects with
 * ASYNC_HANDLER_NOT_SUPPORTED.
 *
 * Long terminal work must be represented as a deferred job. The kernel owns
 * asynchronous command execution through its job engine.
 */
export function handleTerminalNativeExec(
  payload: NativeExecPayload,
  api: RuntimeApi,
): RuntimeResult {
  const plan = buildNativeExecDeferredPlan(payload, api);

  if (!plan) {
    return createErrorResult(
      "terminal.native.exec requiere device y command",
      "INVALID_TERMINAL_NATIVE_EXEC",
    );
  }

  if (!api || typeof api.createJob !== "function") {
    return createErrorResult(
      "terminal.native.exec requiere RuntimeApi.createJob para registrar el job diferido",
      "RUNTIME_API_MISSING_CREATE_JOB",
      {
        details: { job: plan },
      } as any,
    );
  }

  const ticket = String(api.createJob(plan) || plan.id || "terminal_native_exec");
  plan.id = ticket;

  return createDeferredResult(ticket, plan);
}