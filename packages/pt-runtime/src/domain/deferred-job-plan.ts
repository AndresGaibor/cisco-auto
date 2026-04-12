// packages/pt-runtime/src/domain/deferred-job-plan.ts
import type { DeferredJobPlan, DeferredStep, DeferredStepType, DeferredJobOptions } from "./contracts";

export type { DeferredJobPlan, DeferredStep, DeferredStepType, DeferredJobOptions };

export function createDeferredJobPlan(
  device: string,
  steps: DeferredStep[],
  options?: Partial<DeferredJobOptions>
): DeferredJobPlan {
  const id = `ios_job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  return {
    id,
    kind: "ios-session",
    version: 1,
    device,
    plan: steps,
    options: {
      stopOnError: options?.stopOnError ?? true,
      commandTimeoutMs: options?.commandTimeoutMs ?? 8000,
      stallTimeoutMs: options?.stallTimeoutMs ?? 15000,
    },
    payload: {},
  };
}

export function ensureModeStep(mode: string): DeferredStep {
  return { type: "ensure-mode", value: mode };
}

export function commandStep(cmd: string, opts?: DeferredStep["options"]): DeferredStep {
  return { type: "command", value: cmd, options: opts };
}

export function confirmStep(): DeferredStep {
  return { type: "confirm" };
}

export function expectPromptStep(prompt: string): DeferredStep {
  return { type: "expect-prompt", value: prompt };
}

export function saveConfigStep(): DeferredStep {
  return { type: "save-config" };
}

export function closeSessionStep(): DeferredStep {
  return { type: "close-session" };
}
