// ============================================================================
// ChangePlannerService - Orquestador de compilación y ejecución de planes
// ============================================================================

import type {
  IChangePlannerService,
  OperationIntent,
  DeferredJobPlan,
  ExecutionResult,
  RollbackResult,
  RollbackConfig,
  DeferredStep,
} from "./change-planner-types.js";
import { OperationCompiler } from "./operation-compiler.js";
import { CheckpointExecutor } from "./checkpoint-executor.js";

/**
 * ChangePlannerService - orchestrates operation compilation and execution
 */
export class ChangePlannerService implements IChangePlannerService {
  private compiler: OperationCompiler;
  private executor: CheckpointExecutor;
  private plans: Map<string, DeferredJobPlan> = new Map();
  private rollbackExecutor?: (device: string, command: string) => Promise<string>;

  constructor() {
    this.compiler = new OperationCompiler();
    this.executor = new CheckpointExecutor();
  }

  /**
   * Set command executor (injected from outside) for forward execution
   */
  setCommandExecutor(executor: (device: string, command: string) => Promise<string>): void {
    this.executor.setCommandExecutor(executor);
  }

  /**
   * Set rollback executor (injected from outside) for rollback operations
   */
  setRollbackExecutor(executor: (device: string, command: string) => Promise<string>): void {
    this.rollbackExecutor = executor;
  }

  /**
   * Compilar operación a plan
   */
  compileOperation(intent: OperationIntent): DeferredJobPlan {
    const plan = this.compiler.compile(intent);
    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * Ejecutar con checkpoints
   */
  async executeWithCheckpoint(plan: DeferredJobPlan): Promise<ExecutionResult> {
    const storedPlan = this.plans.get(plan.id);
    if (!storedPlan) {
      this.plans.set(plan.id, plan);
    }
    return this.executor.execute(plan);
  }

  /**
   * Rollback de operación fallida - ejecuta las acciones reversivas reales
   */
  async rollback(plan: DeferredJobPlan, failureAt: number): Promise<RollbackResult> {
    if (!plan.rollback) {
      return {
        planId: plan.id,
        success: false,
        rolledBackSteps: 0,
        remainingErrors: ["No rollback configuration defined"],
        executedAt: new Date(),
      };
    }

    if (!this.rollbackExecutor) {
      return {
        planId: plan.id,
        success: false,
        rolledBackSteps: 0,
        remainingErrors: ["Rollback executor not configured. Call setRollbackExecutor() first."],
        executedAt: new Date(),
      };
    }

    const rollbackConfig = plan.rollback;
    const rollbackActions = rollbackConfig.actions;
    let rolledBack = 0;
    const errors: string[] = [];

    // Execute rollback actions in reverse order
    for (let i = rollbackActions.length - 1; i >= 0; i--) {
      const action = rollbackActions[i];
      const step = plan.steps[i];
      const d = "unknown";
      try {
        await this.rollbackExecutor!(d, action);
        rolledBack++;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    return {
      planId: plan.id,
      success: errors.length === 0,
      rolledBackSteps: rolledBack,
      remainingErrors: errors,
      executedAt: new Date(),
    };
  }

  /**
   * Obtener plan por ID
   */
  getPlan(planId: string): DeferredJobPlan | null {
    return this.plans.get(planId) ?? null;
  }

  /**
   * Listar todos los planes
   */
  listPlans(): DeferredJobPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Listar planes por tipo de operación
   */
  listPlansByType(type: string): DeferredJobPlan[] {
    return Array.from(this.plans.values()).filter((p) => p.intent.type === type);
  }

  /**
   * Obtener estadísticas de planes
   */
  getStats(): { totalPlans: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};

    for (const plan of Array.from(this.plans.values())) {
      const type = plan.intent.type;
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      totalPlans: this.plans.size,
      byType,
    };
  }

  /**
   * Eliminar plan
   */
  deletePlan(planId: string): boolean {
    return this.plans.delete(planId);
  }

  /**
   * Limpiar planes antiguos
   */
  clearOldPlans(olderThanMs: number = 86400000): void {
    const now = Date.now();
    for (const [id, plan] of Array.from(this.plans.entries())) {
      const planTime = parseInt(plan.id.split("-")[1] || "0", 10);
      if (now - planTime > olderThanMs) {
        this.plans.delete(id);
      }
    }
  }
}

/**
 * Factory
 */
export function createChangePlannerService(): ChangePlannerService {
  return new ChangePlannerService();
}
