// expectPrompt step handler — extracted from runTerminalPlan

import type { EnsureModeResult } from "./ensure-mode-handler.js";

export interface ExpectPromptHandlerDeps {
  stepIndex: number;
}

export interface ExpectPromptResult {
  skipped: boolean;
}

export async function handleExpectPromptStep(
  deps: ExpectPromptHandlerDeps,
  step: { expectPromptPattern?: string },
): Promise<{
  event: Record<string, unknown>;
  result: ExpectPromptResult;
}> {
  const { stepIndex } = deps;

  const event = {
    stepIndex,
    kind: "expectPrompt",
    expectPromptPattern: step.expectPromptPattern,
  };

  return {
    event,
    result: { skipped: false },
  };
}
