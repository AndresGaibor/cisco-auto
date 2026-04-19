// ============================================================================
// Capability Runner - Ejecutor de capabilities
// ============================================================================

import type {
  CapabilitySpec,
  CapabilityRunResult,
  EnvironmentFingerprint,
  CleanupStatus,
  CapabilitySupportStatus,
} from "./capability-types.js";
import { getCapability } from "./capability-registry.js";
import { captureFingerprint } from "./environment-fingerprint.js";

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function runCapability(
  capabilityId: string,
  input: Record<string, unknown> = {}
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
    const executionResult = await executeCapability(capability, input);
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
  input: Record<string, unknown>
): Promise<{ ok: boolean; evidence: Record<string, unknown>; error?: string; warnings: string[] }> {
  const warnings: string[] = [];

  switch (capability.execute.type) {
    case "primitive": {
      return executePrimitive(capability.execute.handler!, input);
    }
    case "terminal": {
      return executeTerminal(capability.execute.handler!, input);
    }
    case "hack": {
      return executeHack(capability.execute.adapter!, input);
    }
    case "workflow": {
      return executeWorkflow(capability.execute.plan!, input);
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
  handler: string,
  input: Record<string, unknown>
): Promise<{ ok: boolean; evidence: Record<string, unknown>; error?: string; warnings: string[] }> {
  return { ok: false, evidence: {}, error: `Primitive handler no implementado: ${handler}`, warnings: [] };
}

async function executeTerminal(
  handler: string,
  input: Record<string, unknown>
): Promise<{ ok: boolean; evidence: Record<string, unknown>; error?: string; warnings: string[] }> {
  return { ok: false, evidence: {}, error: `Terminal handler no implementado: ${handler}`, warnings: [] };
}

async function executeHack(
  adapter: string,
  input: Record<string, unknown>
): Promise<{ ok: boolean; evidence: Record<string, unknown>; error?: string; warnings: string[] }> {
  return { ok: false, evidence: {}, error: `Hack adapter no implementado: ${adapter}`, warnings: [] };
}

async function executeWorkflow(
  plan: string,
  input: Record<string, unknown>
): Promise<{ ok: boolean; evidence: Record<string, unknown>; error?: string; warnings: string[] }> {
  return { ok: false, evidence: {}, error: `Workflow plan no implementado: ${plan}`, warnings: [] };
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
  timeoutMs: number = 30000
): Promise<CapabilityRunResult> {
  const capability = getCapability(capabilityId);
  const timeout = capability?.supportPolicy.timeoutMs ?? timeoutMs;

  return Promise.race([
    runCapability(capabilityId, input),
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