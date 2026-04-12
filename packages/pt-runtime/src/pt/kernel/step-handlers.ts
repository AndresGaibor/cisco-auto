// packages/pt-runtime/src/pt/kernel/step-handlers.ts
// Step handlers for deferred job execution

import type { DeferredStep } from "../../domain";
import type { JobContext } from "./job-state";
import type { TerminalEngine } from "../terminal/terminal-engine";

export interface StepResult {
  phase: JobContext["phase"];
  continue: boolean;
  output?: string;
  error?: string;
}

export interface StepHandlerContext {
  job: JobContext;
  terminal: TerminalEngine;
  device: string;
}

export function handleEnsureMode(ctx: StepHandlerContext): StepResult {
  const step = ctx.job.plan.plan[ctx.job.currentStep];
  const targetMode = step.value || "privileged-exec";
  
  if (targetMode === "privileged-exec" || targetMode === "priv-exec") {
    return {
      phase: "waiting-command",
      continue: true,
    };
  }
  
  if (targetMode === "config") {
    return {
      phase: "waiting-command",
      continue: true,
    };
  }
  
  return {
    phase: "waiting-command",
    continue: true,
  };
}

export function handleCommand(ctx: StepHandlerContext): StepResult {
  const step = ctx.job.plan.plan[ctx.job.currentStep];
  const command = step.value || "";
  
  if (!command) {
    return {
      phase: "completed",
      continue: false,
      error: "Empty command",
    };
  }
  
  return {
    phase: "waiting-command",
    continue: true,
  };
}

export function handleConfirm(ctx: StepHandlerContext): StepResult {
  ctx.terminal.confirmPrompt(ctx.device);
  
  return {
    phase: "waiting-prompt",
    continue: true,
  };
}

export function handleExpectPrompt(ctx: StepHandlerContext): StepResult {
  const step = ctx.job.plan.plan[ctx.job.currentStep];
  const expectedPrompt = step.value || "";
  
  if (!expectedPrompt) {
    return {
      phase: "completed",
      continue: false,
      error: "No expected prompt specified",
    };
  }
  
  return {
    phase: "waiting-prompt",
    continue: true,
  };
}

export function handleSaveConfig(ctx: StepHandlerContext): StepResult {
  return {
    phase: "waiting-command",
    continue: true,
  };
}

export function handleDelay(ctx: StepHandlerContext): StepResult {
  const step = ctx.job.plan.plan[ctx.job.currentStep];
  const delayMs = parseInt(step.value || "1000", 10);
  
  return {
    phase: "waiting-delay",
    continue: true,
    output: `Delay: ${delayMs}ms`,
  };
}

export function handleCloseSession(ctx: StepHandlerContext): StepResult {
  ctx.terminal.detach(ctx.device);
  
  return {
    phase: "completed",
    continue: false,
  };
}

export function routeStep(ctx: StepHandlerContext): StepResult {
  const step = ctx.job.plan.plan[ctx.job.currentStep];
  const stepType = step.type;
  
  switch (stepType) {
    case "ensure-mode":
      return handleEnsureMode(ctx);
    case "command":
      return handleCommand(ctx);
    case "confirm":
      return handleConfirm(ctx);
    case "expect-prompt":
      return handleExpectPrompt(ctx);
    case "save-config":
      return handleSaveConfig(ctx);
    case "delay":
      return handleDelay(ctx);
    case "close-session":
      return handleCloseSession(ctx);
    default:
      return {
        phase: "error",
        continue: false,
        error: `Unknown step type: ${stepType}`,
      };
  }
}