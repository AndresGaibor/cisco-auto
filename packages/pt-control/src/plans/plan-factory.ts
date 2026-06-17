// TODO: fix-import - PtResult y tipos de runtime/contracts reubicados desde pt-runtime
// Definir stubs locales para evitar dependencias de pt-runtime en pt-control
import type { PtResult } from "../pt-api/pt-results.js";
import type {
  DeferredJobPlan,
  DeferredStep,
  RuntimeApi,
} from "./runtime-contracts.js";
import { createDeferredResult, createErrorResult } from "../results/result-factories.js";

export interface DeferredPlanOptions {
  stopOnError: boolean;
  commandTimeoutMs: number;
  stallTimeoutMs: number;
  closeSession?: boolean;
}

export interface CommandPlanOptions extends DeferredPlanOptions {
  command: string;
  ensurePrivileged: boolean;
  sessionKind?: "ios" | "host";
  source?: string;
}

export interface ConfigPlanOptions extends DeferredPlanOptions {
  commands: string[];
  save: boolean;
  ensurePrivileged: boolean;
  dismissInitialDialog: boolean;
  source?: string;
}

function normalizeDeferredCommand(value: unknown): string {
  return String(value == null ? "" : value).replace(/^\s+|\s+$/g, "");
}

function safeRuntimeNow(api: RuntimeApi): number {
  try {
    if (api && typeof (api as any).now === "function") {
      const value = Number((api as any).now());
      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
  } catch {}

  return Date.now();
}

function sanitizeDeferredJobIdPart(value: unknown): string {
  const raw = String(value ?? "").trim();

  const normalized = raw
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "deferred_job";
}

function createDeferredJobId(plan: DeferredJobPlan, api: RuntimeApi): string {
  const source = sanitizeDeferredJobIdPart(
    (plan.payload as any)?.source || plan.kind || "deferred_job",
  );

  const now = safeRuntimeNow(api);
  const random = Math.floor(Math.random() * 100000);

  return `${source}_${now}_${random}`;
}

function ensureDeferredJobId(plan: DeferredJobPlan, api: RuntimeApi): string {
  const existing = String(plan.id || "").trim();

  if (existing) {
    plan.id = existing;
    return existing;
  }

  const generated = createDeferredJobId(plan, api);
  plan.id = generated;
  return generated;
}

function buildCommandStep(
  command: string,
  options: {
    stopOnError: boolean;
    timeoutMs: number;
    source: string;
    sessionKind: "ios" | "host";
  },
): DeferredStep {
  return {
    type: "command",
    value: command,
    options: {
      stopOnError: options.stopOnError,
      timeoutMs: options.timeoutMs,
    },
    metadata: {
      source: options.source,
      sessionKind: options.sessionKind,
    },
  } as unknown as DeferredStep;
}

function sanitizeConfigCommands(commands: string[]): string[] {
  const result: string[] = [];

  for (let i = 0; i < commands.length; i++) {
    const command = normalizeDeferredCommand(commands[i]);
    const lower = command.toLowerCase();

    if (!command) continue;
    if (/^(configure terminal|conf t|config terminal)$/.test(lower)) continue;
    if (/^(end|\^z)$/.test(lower)) continue;

    result.push(command);
  }

  return result;
}

export function buildDeferredCommandPlan(
  device: string,
  options: CommandPlanOptions,
): DeferredJobPlan {
  const command = normalizeDeferredCommand(options.command);
  const sessionKind = options.sessionKind || "ios";
  const source = options.source || "legacy-command";
  const plan: DeferredStep[] = [];

  if (options.ensurePrivileged && sessionKind === "ios") {
    plan.push({
      type: "ensure-mode",
      value: "privileged-exec",
      options: { stopOnError: true },
      metadata: { source, sessionKind },
    } as unknown as DeferredStep);
  }

  plan.push(
    buildCommandStep(command, {
      stopOnError: options.stopOnError,
      timeoutMs: options.commandTimeoutMs,
      source,
      sessionKind,
    }),
  );

  if (options.closeSession === true) {
    plan.push({ type: "close-session" } as unknown as DeferredStep);
  }

  return {
    id: "",
    kind: "ios-session",
    version: 1,
    device,
    plan,
    options: {
      stopOnError: options.stopOnError,
      commandTimeoutMs: options.commandTimeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
    },
    payload: {
      command,
      source,
      metadata: { sessionKind },
    },
  };
}

export function buildDeferredConfigPlan(
  device: string,
  options: ConfigPlanOptions,
): DeferredJobPlan {
  const source = options.source || "legacy-config";
  const commands = sanitizeConfigCommands(options.commands);
  const plan: DeferredStep[] = [];

  if (options.ensurePrivileged) {
    plan.push({
      type: "ensure-mode",
      value: "privileged-exec",
      options: { stopOnError: true },
      metadata: { source, sessionKind: "ios" },
    } as unknown as DeferredStep);
  }

  if (options.dismissInitialDialog) {
    plan.push({
      type: "command",
      value: "",
      options: { stopOnError: false, timeoutMs: options.commandTimeoutMs },
      metadata: { source, sessionKind: "ios", reason: "dismiss-initial-dialog" },
    } as unknown as DeferredStep);

    plan.push({
      type: "confirm",
      value: "n",
      options: { stopOnError: false, timeoutMs: options.commandTimeoutMs },
      metadata: { source, sessionKind: "ios", reason: "dismiss-initial-dialog" },
    } as unknown as DeferredStep);
  }

  plan.push(
    buildCommandStep("configure terminal", {
      stopOnError: true,
      timeoutMs: options.commandTimeoutMs,
      source,
      sessionKind: "ios",
    }),
  );

  for (let i = 0; i < commands.length; i++) {
    plan.push(
      buildCommandStep(commands[i], {
        stopOnError: options.stopOnError,
        timeoutMs: options.commandTimeoutMs,
        source,
        sessionKind: "ios",
      }),
    );
  }

  plan.push(
    buildCommandStep("end", {
      stopOnError: true,
      timeoutMs: options.commandTimeoutMs,
      source,
      sessionKind: "ios",
    }),
  );

  if (options.save) {
    plan.push({
      type: "save-config",
      value: "write memory",
      options: { stopOnError: false, timeoutMs: options.commandTimeoutMs },
      metadata: { source, sessionKind: "ios" },
    } as unknown as DeferredStep);
  }

  if (options.closeSession === true) {
    plan.push({ type: "close-session" } as unknown as DeferredStep);
  }

  return {
    id: "",
    kind: "ios-session",
    version: 1,
    device,
    plan,
    options: {
      stopOnError: options.stopOnError,
      commandTimeoutMs: options.commandTimeoutMs,
      stallTimeoutMs: options.stallTimeoutMs,
    },
    payload: {
      commands,
      save: options.save,
      source,
      metadata: { sessionKind: "ios" },
    },
  };
}

export function startDeferredJobOrError(
  plan: DeferredJobPlan,
  api: RuntimeApi,
): PtResult {
  if (!plan || !plan.device || !plan.plan || plan.plan.length === 0) {
    return createErrorResult(
      "Invalid deferred job plan: missing device or empty plan",
      "INVALID_PLAN",
    );
  }

  if (!api || typeof api.createJob !== "function") {
    return createErrorResult(
      "RuntimeApi.createJob no está disponible",
      "RUNTIME_API_MISSING_CREATE_JOB",
    );
  }

  try {
    const deviceRef = typeof api.getDeviceByName === "function"
      ? api.getDeviceByName(plan.device)
      : null;

    if (!deviceRef) {
      return createErrorResult(
        `Device not found: ${plan.device}`,
        "DEVICE_NOT_FOUND",
      );
    }
  } catch {
    return createErrorResult(
      `Device not found: ${plan.device}`,
      "DEVICE_NOT_FOUND",
    );
  }

  try {
    const ensuredPlanId = ensureDeferredJobId(plan, api);
    const createdTicket = api.createJob(plan);
    const ticket = String(createdTicket || ensuredPlanId || plan.id || "").trim();

    if (!ticket) {
      return createErrorResult(
        "RuntimeApi.createJob returned an empty ticket",
        "JOB_START_EMPTY_TICKET",
        {
          details: {
            planId: plan.id,
            device: plan.device,
            kind: plan.kind,
          },
        } as any,
      );
    }

    plan.id = ticket;

    return createDeferredResult(ticket, plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return createErrorResult(
      `Failed to start deferred job: ${message}`,
      "JOB_START_ERROR",
    );
  }
}
