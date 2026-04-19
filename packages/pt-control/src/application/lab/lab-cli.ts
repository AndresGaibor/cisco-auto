// LabCLI - Punto de entrada unificado para comandos lab declarativos
// Fase 9: CLI de comandos declarativos

import type { LabSpec } from "../../contracts/lab-spec.js";
import type { LabCheckSpec } from "../../contracts/lab-spec.js";
import type { LabPlan } from "./lab-plan-types.js";
import type { PlanExecutionState } from "./lab-plan-persistence.js";
import { LabDiffEngine } from "./lab-diff.js";
import { LabPlanner } from "./lab-planner.js";
import { LabExecutor } from "./lab-executor.js";
import { LabReconciler } from "./lab-reconciler.js";
import { LabRuntimeManager } from "./lab-runtime-manager.js";
import { LabPlanPersistence } from "./lab-plan-persistence.js";
import type { VerificationReport } from "./lab-verifier.js";
import { PTSafeValidator } from "./pt-safe-validator.js";

export interface LabCLIConfig {
  devDir: string;
  stateDir: string;
  autoVerify: boolean;
  autoSave: boolean;
  verbose: boolean;
}

export interface PlanResult {
  plan: LabPlan;
  diffSummary: {
    devicesToCreate: number;
    devicesToRemove: number;
    linksToCreate: number;
    linksToRemove: number;
    configChanges: number;
  };
}

export interface ApplyResult {
  success: boolean;
  appliedAt: number;
  operationsSummary: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  errors: Array<{ operationId: string; error: string }>;
}

export interface VerifyResult {
  report: VerificationReport;
  allPassed: boolean;
}

export class LabCLI {
  private diffEngine: LabDiffEngine;
  private planner: LabPlanner;
  private runtimeManager: LabRuntimeManager;
  private persistence: LabPlanPersistence;
  private validator: PTSafeValidator;

  private config: LabCLIConfig;
  private generateId = () => `lab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  constructor(
    private reconciler: LabReconciler,
    private labSpec: LabSpec,
    config: Partial<LabCLIConfig> = {},
  ) {
    this.config = {
      devDir: config.devDir ?? process.env.PT_DEV_DIR ?? `${process.env.HOME}/pt-dev`,
      stateDir: config.stateDir ?? "./lab-state",
      autoVerify: config.autoVerify ?? true,
      autoSave: config.autoSave ?? true,
      verbose: config.verbose ?? false,
    };

    this.diffEngine = new LabDiffEngine();
    this.planner = new LabPlanner(this.generateId);
    this.runtimeManager = new LabRuntimeManager({
      devDir: this.config.devDir,
      autoDeploy: true,
      autoLoad: false,
    });
    this.persistence = new LabPlanPersistence(this.config.stateDir);
    this.validator = new PTSafeValidator();
  }

  async plan(options?: { mode?: "incremental" | "rebuild" }): Promise<PlanResult> {
    const observed = await this.reconciler.getObservedTopology();
    const diff = this.diffEngine.diff(this.labSpec, observed.snapshot);
    const plan = this.planner.plan(this.labSpec, diff, options?.mode ?? "incremental");

    return {
      plan,
      diffSummary: {
        devicesToCreate: diff.summary.missing,
        devicesToRemove: diff.summary.extra,
        linksToCreate: 0,
        linksToRemove: 0,
        configChanges: diff.summary.drift + diff.summary.unreliable,
      },
    };
  }

  async apply(
    plan: LabPlan,
    options?: { verify?: boolean; resume?: boolean; saveState?: boolean },
  ): Promise<ApplyResult> {
    const shouldResume = options?.resume ?? false;
    const shouldSave = options?.saveState ?? true;

    let state: PlanExecutionState;

    if (shouldResume && this.persistence.exists(plan.planId)) {
      const existingState = this.persistence.load(plan.planId);
      if (existingState) {
        state = existingState;
        const pendingOps = this.persistence.getResumeOperations(state);
        if (pendingOps.length === 0) {
          return {
            success: true,
            appliedAt: Date.now(),
            operationsSummary: state.summary,
            errors: [],
          };
        }
      } else {
        state = this.persistence.createFromPlan(plan, "unknown");
      }
    } else {
      state = this.persistence.createFromPlan(plan, "unknown");
    }

    if (shouldSave) {
      this.persistence.save(state);
    }

    const executor = new LabExecutor(this.reconciler, this.labSpec);
    const executionProgress = executor.execute(plan);

    for await (const progress of executionProgress) {
      if (progress.currentOperation) {
        this.persistence.markOperationStarted(state, progress.currentOperation.id);

        if (progress.lastResult) {
          const op = state.operations.find((o) => o.id === progress.currentOperation!.id);
          if (op) {
            if (progress.lastResult.action === "failed") {
              this.persistence.markOperationFailed(
                state,
                op.id,
                progress.lastResult.error ?? "Unknown error",
              );
            } else if (progress.lastResult.action === "skipped") {
              this.persistence.markOperationSkipped(state, op.id);
            } else {
              this.persistence.markOperationCompleted(state, op.id, progress.lastResult.details);
            }
          }
        }

        if (shouldSave) {
          this.persistence.save(state);
        }

        if (this.config?.verbose) {
          console.log(
            `[${progress.completedOperations}/${progress.totalOperations}] ${progress.currentOperation.type} ${progress.currentOperation.resourceId}`,
          );
        }
      }
    }

    const finalState = this.persistence.load(plan.planId) ?? state;
    this.persistence.markCompleted(finalState);

    return {
      success: finalState.summary.failed === 0,
      appliedAt: Date.now(),
      operationsSummary: finalState.summary,
      errors: finalState.operations
        .filter((op) => op.status === "failed")
        .map((op) => ({ operationId: op.id, error: op.error ?? "Unknown error" })),
    };
  }

  async verify(checks: LabCheckSpec[]): Promise<VerifyResult> {
    throw new Error(
      "LabCLI.verify() requires IosService and TopologyService - [LabVerifier] not available in this context",
    );
  }

  async repair(): Promise<ApplyResult> {
    const { plan } = await this.plan({ mode: "incremental" });
    return this.apply(plan, { verify: true, resume: true, saveState: true });
  }

  listPlans(): PlanExecutionState[] {
    return this.persistence.list();
  }

  getPlan(planId: string): PlanExecutionState | null {
    return this.persistence.load(planId);
  }

  deletePlan(planId: string): void {
    this.persistence.delete(planId);
  }

  validateJs(code: string): ReturnType<PTSafeValidator["validate"]> {
    return this.validator.validate(code);
  }

  async ensureRuntime(): Promise<void> {
    await this.runtimeManager.ensureRuntime();
  }

  getRuntimeStatus(): ReturnType<LabRuntimeManager["getStatus"]> {
    return this.runtimeManager.getStatus();
  }
}
