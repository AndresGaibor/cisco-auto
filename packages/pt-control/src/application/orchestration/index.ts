import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type { RuntimeTerminalPort } from "../../ports/runtime-terminal-port.js";
import type { RuntimeOmniPort } from "../../ports/runtime-omni-port.js";
import type { PostVerificationSpec } from "../services/ios-post-verification.js";
import type {
  ScenarioEndToEndSpec,
} from "../services/scenario-end-to-end-verification-service.js";
import { PostVerificationRunner } from "./post-verification-runner.js";

export interface ExecutionIntent {
  id: string;
  kind: string;
  goal: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionEvidence {
  rawRuntimeResults: unknown[];
  rawTerminalResults: unknown[];
  rawOmniResults: unknown[];
  warnings: string[];
  anomalies: string[];
  normalizedFacts: Record<string, unknown>;
  postVerification?: unknown;
  scenarioVerification?: unknown;
}

export interface ExecutionVerdict {
  ok: boolean;
  status: "success" | "partial" | "failed";
  goalSatisfied: boolean;
  partial?: boolean;
  reason?: string;
  warnings: string[];
  evidence: ExecutionEvidence;
  confidence: number;
  nextActions?: string[];
}

export interface ExecutionStep {
  kind: "primitive" | "terminal-plan" | "omni-capability";
  id?: string;
  payload?: Record<string, unknown>;
  plan?: unknown;
  optional?: boolean;
}

export interface ExecutionPlan {
  id: string;
  intentId: string;
  strategy: string;
  steps: ExecutionStep[];
  metadata?: {
    postVerification?: {
      device: string;
      checks: PostVerificationSpec[];
    };
    scenarioVerification?: ScenarioEndToEndSpec;
  };
}

export interface Planner {
  buildPlan(intent: ExecutionIntent): Promise<ExecutionPlan>;
}

export interface OrchestratorDeps {
  primitivePort: RuntimePrimitivePort;
  terminalPort: RuntimeTerminalPort;
  omniPort: RuntimeOmniPort;
  planner: Planner;
  postVerificationRunner: PostVerificationRunner;
}

export type OrchestratorContext = OrchestratorDeps;

export class Orchestrator {
  constructor(private readonly deps: OrchestratorDeps) {}

  async executeIntent(intent: ExecutionIntent): Promise<ExecutionVerdict> {
    const plan = await this.deps.planner.buildPlan(intent);

    const evidence: ExecutionEvidence = {
      rawRuntimeResults: [],
      rawTerminalResults: [],
      rawOmniResults: [],
      warnings: [],
      anomalies: [],
      normalizedFacts: {
        strategy: plan.strategy,
        planId: plan.id,
        stepCount: plan.steps.length,
      },
    };

    for (const step of plan.steps) {
      try {
        if (step.kind === "primitive" && step.id) {
          const result = await this.deps.primitivePort.runPrimitive(
            step.id,
            step.payload ?? {},
            {},
          );
          evidence.rawRuntimeResults.push(result);

          if (!result.ok && !step.optional) {
            return {
              ok: false,
              status: "failed",
              goalSatisfied: false,
              reason: `Primitive step failed: ${step.id}`,
              warnings: evidence.warnings,
              evidence,
              confidence: 0.4,
            };
          }
        }

        if (step.kind === "terminal-plan" && step.plan) {
          const result = await this.deps.terminalPort.runTerminalPlan(step.plan as any, {});
          evidence.rawTerminalResults.push(result);

          if (!result.ok && !step.optional) {
            return {
              ok: false,
              status: "failed",
              goalSatisfied: false,
              reason: "Terminal plan step failed",
              warnings: evidence.warnings.concat(result.warnings ?? []),
              evidence,
              confidence: 0.4,
            };
          }
        }

        if (step.kind === "omni-capability" && step.id) {
          const result = await this.deps.omniPort.runOmniCapability(
            step.id,
            step.payload ?? {},
            {},
          );
          evidence.rawOmniResults.push(result);

          if (!result.ok && !step.optional) {
            return {
              ok: false,
              status: "failed",
              goalSatisfied: false,
              reason: `Omni capability failed: ${step.id}`,
              warnings: evidence.warnings.concat(result.warnings ?? []),
              evidence,
              confidence: 0.4,
            };
          }
        }
      } catch (e) {
        if (!step.optional) {
          return {
            ok: false,
            status: "failed",
            goalSatisfied: false,
            reason: `Execution step crashed: ${String(e)}`,
            warnings: evidence.warnings,
            evidence,
            confidence: 0.2,
          };
        }
        evidence.warnings.push(`Optional step failed: ${String(e)}`);
      }
    }

    if (plan.metadata?.postVerification || plan.metadata?.scenarioVerification) {
      const pv = await this.deps.postVerificationRunner.run({
        device: plan.metadata?.postVerification?.device,
        postChecks: plan.metadata?.postVerification?.checks,
        scenario: plan.metadata?.scenarioVerification,
      });

      evidence.warnings.push(...pv.warnings);
      if (pv.postVerification) evidence.postVerification = pv.postVerification;
      if (pv.scenarioVerification) evidence.scenarioVerification = pv.scenarioVerification;

      if (!pv.ok) {
        return {
          ok: false,
          status: "failed",
          goalSatisfied: false,
          reason: pv.error ?? "Post-verification failed",
          warnings: evidence.warnings,
          evidence,
          confidence: 0.6,
        };
      }
    }

    return {
      ok: true,
      status: "success",
      goalSatisfied: true,
      warnings: evidence.warnings,
      evidence,
      confidence: 0.95,
    };
  }
}

export async function executeIntent(
  orchestrator: OrchestratorDeps,
  intent: ExecutionIntent,
): Promise<ExecutionVerdict> {
  return new Orchestrator(orchestrator).executeIntent(intent);
}