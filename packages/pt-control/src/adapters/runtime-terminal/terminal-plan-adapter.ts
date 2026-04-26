// Terminal plan adapter — adapta y valida planes de terminal
// NO ejecuta comandos — esa responsabilidad es del adapter

import type { TerminalPlan, TerminalPlanStep, TerminalMode } from "../../ports/runtime-terminal-port.js";

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function createTerminalPlanAdapter() {
  function validatePlan(plan: TerminalPlan): PlanValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!plan.device || !String(plan.device).trim()) {
      errors.push("TerminalPlan.device es obligatorio");
    }

    if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
      errors.push("TerminalPlan.steps no puede estar vacío");
    }

    if (plan.steps) {
      for (let i = 0; i < plan.steps.length; i += 1) {
        const step = plan.steps[i]!;
        const stepErrors = validateStep(step, i);
        errors.push(...stepErrors);
      }
    }

    if (plan.targetMode && !isValidTerminalMode(plan.targetMode)) {
      warnings.push(`targetMode "${plan.targetMode}" no es un modo conocido`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  function validateStep(step: TerminalPlanStep, index: number): string[] {
    const errors: string[] = [];

    if (step.kind === "command" && !step.command) {
      errors.push(`Paso ${index}: comando requerido para kind="command"`);
    }

    if (step.kind === "ensureMode" && !step.expectMode) {
      errors.push(`Paso ${index}: expectMode requerido para kind="ensureMode"`);
    }

    if (step.expectMode && !isValidTerminalMode(step.expectMode)) {
      errors.push(`Paso ${index}: expectMode "${step.expectMode}" no válido`);
    }

    if (step.timeout !== undefined && step.timeout <= 0) {
      errors.push(`Paso ${index}: timeout debe ser mayor a 0`);
    }

    return errors;
  }

  function isValidTerminalMode(mode: string): boolean {
    const validModes: TerminalMode[] = [
      "user-exec",
      "privileged-exec",
      "global-config",
      "config-if",
      "config-line",
      "config-router",
      "config-vlan",
      "config-subif",
      "host-prompt",
      "host-busy",
      "wizard",
      "pager",
      "confirm",
      "boot",
      "unknown",
    ];
    return validModes.includes(mode as TerminalMode);
  }

  function normalizePlan(plan: TerminalPlan): NormalizedPlan {
    return {
      ...plan,
      device: String(plan.device).trim(),
      steps: plan.steps.map(normalizeStep),
      targetMode: plan.targetMode ?? "privileged-exec",
    };
  }

  function normalizeStep(step: TerminalPlanStep): NormalizedStep {
    return {
      ...step,
      kind: step.kind ?? "command",
      command: step.command ?? "",
      allowPager: step.allowPager ?? true,
      allowConfirm: step.allowConfirm ?? false,
      optional: step.optional ?? false,
      expectedPrompt: step.expectedPrompt ?? step.expectPromptPattern,
    };
  }

  function createSimplePlan(device: string, command: string): TerminalPlan {
    return {
      id: `plan-${Date.now()}`,
      device,
      targetMode: "privileged-exec",
      steps: [{ kind: "command", command }],
    };
  }

  function createEnablePlan(device: string): TerminalPlan {
    return {
      id: `plan-enable-${Date.now()}`,
      device,
      targetMode: "privileged-exec",
      steps: [
        { kind: "ensureMode", expectMode: "privileged-exec" },
        { kind: "command", command: "enable", allowConfirm: true },
        { kind: "ensureMode", expectMode: "privileged-exec" },
      ],
    };
  }

  function createConfigModePlan(device: string, commands: string[]): TerminalPlan {
    return {
      id: `plan-config-${Date.now()}`,
      device,
      targetMode: "global-config",
      steps: [
        { kind: "ensureMode", expectMode: "privileged-exec" },
        { kind: "command", command: "configure terminal", allowConfirm: true },
        { kind: "ensureMode", expectMode: "global-config" },
        ...commands.map((cmd) => ({
          kind: "command" as const,
          command: cmd,
        })),
        { kind: "command", command: "end" },
        { kind: "ensureMode", expectMode: "privileged-exec" },
      ],
    };
  }

  return {
    validatePlan,
    validateStep,
    normalizePlan,
    createSimplePlan,
    createEnablePlan,
    createConfigModePlan,
  };
}

export interface NormalizedPlan extends TerminalPlan {
  device: string;
  targetMode: TerminalMode;
}

export interface NormalizedStep extends TerminalPlanStep {
  kind: TerminalPlanStep["kind"];
  command: string;
  allowPager: boolean;
  allowConfirm: boolean;
  optional: boolean;
}

export type TerminalPlanAdapter = ReturnType<typeof createTerminalPlanAdapter>;