// ============================================================================
// Capability Runner - Ejecutor de capabilities
// ============================================================================

import type {
  CapabilitySpec,
  CapabilityRunResult,
  EnvironmentFingerprint,
  CleanupStatus,
  CapabilitySupportStatus,
  CapabilityAction,
} from "./capability-types.js";
import { getCapability } from "./capability-registry.js";
import { captureFingerprint } from "./environment-fingerprint.js";
import type {
  RuntimePrimitivePort,
  RuntimeTerminalPort,
  RuntimeOmniPort,
  TerminalPlan,
} from "../ports/index.js";
import type { Intent } from "../contracts/intent.js";

export interface CapabilityContext {
  primitivePort: RuntimePrimitivePort;
  terminalPort: RuntimeTerminalPort;
  omniPort: RuntimeOmniPort;
  workflowPlanner?: {
    buildPlan(intent: Intent): Promise<{ id: string; intentId: string; strategy: string; steps: any[] } | null>;
  };
}

function createNoOpCapabilityContext(): CapabilityContext {
  const noOpPort = {
    runPrimitive: async () => ({ ok: false, error: "Puerto no inicializado" }),
    validatePayload: () => false,
    getPrimitiveMetadata: () => null,
  };
  return {
    primitivePort: noOpPort as RuntimePrimitivePort,
    terminalPort: {
      runTerminalPlan: async () => ({ ok: false, output: "", status: 0, promptBefore: "", promptAfter: "", modeBefore: "", modeAfter: "", events: [], warnings: ["Puerto no inicializado"], confidence: 0 }),
      ensureSession: async () => ({ ok: false, error: "Puerto no inicializado" }),
      pollTerminalJob: async () => null,
    },
    omniPort: {
      runOmniCapability: async () => ({ ok: false, error: "Puerto no inicializado", confidence: 0 }),
      describeCapability: () => null,
      cleanupCapability: async () => {},
    },
  };
}

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function runCapability(
  capabilityId: string,
  input: Record<string, unknown> = {},
  context?: CapabilityContext
): Promise<CapabilityRunResult> {
  const startTime = Date.now();
  const runId = generateRunId();
  const environment = captureFingerprint();

  const capability = getCapability(capabilityId);
  if (!capability) {
    return {
      runId,
      capabilityId,
      startedAt: startTime,
      endedAt: Date.now(),
      durationMs: Date.now() - startTime,
      environment,
      ok: false,
      supportStatus: "unsupported",
      warnings: [],
      evidence: {},
      confidence: 0,
      error: `Capability no encontrada: ${capabilityId}`,
      cleanupStatus: "skipped",
    };
  }

  const warnings: string[] = [];
  let cleanupStatus: CleanupStatus = "skipped";
  let cleanupError: string | undefined;

  const evidence: Record<string, unknown> = {};
  let ok = false;
  let error: string | undefined;

  try {
    const executionResult = await executeCapability(capability, input, context);
    evidence.execution = executionResult.evidence;
    ok = executionResult.ok;
    if (executionResult.error) {
      error = executionResult.error;
    }
    warnings.push(...executionResult.warnings);
  } catch (e) {
    error = String(e);
    warnings.push(`Excepción en ejecución: ${error}`);
  }

  try {
    const cleanupResult = await executeCleanup(capability, input);
    cleanupStatus = cleanupResult.ok ? "success" : "partial";
    if (cleanupResult.error) {
      cleanupError = cleanupResult.error;
    }
  } catch (e) {
    cleanupStatus = "failed";
    cleanupError = String(e);
    warnings.push(`Cleanup falló: ${cleanupError}`);
  }

  const endTime = Date.now();
  const confidence = calculateConfidence(ok, evidence, warnings, capability.supportPolicy);

  const supportStatus = classifySupport(
    ok,
    confidence,
    warnings,
    cleanupStatus
  );

  return {
    runId,
    capabilityId,
    startedAt: startTime,
    endedAt: endTime,
    durationMs: endTime - startTime,
    environment,
    ok,
    supportStatus,
    warnings,
    evidence,
    confidence,
    error,
    cleanupStatus,
    cleanupError,
  };
}

async function executeCapability(
  capability: CapabilitySpec,
  input: Record<string, unknown>,
  context?: CapabilityContext
): Promise<{ ok: boolean; evidence: Record<string, unknown>; error?: string; warnings: string[] }> {
  const warnings: string[] = [];
  const ctx = context ?? createNoOpCapabilityContext();

  switch (capability.execute.type) {
    case "primitive": {
      return executePrimitive(capability, input, ctx);
    }
    case "terminal": {
      return executeTerminal(capability, input, ctx);
    }
    case "hack": {
      return executeHack(capability, input, ctx);
    }
    case "workflow": {
      return executeWorkflow(capability, input, ctx);
    }
    default:
      return {
        ok: false,
        evidence: {},
        error: `Tipo de ejecución desconocido: ${(capability.execute as any).type}`,
        warnings,
      };
  }
}

async function executePrimitive(
  capability: CapabilitySpec,
  input: Record<string, unknown>,
  context: CapabilityContext
): Promise<{ ok: boolean; evidence: Record<string, unknown>; error?: string; warnings: string[] }> {
  const primitiveId = capability.execute.handler;
  if (!primitiveId) {
    return { ok: false, evidence: {}, error: "Primitive handler no especificado en capability", warnings: [] };
  }

  try {
    const result = await context.primitivePort.runPrimitive(primitiveId, input);
    return {
      ok: result.ok,
      evidence: result.evidence ?? { value: result.value },
      error: result.error,
      warnings: result.warnings ?? [],
    };
  } catch (e) {
    const error = String(e);
    return { ok: false, evidence: {}, error: `Error en primitivePort.runPrimitive: ${error}`, warnings: [] };
  }
}

async function executeTerminal(
  capability: CapabilitySpec,
  input: Record<string, unknown>,
  context: CapabilityContext
): Promise<{ ok: boolean; evidence: Record<string, unknown>; error?: string; warnings: string[] }> {
  const terminalHandler = capability.execute.handler;
  if (!terminalHandler) {
    return { ok: false, evidence: {}, error: "Terminal handler no especificado en capability", warnings: [] };
  }

  const terminalPlan: TerminalPlan = {
    id: `capability-${capability.id}`,
    device: (input.device as string) ?? (input.target as string) ?? "",
    steps: capability.execute.code
      ? [{ command: capability.execute.code }]
      : [{ command: terminalHandler }],
  };

  if (!terminalPlan.device) {
    return { ok: false, evidence: {}, error: "Device no especificado en input para plan terminal", warnings: [] };
  }

  try {
    const result = await context.terminalPort.runTerminalPlan(terminalPlan);
    return {
      ok: result.ok,
      evidence: { output: result.output, status: result.status, modeAfter: result.modeAfter },
      error: result.ok ? undefined : `Terminal execution failed: ${result.warnings.join(", ")}`,
      warnings: result.warnings,
    };
  } catch (e) {
    const error = String(e);
    return { ok: false, evidence: {}, error: `Error en terminalPort.runTerminalPlan: ${error}`, warnings: [] };
  }
}

async function executeHack(
  capability: CapabilitySpec,
  input: Record<string, unknown>,
  context: CapabilityContext
): Promise<{ ok: boolean; evidence: Record<string, unknown>; error?: string; warnings: string[] }> {
  const hackAdapterId = capability.execute.adapter;
  if (!hackAdapterId) {
    return { ok: false, evidence: {}, error: "Hack adapter no especificado en capability", warnings: [] };
  }

  try {
    const result = await context.omniPort.runOmniCapability(hackAdapterId, input);
    return {
      ok: result.ok,
      evidence: result.evidence ?? { value: result.value },
      error: result.error,
      warnings: result.warnings ?? [],
    };
  } catch (e) {
    const error = String(e);
    return { ok: false, evidence: {}, error: `Error en omniPort.runOmniCapability: ${error}`, warnings: [] };
  }
}

async function executeWorkflow(
  capability: CapabilitySpec,
  input: Record<string, unknown>,
  context: CapabilityContext
): Promise<{ ok: boolean; evidence: Record<string, unknown>; error?: string; warnings: string[] }> {
  const workflowPlanId = capability.execute.plan;
  if (!workflowPlanId) {
    return { ok: false, evidence: {}, error: "Workflow plan no especificado en capability", warnings: [] };
  }

  if (!context.workflowPlanner) {
    return { ok: false, evidence: {}, error: "Workflow planner no disponible en context", warnings: [] };
  }

  const intent: Intent = {
    id: `intent-${Date.now()}`,
    kind: "capability-probe",
    goal: capability.title,
    target: input.device as string | undefined,
    metadata: { capabilityId: capability.id, workflowPlanId },
  };

  try {
    const plan = await context.workflowPlanner.buildPlan(intent);
    if (!plan) {
      return { ok: false, evidence: {}, error: `No se pudo construir plan para workflow: ${workflowPlanId}`, warnings: [] };
    }
    return {
      ok: true,
      evidence: { planId: plan.id, strategy: plan.strategy, stepsCount: plan.steps.length },
      error: undefined,
      warnings: [],
    };
  } catch (e) {
    const error = String(e);
    return { ok: false, evidence: {}, error: `Error en workflow execution: ${error}`, warnings: [] };
  }
}

async function executeCleanup(
  capability: CapabilitySpec,
  input: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  if (capability.cleanup.type === "primitive" && capability.cleanup.handler === "noop") {
    return { ok: true };
  }

  return { ok: true };
}

function calculateConfidence(
  ok: boolean,
  evidence: Record<string, unknown>,
  warnings: string[],
  policy: { minRunsForSupported: number; flakinessThreshold: number; timeoutMs: number }
): number {
  if (!ok) return 0;

  let confidence = 0.8;

  if (Object.keys(evidence).length > 0) {
    confidence += 0.1;
  }

  if (warnings.length === 0) {
    confidence += 0.1;
  }

  return Math.min(1, confidence);
}

function classifySupport(
  ok: boolean,
  confidence: number,
  warnings: string[],
  cleanupStatus: CleanupStatus
): CapabilitySupportStatus {
  if (!ok) {
    return "broken";
  }

  if (cleanupStatus === "failed") {
    return "dangerous";
  }

  if (confidence < 0.5) {
    return "unsupported";
  }

  if (warnings.length > 2) {
    return "partial";
  }

  if (confidence < 0.8) {
    return "partial";
  }

  return "supported";
}

export async function runCapabilityWithTimeout(
  capabilityId: string,
  input: Record<string, unknown> = {},
  timeoutMs: number = 30000,
  context?: CapabilityContext
): Promise<CapabilityRunResult> {
  const capability = getCapability(capabilityId);
  const timeout = capability?.supportPolicy.timeoutMs ?? timeoutMs;

  return Promise.race([
    runCapability(capabilityId, input, context),
    new Promise<CapabilityRunResult>((resolve) =>
      setTimeout(() => {
        resolve({
          runId: `timeout-${Date.now()}`,
          capabilityId,
          startedAt: Date.now() - timeout,
          endedAt: Date.now(),
          durationMs: timeout,
          environment: captureFingerprint(),
          ok: false,
          supportStatus: "flaky",
          warnings: [`Timeout después de ${timeout}ms`],
          evidence: {},
          confidence: 0,
          error: `Timeout: ${timeout}ms excedido`,
          cleanupStatus: "skipped",
        });
      }, timeout)
    ),
  ]);
}