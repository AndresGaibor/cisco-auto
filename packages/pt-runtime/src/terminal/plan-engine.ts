// ============================================================================
// Plan Engine - Ejecutor robusto de TerminalPlan
// ============================================================================

import { ensureSession } from "./session-registry";
import { createCommandExecutor, type PTCommandLine, type ExecutionOptions } from "./command-executor";
import { detectModeFromPrompt, normalizePrompt, promptMatches } from "./prompt-detector";
import { createModeGuard } from "./mode-guard";
import type { TerminalMode } from "./session-state";
import type { TerminalPlan, TerminalPlanResult, TerminalPlanStepResult } from "./terminal-plan";

export function createPlanEngine() {
  const executor = createCommandExecutor();
  const modeGuard = createModeGuard();

  async function executePlan(
    plan: TerminalPlan,
    terminal: PTCommandLine,
  ): Promise<TerminalPlanResult> {
    ensureSession(plan.deviceName);

    const stepResults: TerminalPlanStepResult[] = [];
    const warnings: string[] = [];

    const ready = await modeGuard.ensureReadyForPlan(plan.deviceName, terminal, plan.targetMode);
    if (!ready.ok) {
      return {
        ok: false,
        planId: plan.id,
        deviceName: plan.deviceName,
        stepResults: [],
        finalPrompt: normalizePrompt(terminal.getPrompt()),
        finalMode: detectModeFromPrompt(terminal.getPrompt()),
        warnings: ready.warnings ?? [],
        error: ready.error ?? "Plan could not reach target mode",
        confidence: 0,
      };
    }

    if (ready.warnings?.length) warnings.push(...ready.warnings);

    let allOk = true;

    for (let i = 0; i < plan.steps.length; i += 1) {
      const step = plan.steps[i]!;

      if (step.kind === "ensureMode") {
        const target = step.expectMode ?? plan.targetMode;
        const modeResult = await modeGuard.ensureReadyForPlan(plan.deviceName, terminal, target);

        stepResults.push({
          stepIndex: i,
          kind: step.kind,
          ok: modeResult.ok,
          output: "",
          status: modeResult.ok ? 0 : 1,
          durationMs: 0,
          error: modeResult.error,
        });

        if (modeResult.warnings?.length) warnings.push(...modeResult.warnings);

        if (!modeResult.ok) {
          allOk = false;
          if (!step.optional) break;
        }
        continue;
      }

      if (step.kind === "expectPrompt") {
        const currentPrompt = normalizePrompt(terminal.getPrompt());
        const ok = step.expectPromptPattern
          ? promptMatches(step.expectPromptPattern, currentPrompt)
          : Boolean(currentPrompt);

        stepResults.push({
          stepIndex: i,
          kind: step.kind,
          ok,
          output: currentPrompt,
          status: ok ? 0 : 1,
          durationMs: 0,
          error: ok ? undefined : `Prompt mismatch: "${currentPrompt}"`,
        });

        if (!ok) {
          allOk = false;
          if (plan.policies.abortOnPromptMismatch && !step.optional) break;
        }
        continue;
      }

      if (step.kind === "confirm") {
        try {
          terminal.enterChar(13, 0);
          stepResults.push({
            stepIndex: i,
            kind: step.kind,
            ok: true,
            output: "ENTER",
            status: 0,
            durationMs: 0,
          });
        } catch (e) {
          allOk = false;
          stepResults.push({
            stepIndex: i,
            kind: step.kind,
            ok: false,
            output: "",
            status: 1,
            durationMs: 0,
            error: `Failed to confirm prompt: ${String(e)}`,
          });
          if (!step.optional) break;
        }
        continue;
      }

      if (step.kind === "command" && step.command) {
        const options: ExecutionOptions = {
          commandTimeoutMs: plan.timeouts.commandTimeoutMs,
          stallTimeoutMs: plan.timeouts.stallTimeoutMs,
          autoAdvancePager: step.allowPager ?? plan.policies.autoAdvancePager,
          autoDismissWizard: plan.policies.autoBreakWizard,
          autoConfirm: step.allowConfirm ?? false,
          expectedMode: step.expectMode,
          expectedPromptPattern: step.expectPromptPattern,
          maxPagerAdvances: plan.policies.maxPagerAdvances,
        };

        const result = await executor.executeCommand(
          plan.deviceName,
          step.command,
          terminal,
          options,
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

        if (result.warnings?.length) warnings.push(...result.warnings);

        if (!result.ok) {
          allOk = false;
          if (!step.optional) break;
        }
      }
    }

    const finalPrompt = normalizePrompt(terminal.getPrompt());
    const finalMode = detectModeFromPrompt(finalPrompt);

    let confidence = allOk ? 1 : 0.5;
    if (warnings.length > 0) confidence = Math.min(confidence, 0.8);

    return {
      ok: allOk,
      planId: plan.id,
      deviceName: plan.deviceName,
      stepResults,
      finalPrompt,
      finalMode,
      warnings,
      error: allOk ? undefined : "Terminal plan did not complete successfully",
      confidence,
    };
  }

  return { executePlan };
}