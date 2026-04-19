// Orquestador principal - Coordina ejecución de intents
// Patrón: Intent → Plan → Execution → Evidence → Verdict

import type { Intent } from "../../contracts/intent";
import type { ExecutionPlan, ExecutionStep } from "../../contracts/plan";
import type { ExecutionEvidence } from "../../contracts/evidence";
import type { ExecutionVerdict, VerdictStatus } from "../../contracts/verdict";
import type { FileBridgePort } from "../ports/file-bridge.port.js";
import {
  createPrimitivePort,
  createTerminalPort,
  createOmniPort,
  type RuntimePrimitivePort,
  type RuntimeTerminalPort,
  type RuntimeOmniPort,
} from "../../ports";
import type { Planner } from "../planners/types";
import type { Verifier } from "../verification/types";
import type { Diagnoser } from "../diagnosis/types";
import type { FallbackPolicy } from "../fallback/types";

export interface OrchestratorConfig {
  defaultTimeout: number;
  maxRetries: number;
  enableFallback: boolean;
}

export interface OrchestratorContext {
  primitivePort: RuntimePrimitivePort;
  terminalPort: RuntimeTerminalPort;
  omniPort: RuntimeOmniPort;
  planner: Planner;
  verifier: Verifier;
  diagnoser: Diagnoser;
  fallbackPolicy: FallbackPolicy;
}

export function createOrchestrator(config: OrchestratorConfig, bridge: FileBridgePort): OrchestratorContext {
  return {
    primitivePort: createPrimitivePort({ bridge, defaultTimeout: config.defaultTimeout }),
    terminalPort: createTerminalPort({ bridge, defaultTimeout: config.defaultTimeout }),
    omniPort: createOmniPort({ bridge }),
    planner: createDefaultPlanner(),
    verifier: createDefaultVerifier(),
    diagnoser: createDefaultDiagnoser(),
    fallbackPolicy: createDefaultFallbackPolicy(),
  };
}

export async function executeIntent(
  orchestrator: OrchestratorContext,
  intent: Intent
): Promise<ExecutionVerdict> {
  const plan = await orchestrator.planner.buildPlan(intent);

  if (!plan) {
    return {
      ok: false,
      status: "failed",
      goalSatisfied: false,
      partial: false,
      reason: "No se pudo construir plan para la intención",
      warnings: [],
      evidence: createEmptyEvidence(),
      confidence: 0,
    };
  }

  const evidence = await executePlan(orchestrator, plan);
  const verdict = await orchestrator.verifier.verify(evidence, plan.successCriteria);

  return verdict;
}

async function executePlan(
  orchestrator: OrchestratorContext,
  plan: ExecutionPlan
): Promise<ExecutionEvidence> {
  const runtimeResults: Record<string, unknown>[] = [];
  const terminalResults: Record<string, unknown>[] = [];
  const omniResults: Record<string, unknown>[] = [];
  const warnings: string[] = [];

  for (const step of plan.steps) {
    try {
      switch (step.kind) {
        case "primitive": {
          const result = await orchestrator.primitivePort.runPrimitive(
            step.runtimePrimitiveId!,
            step.payload
          );
          runtimeResults.push({ stepId: step.id, ...result });
          if (!result.ok && !step.optional) {
            warnings.push(`Step ${step.id} failed: ${result.error}`);
          }
          break;
        }
        case "terminal-plan": {
          const result = await orchestrator.terminalPort.runTerminalPlan(step.terminalPlan!);
          terminalResults.push({ stepId: step.id, ...result });
          if (!result.ok && !step.optional) {
            warnings.push(`Step ${step.id} failed`);
          }
          break;
        }
        case "omni-capability": {
          const result = await orchestrator.omniPort.runOmniCapability(
            step.omniCapabilityId!,
            step.payload
          );
          omniResults.push({ stepId: step.id, ...result });
          if (!result.ok && !step.optional) {
            warnings.push(`Step ${step.id} failed: ${result.error}`);
          }
          break;
        }
      }
    } catch (e) {
      warnings.push(`Step ${step.id} threw: ${String(e)}`);
    }
  }

  return {
    rawRuntimeResults: runtimeResults,
    rawTerminalResults: terminalResults,
    rawOmniResults: omniResults,
    snapshotsBeforeAfter: [],
    normalizedFacts: [],
    warnings,
    anomalies: [],
    confidenceInputs: { stepsCount: plan.steps.length },
  };
}

function createEmptyEvidence(): ExecutionEvidence {
  return {
    rawRuntimeResults: [],
    rawTerminalResults: [],
    rawOmniResults: [],
    snapshotsBeforeAfter: [],
    normalizedFacts: [],
    warnings: [],
    anomalies: [],
    confidenceInputs: {},
  };
}

function createDefaultPlanner(): Planner {
  return {
    buildPlan: async (intent: Intent) => {
      return {
        id: `plan-${intent.id}`,
        intentId: intent.id,
        strategy: "default",
        steps: [],
      };
    },
  };
}

function createDefaultVerifier(): Verifier {
  return {
    verify: async (evidence: ExecutionEvidence, criteria: any) => {
      const hasFailures =
        evidence.rawRuntimeResults.some((r: any) => !r.ok) ||
        evidence.rawTerminalResults.some((r: any) => !r.ok) ||
        evidence.rawOmniResults.some((r: any) => !r.ok);

      const status: VerdictStatus = hasFailures ? "failed" : "success";

      return {
        ok: !hasFailures,
        status,
        goalSatisfied: !hasFailures,
        partial: false,
        reason: hasFailures ? "Verification failed" : "Success",
        warnings: evidence.warnings,
        evidence,
        confidence: hasFailures ? 0.5 : 1,
      };
    },
  };
}

function createDefaultDiagnoser(): Diagnoser {
  return {
    diagnose: async (evidence: ExecutionEvidence) => {
      const failures = evidence.warnings.map((w) => ({
        type: "unknown" as const,
        message: w,
      }));
      return { failures, rootCause: failures[0]?.message };
    },
  };
}

function createDefaultFallbackPolicy(): FallbackPolicy {
  return {
    selectStrategy: async (intent: Intent, previousResult: any) => {
      return "primitive";
    },
    shouldRetry: (attempt: number, error: any) => attempt < 3,
  };
}