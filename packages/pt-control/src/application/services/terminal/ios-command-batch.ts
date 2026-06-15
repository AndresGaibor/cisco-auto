import type { RunTerminalCommandOptions } from "@cisco-auto/terminal-contracts";
import type { RuntimeTerminalPort } from "../../../ports/runtime-terminal-port.js";
import type { TerminalServiceTimingMap } from "./command-timing-recorder.js";
import { buildUniversalTerminalPlan, splitCommandLines } from "../terminal-plan-builder.js";
import { hasPagerSuppressionSteps, stripPagerSuppressionSteps } from "../terminal-plan-policies.js";
import { measureServiceSync } from "./command-timing-recorder.js";
import { createTerminalReadinessChecker } from "./terminal-readiness-checker.js";
import {
  buildCommandResult,
  createRuntimeUnavailableResult,
  extractIosFailureDetails,
  firstString,
  isPrivilegedIosCommand,
} from "./command-result-mapper.js";
import { buildOptimizedBatchSubResultsFromSteps, getBatchStepDurationMs } from "./ios-command-batch-result-builders.js";

export interface IosCommandBatchDeps {
  runtimeTerminal?: RuntimeTerminalPort | null;
  controller: {
    getHeartbeatHealth?(): {
      state: "ok" | "stale" | "missing" | "unknown";
      ageMs?: number;
      lastSeenTs?: number;
    };
    execIos(
      device: string,
      command: string,
      parse?: boolean,
      timeoutMs?: number,
    ): Promise<unknown>;
  };
  generateId: () => string;
}

function normalizeBatchCommand(command: string): string {
  return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function isReadOnlyOptimizedBatchCommand(command: string): boolean {
  const cmd = normalizeBatchCommand(command);

  return (
    /^show\b/.test(cmd) ||
    /^ping\b/.test(cmd) ||
    /^traceroute\b/.test(cmd) ||
    /^tracert\b/.test(cmd)
  );
}

function canUseOptimizedRuntimeBatch(
  commands: string[],
  options?: RunTerminalCommandOptions,
): boolean {
  if (commands.length <= 1) return false;
  if (options?.mode === "raw") return false;
  if (options?.allowConfirm === true) return false;
  if (options?.allowDestructive === true) return false;

  return commands.every(isReadOnlyOptimizedBatchCommand);
}

function getStepWarnings(step: unknown): unknown[] {
  const value = step as { warnings?: unknown } | null;
  return Array.isArray(value?.warnings) ? value.warnings : [];
}

function buildOptimizedBatchOutput(stepResults: Array<{ output?: unknown; rawOutput?: unknown }>): string {
  return stepResults
    .map((step) => String(step.output ?? step.rawOutput ?? "").trim())
    .filter((output) => output.length > 0)
    .join("\n\n");
}

function buildOptimizedBatchRawOutput(stepResults: Array<{ rawOutput?: unknown; output?: unknown }>, fallback: unknown): string {
  const raw = stepResults
    .map((step) => String(step.rawOutput ?? step.output ?? "").trim())
    .filter((output) => output.length > 0)
    .join("\n\n");

  return raw || firstString(fallback);
}

function shortText(value: unknown, max = 180): string {
  return String(value ?? "")
    .replace(/\r/g, "")
    .slice(0, max);
}

function getRuntimeStepResults(runtimeResult: unknown): unknown[] {
  const stepResults = (runtimeResult as { stepResults?: unknown } | null)?.stepResults;
  return Array.isArray(stepResults) ? stepResults : [];
}

const batchOptimizer = {
  summarizeRuntimeStepResults(runtimeResult: unknown): Array<Record<string, unknown>> {
    return getRuntimeStepResults(runtimeResult).map((step, index) => {
      const item = step as Record<string, unknown>;

      return {
        index,
        stepIndex: item.stepIndex,
        kind: item.kind ?? item.stepType,
        command: item.command,
        normalizedCommand: normalizeBatchCommand(String(item.command ?? "")),
        status: item.status,
        ok: item.ok,
        keys: Object.keys(item),
        outputHead: shortText(item.output),
        rawOutputHead: shortText(item.rawOutput ?? item.raw),
      };
    });
  },

  getUnmatchedOptimizedCommands(runtimeResult: unknown, commands: string[]): string[] {
    const runtimeCommands = new Set(
      getRuntimeStepResults(runtimeResult).map((step) => normalizeBatchCommand(String((step as any)?.command ?? ""))),
    );

    return commands.filter((command) => !runtimeCommands.has(normalizeBatchCommand(command)));
  },

  getPlanStepDiagnostics(plan: { steps?: unknown[] }): Array<Record<string, unknown>> {
    const steps = Array.isArray(plan.steps) ? plan.steps : [];

    return steps.map((step, index) => {
      const item = step as Record<string, unknown>;
      const metadata = item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>) : {};

      return {
        index,
        kind: item.kind,
        command: item.command,
        normalizedCommand: normalizeBatchCommand(String(item.command ?? "")),
        internal: metadata.internal === true,
        reason: metadata.reason,
        userCommand: metadata.userCommand,
        optional: item.optional,
      };
    });
  },

  hasCompleteOptimizedStepResults(runtimeResult: unknown, commands: string[]): boolean {
    const stepResults = (runtimeResult as { stepResults?: unknown } | null)?.stepResults;
    if (!Array.isArray(stepResults)) return false;

    return this.getMatchedOptimizedStepResults(stepResults, commands) !== null;
  },

  getMatchedOptimizedStepResults(stepResults: unknown[], commands: string[]): unknown[] | null {
    const usedIndexes = new Set<number>();

    const matchedStepResults: unknown[] = [];

    for (const command of commands) {
      const normalizedCommand = String(command ?? "").trim().toLowerCase();
      const matchIndex = stepResults.findIndex((step, index) => {
        if (usedIndexes.has(index)) return false;

        return String((step as any)?.command ?? "").trim().toLowerCase() === normalizedCommand;
      });

      if (matchIndex < 0) return null;

      usedIndexes.add(matchIndex);
      matchedStepResults.push(stepResults[matchIndex]);
    }

    return matchedStepResults;
  },

  getOptimizedBatchCoverage(stepResults: unknown[], commands: string[]): {
    matchedStepResults: unknown[];
    nextCommandIndex: number;
    unmatchedCommands: string[];
  } | null {
    const usedIndexes = new Set<number>();
    const matchedStepResults: unknown[] = [];

    for (let commandIndex = 0; commandIndex < commands.length; commandIndex += 1) {
      const normalizedCommand = String(commands[commandIndex] ?? "").trim().toLowerCase();
      const matchIndex = stepResults.findIndex((step, index) => {
        if (usedIndexes.has(index)) return false;

        return String((step as any)?.command ?? "").trim().toLowerCase() === normalizedCommand;
      });

      if (matchIndex < 0) {
        return {
          matchedStepResults,
          nextCommandIndex: commandIndex,
          unmatchedCommands: commands.slice(commandIndex),
        };
      }

      usedIndexes.add(matchIndex);
      matchedStepResults.push(stepResults[matchIndex]);
    }

    return null;
  },

  buildOptimizedBatchRejectedResult(args: {
    device: string;
    commands: string[];
    runtimeResult: unknown;
    reason: "no_runtime_terminal" | "unsafe_command" | "runtime_exception" | "missing_stepResults" | "stepResults_length_mismatch" | "command_mismatch" | "partial_stepResults";
    plan?: { steps?: unknown[] };
    partial?: {
      matchedSubResults: unknown[];
      nextCommandIndex: number;
      unmatchedCommands: string[];
    };
  }): Record<string, unknown> {
    const runtimeStepSummary = batchOptimizer.summarizeRuntimeStepResults(args.runtimeResult);
    const planStepSummary = args.plan ? batchOptimizer.getPlanStepDiagnostics(args.plan) : [];
    const diagnostics = {
      optimizedBatchRejected: true,
      optimizedBatchReason: args.reason,
      optimizedBatchExpectedCommandCount: args.commands.length,
      optimizedBatchExpectedCommands: args.commands,
      optimizedBatchExpectedNormalizedCommands: args.commands.map(normalizeBatchCommand),
      optimizedBatchRuntimeStepResultCount: runtimeStepSummary.length,
      optimizedBatchRuntimeStepCommands: runtimeStepSummary.map((step) => step.command),
      optimizedBatchRuntimeNormalizedStepCommands: runtimeStepSummary.map((step) => step.normalizedCommand),
      optimizedBatchRuntimeStepSummary: runtimeStepSummary,
      optimizedBatchUnmatchedCommands: batchOptimizer.getUnmatchedOptimizedCommands(args.runtimeResult, args.commands),
      optimizedBatchPlanStepSummary: planStepSummary,
      optimizedBatchVisiblePlanCommands: planStepSummary
        .filter((step) => step.internal !== true && typeof step.command === "string")
        .map((step) => step.command),
      optimizedBatchRuntimeResultKeys: Object.keys((args.runtimeResult as Record<string, unknown>) ?? {}),
      ...(args.partial
        ? {
            optimizedBatchPartial: true,
            optimizedBatchMatchedCommandCount: args.partial.matchedSubResults.length,
            optimizedBatchNextCommandIndex: args.partial.nextCommandIndex,
            optimizedBatchPartialStepResults: args.partial.matchedSubResults,
            optimizedBatchPartialUnmatchedCommands: args.partial.unmatchedCommands,
            subResults: buildOptimizedBatchSubResultsFromSteps(
              args.device,
              args.commands,
              args.partial.matchedSubResults,
            ),
          }
        : {}),
    };

    return {
      ok: false,
      action: "ios.exec.batch",
      device: args.device,
      deviceKind: "ios",
      command: args.commands.join("\n"),
      output: "",
      rawOutput: "",
      status: 1,
      warnings: [],
      evidence: diagnostics,
      ...diagnostics,
    };
  },
};

export function executeIosCommandBatchOptimized(
  deps: IosCommandBatchDeps,
  device: string,
  commands: string[],
  options?: RunTerminalCommandOptions,
  timings?: TerminalServiceTimingMap,
): Promise<ReturnType<typeof buildCommandResult> | null> {
  const readinessChecker = createTerminalReadinessChecker({
    controller: deps.controller as any,
  });

  const normalizedCommands = commands
    .map((command) => String(command ?? "").trim())
    .filter((command) => command.length > 0);

  if (!canUseOptimizedRuntimeBatch(normalizedCommands, options)) {
    return Promise.resolve(
      batchOptimizer.buildOptimizedBatchRejectedResult({
        device,
        commands: normalizedCommands,
        runtimeResult: null,
        reason: "unsafe_command",
      }) as any,
    );
  }

  const runtimeTerminal = deps.runtimeTerminal;
  if (!runtimeTerminal?.runTerminalPlan) {
    return Promise.resolve(
      batchOptimizer.buildOptimizedBatchRejectedResult({
        device,
        commands: normalizedCommands,
        runtimeResult: null,
        reason: "no_runtime_terminal",
      }) as any,
    );
  }

  const executionTimeout = options?.timeoutMs ?? 45000;
  const bridgeTimeout = executionTimeout + 5000;
  const serviceTimings = timings ?? {};
  const commandText = normalizedCommands.join("\n");

  const plan = measureServiceSync(serviceTimings, "buildIosBatchOptimizedPlanMs", () =>
    buildUniversalTerminalPlan({
      id: deps.generateId(),
      device,
      command: commandText,
      deviceKind: "ios",
      mode: options?.mode,
      allowConfirm: false,
      allowDestructive: false,
      timeoutMs: executionTimeout,
    }),
  );

  if (hasPagerSuppressionSteps(plan.steps)) {
    plan.steps = stripPagerSuppressionSteps(plan.steps);
    plan.metadata = {
      ...(plan.metadata ?? {}),
      optimizedRuntimeMultistepNoPager: true,
      optimizedRuntimeMultistepNoPagerReason: "avoid-batch-abort-on-pager-prelude",
    };
  }

  plan.metadata = {
    ...(plan.metadata ?? {}),
    optimizedRuntimeMultistep: true,
    requestedCommandCount: normalizedCommands.length,
    executionStrategy: "optimized-runtime-multistep",
  };

  const { isReady, heartbeat, reason } = readinessChecker.checkReadiness({
    isHighRiskCommand: false,
  });

  if (!isReady) {
    return Promise.resolve(
      createRuntimeUnavailableResult({
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command: commandText,
        health: heartbeat,
        reason: reason ?? "PT_RUNTIME_UNAVAILABLE",
      }) as any,
    );
  }

  return (async () => {
    let runtimeResult: any;

    try {
      const startedAt = Date.now();
      runtimeResult = await runtimeTerminal.runTerminalPlan(plan, {
        timeoutMs: bridgeTimeout,
        waitForCompletion: true,
        inlineTimeoutMs: 1200,
      } as any);
      serviceTimings.runtimeTerminalBatchOptimizedRunPlanMs =
        (serviceTimings.runtimeTerminalBatchOptimizedRunPlanMs ?? 0) +
        Math.max(0, Date.now() - startedAt);
    } catch {
      return batchOptimizer.buildOptimizedBatchRejectedResult({
        device,
        commands: normalizedCommands,
        runtimeResult: null,
        reason: "runtime_exception",
        plan,
      }) as any;
    }

    if (!batchOptimizer.hasCompleteOptimizedStepResults(runtimeResult, normalizedCommands)) {
      const stepResults = (runtimeResult as { stepResults?: unknown } | null)?.stepResults;
      const reason = !Array.isArray(stepResults)
        ? "missing_stepResults"
        : "command_mismatch";

      const partialCoverage = Array.isArray(stepResults)
        ? batchOptimizer.getOptimizedBatchCoverage(stepResults, normalizedCommands)
        : null;

      if (partialCoverage && partialCoverage.matchedStepResults.length > 0) {
        return batchOptimizer.buildOptimizedBatchRejectedResult({
          device,
          commands: normalizedCommands,
          runtimeResult,
          reason: "partial_stepResults",
          plan,
          partial: {
            matchedSubResults: partialCoverage.matchedStepResults,
            nextCommandIndex: partialCoverage.nextCommandIndex,
            unmatchedCommands: partialCoverage.unmatchedCommands,
          },
        }) as any;
      }

      return batchOptimizer.buildOptimizedBatchRejectedResult({
        device,
        commands: normalizedCommands,
        runtimeResult,
        reason,
        plan,
      }) as any;
    }

    const stepResults = batchOptimizer.getMatchedOptimizedStepResults(runtimeResult.stepResults as Array<any>, normalizedCommands) as Array<any>;
    const failedSubcommandCount = stepResults.filter((step) => step?.ok !== true || Number(step?.status ?? 1) !== 0).length;
    const allOk = failedSubcommandCount === 0;
    const output = buildOptimizedBatchOutput(stepResults);
    const rawOutput = buildOptimizedBatchRawOutput(stepResults, runtimeResult.rawOutput ?? runtimeResult.output);
    const warnings = [
      ...(Array.isArray(runtimeResult.warnings) ? runtimeResult.warnings : []),
      ...stepResults.flatMap(getStepWarnings),
    ];

    const subResults = stepResults.map((step, index) => ({
      index,
      command: normalizedCommands[index] ?? String(step?.command ?? ""),
      ok: step?.ok === true && Number(step?.status ?? 1) === 0,
      status: Number(step?.status ?? 1),
      durationMs: getBatchStepDurationMs(step),
      result: {
        ok: step?.ok === true && Number(step?.status ?? 1) === 0,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command: normalizedCommands[index] ?? String(step?.command ?? ""),
        output: firstString(step?.output),
        rawOutput: firstString(step?.rawOutput, step?.output),
        status: Number(step?.status ?? 1),
        warnings: Array.isArray(step?.warnings) ? step.warnings : [],
        parsed: step?.parsed,
        error: step?.error
          ? {
              code: "IOS_SUBCOMMAND_FAILED",
              message: String(step.error),
              phase: "execution" as const,
            }
          : undefined,
      },
      warnings: Array.isArray(step?.warnings) ? step.warnings : [],
    }));

    const baseResult = buildCommandResult({
      ok: allOk,
      action: "ios.exec",
      device,
      deviceKind: "ios",
      command: commandText,
      output,
      rawOutput,
      status: allOk ? 0 : 1,
      warnings,
      evidence: runtimeResult.evidence,
    } as any) as any;

    return {
      ...baseResult,
      action: "ios.exec.batch",
      executionStrategy: "optimized-runtime-multistep",
      commandCount: normalizedCommands.length,
      commands: normalizedCommands,
      failedSubcommandCount,
      subResults,
    } as any;
  })();
}
