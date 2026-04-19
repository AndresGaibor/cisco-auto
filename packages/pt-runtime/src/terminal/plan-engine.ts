// ============================================================================
// Plan Engine - Ejecutor de planes terminal
// ============================================================================

import { ensureSession } from "./session-registry";
import { createCommandExecutor, type CommandExecutionResult, type PTCommandLine, type ExecutionOptions } from "./command-executor";
import { detectModeFromPrompt } from "./prompt-detector";
import type { TerminalMode } from "./session-state";
import type { TerminalPlan, TerminalPlanResult, TerminalPlanStepResult, TerminalPlanStep } from "./terminal-plan";

export function createPlanEngine() {
  const executor = createCommandExecutor();

  async function executePlan(
    plan: TerminalPlan,
    terminal: PTCommandLine
  ): Promise<TerminalPlanResult> {
    const session = ensureSession(plan.deviceName);
    const promptBefore = terminal.getPrompt();
    const modeBefore = detectModeFromPrompt(promptBefore);

    const stepResults: TerminalPlanStepResult[] = [];
    let allOk = true;
    const warnings: string[] = [];

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];

      if (step.kind === "command" && step.command) {
        const options: ExecutionOptions = {
          commandTimeoutMs: plan.timeouts.commandTimeoutMs,
          stallTimeoutMs: plan.timeouts.stallTimeoutMs,
          autoAdvancePager: plan.policies.autoAdvancePager,
          maxPagerAdvances: plan.policies.maxPagerAdvances,
        };

        const result = await executor.executeCommand(
          plan.deviceName,
          step.command,
          terminal,
          options
        );

        stepResults.push({
          stepIndex: i,
          kind: step.kind,
          command: step.command,
          ok: result.ok,
          output: result.output,
          status: result.status,
          durationMs: result.durationMs,
          error: result.error,
        });

        if (!result.ok) {
          allOk = false;
          if (!step.optional) {
            break;
          }
          warnings.push(`Step ${i} failed but was optional: ${result.error}`);
        }

        if (result.warnings?.length) {
          warnings.push(...result.warnings);
        }
      } else if (step.kind === "ensureMode") {
        const currentMode = session.lastMode;
        if (step.expectMode && currentMode !== step.expectMode) {
          if (plan.policies.abortOnModeMismatch) {
            allOk = false;
            stepResults.push({
              stepIndex: i,
              kind: step.kind,
              ok: false,
              output: "",
              status: 1,
              durationMs: 0,
              error: `Mode mismatch: expected ${step.expectMode}, got ${currentMode}`,
            });
            break;
          } else {
            warnings.push(`Mode mismatch at step ${i}: expected ${step.expectMode}, got ${currentMode}`);
          }
        }
      }
    }

    const finalPrompt = terminal.getPrompt();
    const finalMode = detectModeFromPrompt(finalPrompt);

    return {
      ok: allOk,
      planId: plan.id,
      deviceName: plan.deviceName,
      stepResults,
      finalPrompt,
      finalMode,
      warnings,
      confidence: allOk ? 1 : 0.5,
    };
  }

  return { executePlan };
}