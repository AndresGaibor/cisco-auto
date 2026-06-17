// TODO: fix-import - RuntimeApi reubicado desde pt-runtime
import type { RuntimeApi, RuntimeResult, DeferredJobPlan } from "./runtime-contracts.js";
import { createDeferredResult, createErrorResult } from "../results/result-factories.js";

interface TerminalPlanRunPayload {
  type: "terminal.plan.run";
  plan?: {
    id?: string;
    device?: string;
    targetMode?: string;
    steps?: Array<{
      kind?: string;
      command?: string;
      expectMode?: string;
      expectPromptPattern?: string;
      allowPager?: boolean;
      allowConfirm?: boolean;
      optional?: boolean;
      timeout?: number;
      metadata?: Record<string, unknown>;
    }>;
    timeouts?: {
      commandTimeoutMs?: number;
      stallTimeoutMs?: number;
    };
    policies?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
  options?: {
    timeoutMs?: number;
    stallTimeoutMs?: number;
  };
  resolveDeferred?: boolean;
  waitForCompletion?: boolean;
  inlineTimeoutMs?: number;
}

function inferSessionKind(plan: NonNullable<TerminalPlanRunPayload["plan"]>): "ios" | "host" {
  const deviceKind = String(((plan.metadata && (plan.metadata as { deviceKind?: unknown }).deviceKind) ?? "")).trim().toLowerCase();

  if (deviceKind === "host") {
    return "host";
  }

  const targetMode = String(plan.targetMode ?? "").trim().toLowerCase();
  if (targetMode === "host-prompt" || targetMode === "host-busy") {
    return "host";
  }

  return "ios";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function normalizeStep(step: any, sessionKind: "ios" | "host"): any {
  var kind = String(step.kind || "command");

  if (kind === "ensureMode") kind = "ensure-mode";
  if (kind === "expectPrompt") kind = "expect-prompt";
  if (kind === "saveConfig") kind = "save-config";
  if (kind === "closeSession") kind = "close-session";

  const timeoutMs = Number(step.timeout || 0) || undefined;

  return {
    type: kind,
    kind: kind,
    value: String(step.command || step.expectMode || step.expectPromptPattern || ""),
    command: step.command ? String(step.command) : undefined,
    expectMode: step.expectMode ? String(step.expectMode) : undefined,
    expectPromptPattern: step.expectPromptPattern ? String(step.expectPromptPattern) : undefined,
    allowPager: step.allowPager !== false,
    allowConfirm: step.allowConfirm === true,
    optional: step.optional === true,
    timeoutMs,
    options: {
      timeoutMs,
      expectedPrompt: step.expectPromptPattern ? String(step.expectPromptPattern) : undefined,
    },
    metadata: {
      ...(isObject(step.metadata) ? step.metadata : {}),
      sessionKind,
    },
  };
}

function buildDeferredPlan(payload: TerminalPlanRunPayload, api: RuntimeApi): DeferredJobPlan | null {
  var plan = payload.plan;

  if (!plan || !String(plan.device || "").trim()) {
    return null;
  }

  var steps = Array.isArray(plan.steps) ? plan.steps : [];
  if (!Array.isArray(plan.steps)) {
    return null;
  }

  var sessionKind = inferSessionKind(plan as NonNullable<TerminalPlanRunPayload["plan"]>);

  var id = String(plan.id || "");
  if (!id) {
    id = "terminal_plan_" + String(api.now()) + "_" + String(Math.floor(Math.random() * 100000));
  }

  return {
    id: id,
    kind: "ios-session",
    version: 1,
    device: String(plan.device),
    plan: steps.map(function (step) {
      return normalizeStep(step, sessionKind);
    }),
    options: {
      stopOnError: true,
      commandTimeoutMs: Number(plan.timeouts?.commandTimeoutMs || payload.options?.timeoutMs || 30000),
      stallTimeoutMs: Number(plan.timeouts?.stallTimeoutMs || payload.options?.stallTimeoutMs || 15000),
    },
    payload: {
      source: "terminal.plan.run",
      metadata: {
        ...(isObject(plan.metadata) ? plan.metadata : {}),
        sessionKind,
      },
      policies: isObject(plan.policies) ? plan.policies : {},
    },
  } as unknown as DeferredJobPlan;
}

export function handleTerminalPlanRun(
  payload: TerminalPlanRunPayload,
  api: RuntimeApi,
): RuntimeResult {
  var deferredPlan = buildDeferredPlan(payload, api);

  if (!deferredPlan) {
    return createErrorResult("terminal.plan.run requiere plan.device y plan.steps", "INVALID_TERMINAL_PLAN");
  }

  if (!api || typeof api.createJob !== "function") {
    return createErrorResult(
      "terminal.plan.run requiere RuntimeApi.createJob para registrar el job diferido",
      "RUNTIME_API_MISSING_CREATE_JOB",
      {
        details: { job: deferredPlan },
      } as any,
    );
  }

  var ticket = String(api.createJob(deferredPlan) || deferredPlan.id || payload.plan?.id || "terminal_plan");
  deferredPlan.id = ticket;

  var inlineResult = tryInlineDrainJob(ticket, payload, api);
  if (inlineResult) {
    return inlineResult;
  }

  if (typeof api.advanceJob === "function") {
    api.advanceJob(ticket);
  }

  return createDeferredResult(ticket, deferredPlan);
}

function isCompletedState(state: any): boolean {
  if (!state) return false;
  return (
    state.state === "completed" ||
    state.status === "completed" ||
    state.phase === "completed" ||
    state.finished === true
  );
}

function isFailedState(state: any): boolean {
  if (!state) return false;
  return (
    state.state === "error" ||
    state.status === "error" ||
    state.phase === "error" ||
    !!state.error ||
    !!state.errorCode
  );
}

function clampInlineTimeoutMs(value: unknown): number {
  var parsed = Number(value);
  if (!isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(Math.trunc(parsed), 1_200));
}

function getInlineMaxAdvances(value: unknown): number {
  var parsed = Number(value);
  if (!isFinite(parsed) || parsed <= 0) {
    return 6;
  }
  return Math.max(1, Math.min(Math.trunc(parsed), 10));
}

function nowSafe(api: RuntimeApi): number {
  try {
    if (api && typeof api.now === "function") {
      return Number(api.now()) || Date.now();
    }
  } catch {}
  return Date.now();
}

function tryInlineDrainJob(
  ticket: string,
  payload: TerminalPlanRunPayload,
  api: RuntimeApi,
): RuntimeResult | null {
  if (payload.waitForCompletion !== true) {
    return null;
  }
  if (typeof api.getJobState !== "function") {
    return null;
  }

  var budgetMs = clampInlineTimeoutMs(payload.inlineTimeoutMs ?? 1_200);
  var maxAdvances = getInlineMaxAdvances((payload as any).inlineMaxAdvances);
  var startedAt = nowSafe(api);

  for (var index = 0; index < maxAdvances; index += 1) {
    if (typeof api.advanceJob === "function") {
      api.advanceJob(ticket);
    }

    var state = api.getJobState(ticket);

    if (state && (isCompletedState(state) || isFailedState(state))) {
      return mapJobStateToInlineResult(state, ticket);
    }

    if (budgetMs <= 0) {
      break;
    }

    if (nowSafe(api) - startedAt >= budgetMs) {
      break;
    }
  }

  return null;
}

function mapJobStateToInlineResult(state: any, ticket: string): RuntimeResult {
  var ok = !state.error && !state.errorCode;
  var output = state.output || state.outputBuffer || state.raw || "";
  var status = 0;

  if (state.result) {
    if (typeof state.result.status === "number") status = state.result.status;
    if (typeof state.result.ok === "boolean") ok = state.result.ok;
    if (state.result.raw) output = state.result.raw;
  }

  if (state.state === "error" || state.status === "error" || state.phase === "error") {
    ok = false;
    status = 1;
  }

  return {
    ok: ok,
    status: ok ? "completed" : "failed",
    inlineCompleted: true,
    ticket: ticket,
    jobId: ticket,
    output: String(output),
    raw: String(output),
    error: state.error || state.result?.error || undefined,
    code: state.errorCode || state.result?.code || state.result?.errorCode || undefined,
    errorCode: state.errorCode || state.result?.code || state.result?.errorCode || undefined,
    session: {
      mode: String(state.lastMode ?? state.lastSession?.mode ?? ""),
      prompt: String(state.lastPrompt ?? state.lastSession?.prompt ?? ""),
      paging: state.paged === true,
      awaitingConfirm: false,
    },
  } as any;
}
