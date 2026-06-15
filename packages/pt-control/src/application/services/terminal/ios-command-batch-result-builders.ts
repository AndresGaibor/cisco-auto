import { firstString } from "./command-result-mapper.js";

export function getBatchStepDurationMs(step: unknown): number | undefined {
  const value = (step as { durationMs?: unknown } | null)?.durationMs;
  const duration = Number(value);

  return Number.isFinite(duration) && duration >= 0 ? duration : undefined;
}

export function buildOptimizedBatchSubResultsFromSteps(
  device: string,
  commands: string[],
  stepResults: unknown[],
): Array<Record<string, unknown>> {
  return stepResults.map((rawStep, index) => {
    const step = rawStep as Record<string, unknown>;
    const command = commands[index] ?? String(step.command ?? "");
    const statusNumber = Number(step.status ?? (step.ok === true ? 0 : 1));
    const status = Number.isFinite(statusNumber) ? statusNumber : 1;
    const stepOk = step.ok === true && status === 0;
    const warnings = Array.isArray(step.warnings) ? step.warnings : [];

    return {
      index,
      command,
      ok: stepOk,
      status,
      durationMs: getBatchStepDurationMs(step),
      result: {
        ok: stepOk,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        output: firstString(step.output),
        rawOutput: firstString(step.rawOutput, step.output),
        status,
        warnings,
        parsed: step.parsed,
        error: step.error
          ? {
              code: "IOS_SUBCOMMAND_FAILED",
              message: String(step.error),
              phase: "execution" as const,
            }
          : undefined,
      },
      warnings,
    };
  });
}
