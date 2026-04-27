import type { RuntimeApi, RuntimeResult, DeferredJobPlan } from "../runtime/contracts.js";
import { createDeferredResult, createErrorResult } from "./result-factories.js";

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
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function normalizeStep(step: any): any {
  var kind = String(step.kind || "command");

  if (kind === "ensureMode") kind = "ensure-mode";
  if (kind === "expectPrompt") kind = "expect-prompt";
  if (kind === "saveConfig") kind = "save-config";
  if (kind === "closeSession") kind = "close-session";

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
    timeoutMs: Number(step.timeout || 0) || undefined,
    metadata: isObject(step.metadata) ? step.metadata : {},
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

  var id = String(plan.id || "");
  if (!id) {
    id = "terminal_plan_" + String(api.now()) + "_" + String(Math.floor(Math.random() * 100000));
  }

  return {
    id: id,
    kind: "ios-session",
    version: 1,
    device: String(plan.device),
    plan: steps.map(normalizeStep),
    options: {
      stopOnError: true,
      commandTimeoutMs: Number(plan.timeouts?.commandTimeoutMs || payload.options?.timeoutMs || 30000),
      stallTimeoutMs: Number(plan.timeouts?.stallTimeoutMs || payload.options?.stallTimeoutMs || 15000),
    },
    payload: {
      source: "terminal.plan.run",
      metadata: isObject(plan.metadata) ? plan.metadata : {},
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

  var ticket = api.createJob(deferredPlan);

  return createDeferredResult(ticket, deferredPlan);
}
