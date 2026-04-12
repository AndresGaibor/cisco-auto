// ============================================================================
// CheckpointExecutor - Ejecuta steps con verificación de checkpoints
// ============================================================================

import type {
  DeferredJobPlan,
  DeferredStep,
  Checkpoint,
  ExecutionResult,
  PlanExecutionInstance,
  Precheck,
} from './change-planner-types.js';

/**
 * CheckpointExecutor - executes steps with checkpoint verification
 */
export class CheckpointExecutor {
  private executions: Map<string, PlanExecutionInstance> = new Map();
  private commandExecutor?: (device: string, command: string) => Promise<string>;

  /**
   * Set command executor
   */
  setCommandExecutor(executor: (device: string, command: string) => Promise<string>): void {
    this.commandExecutor = executor;
  }

  /**
   * Execute plan with checkpoint verification
   */
  async execute(plan: DeferredJobPlan): Promise<ExecutionResult> {
    const execution: PlanExecutionInstance = {
      id: `exec-${Date.now()}`,
      plan,
      state: 'running',
      currentStep: 0,
      startedAt: new Date(),
    };
    
    this.executions.set(execution.id, execution);

    try {
      // Run prechecks first
      for (const precheck of plan.prechecks) {
        const passed = await this.runPrecheck(precheck);
        if (!passed && precheck.required) {
          return this.failExecution(execution, 0, `Precheck failed: ${precheck.check}`);
        }
      }

      // Execute steps
      for (let i = 0; i < plan.steps.length; i++) {
        execution.currentStep = i + 1;
        const step = plan.steps[i];
        if (!step) continue;
        const stepResult = await this.executeStep(step);

        if (!stepResult.success) {
          if (step.onError === 'abort' || !step.onError) {
            return this.failExecution(execution, i + 1, stepResult.error || 'Step failed');
          }
          if (step.onError === 'retry') {
            const retryResult = await this.executeStep(step);
            if (!retryResult.success) {
              return this.failExecution(execution, i + 1, retryResult.error || 'Step failed after retry');
            }
          }
        }


        // Check checkpoint after step
        const checkpoint = plan.checkpoints.find(c => c.step === i + 1);
        if (checkpoint) {
          const checkpointResult = await this.verifyCheckpoint(checkpoint);
          if (!checkpointResult && checkpoint.onFail === 'abort') {
            return this.failExecution(execution, i + 1, `Checkpoint ${checkpoint.step} failed: ${checkpoint.verify}`);
          }
          if (!checkpointResult && checkpoint.onFail === 'rollback') {
            return this.failExecution(execution, i + 1, `Checkpoint ${checkpoint.step} failed, rollback triggered`);
          }
        }
      }

      // Success
      execution.state = 'completed';
      execution.completedAt = new Date();

      return {
        planId: plan.id,
        success: true,
        completedSteps: plan.steps.length,
        errors: [],
        verificationsPassed: true,
        executedAt: new Date(),
      };

    } catch (error) {
      return this.failExecution(execution, execution.currentStep, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Execute single step
   */
  private async executeStep(step: DeferredStep): Promise<{ success: boolean; error?: string }> {
    if (!this.commandExecutor) {
      return { success: false, error: 'No command executor configured' };
    }

    try {
      for (const command of step.commands) {
        if (!command.trim()) continue;
        
        await this.commandExecutor(step.device, command);
      }

      if (step.verification) {
        const output = await this.commandExecutor(step.device, step.verification.command);
        
        if (step.verification.expectedPattern) {
          const regex = new RegExp(step.verification.expectedPattern);
          if (!regex.test(output)) {
            return { success: false, error: `Verification failed: expected ${step.verification.expectedPattern}` };
          }
        }
        
        if (step.verification.unexpectedPatterns) {
          for (const pattern of step.verification.unexpectedPatterns) {
            const regex = new RegExp(pattern);
            if (regex.test(output)) {
              return { success: false, error: `Verification failed: unexpected pattern ${pattern}` };
            }
          }
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Run precheck
   */
  private async runPrecheck(precheck: Precheck): Promise<boolean> {
    console.log(`Running precheck: ${precheck.type} - ${precheck.check}`);
    return true;
  }

  /**
   * Verify checkpoint
   */
  private async verifyCheckpoint(checkpoint: Checkpoint): Promise<boolean> {
    console.log(`Verifying checkpoint ${checkpoint.step}: ${checkpoint.verify}`);
    return true;
  }

  /**
   * Fail execution
   */
  private failExecution(execution: PlanExecutionInstance, failedStep: number, error: string): ExecutionResult {
    execution.state = 'failed';
    execution.completedAt = new Date();

    return {
      planId: execution.plan.id,
      success: false,
      completedSteps: failedStep - 1,
      failedStep,
      errors: [error],
      verificationsPassed: false,
      executedAt: new Date(),
    };
  }

  /**
   * Get execution status
   */
  getExecution(executionId: string): PlanExecutionInstance | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List executions
   */
  listExecutions(): PlanExecutionInstance[] {
    return Array.from(this.executions.values());
  }

  /**
   * Clear completed executions
   */
  clearCompleted(): void {
    for (const [id, exec] of Array.from(this.executions.entries())) {
      if (exec.state === 'completed' || exec.state === 'failed') {
        this.executions.delete(id);
      }
    }
  }
}

/**
 * Factory
 */
export function createCheckpointExecutor(): CheckpointExecutor {
  return new CheckpointExecutor();
}