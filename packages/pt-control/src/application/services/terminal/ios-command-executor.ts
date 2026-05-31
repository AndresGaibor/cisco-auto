import type { TerminalDeviceKind, RunTerminalCommandOptions } from "@cisco-auto/terminal-contracts";
import type { RuntimeTerminalPort } from "../../../ports/runtime-terminal-port.js";
import { buildUniversalTerminalPlan, splitCommandLines } from "../terminal-plan-builder.js";
import { hasPagerSuppressionSteps, recordTerminalLengthZeroResult, stripPagerSuppressionSteps } from "../terminal-plan-policies.js";
import { measureServiceAsync, measureServiceSync, type TerminalServiceTimingMap } from "./command-timing-recorder.js";
import { applyTerminalEvidenceBarrier } from "./terminal-evidence-barrier.js";
import { createTerminalReadinessChecker, type HeartbeatHealth } from "./terminal-readiness-checker.js";
import {
  detectAutoConfigFinalModeFailure,
  detectIosSemanticFailureFromRuntimeResult,
  getRuntimeFailureText,
} from "./ios-runtime-result-classifier.js";
import {
  buildCommandResult,
  createRuntimeUnavailableResult,
  extractIosFailureDetails,
  firstString,
  isPrivilegedIosCommand,
} from "./command-result-mapper.js";
import {
  attachRuntimeRetryEvidence,
  isRecoverableEmptyTerminalTimeout,
} from "./ios-retry-policy.js";

export { isRetryableReadOnlyIosCommand } from "./ios-retry-policy.js";

export interface IosCommandExecutorDeps {
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

function createRuntimePollingError(device: string, cause: string): Error {
  const error = new Error(
    `No se pudo inspeccionar "${device}" porque el runtime de Packet Tracer no respondió.`,
  ) as Error & { code?: string; details?: Record<string, unknown> };

  error.code = "RUNTIME_NOT_POLLING";
  error.details = { device, cause };
  return error;
}

function isHighRiskIosCommand(command: string, plan: any): boolean {
  if (plan?.metadata?.autoConfig === true) {
    return true;
  }

  return splitCommandLines(command).some(isPrivilegedIosCommand);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
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

function getBatchStepDurationMs(step: unknown): number | undefined {
  const value = step as { durationMs?: unknown } | null;
  const parsed = Number(value?.durationMs);

  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : undefined;
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


function buildOptimizedBatchSubResultsFromSteps(
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


function shortText(value: unknown, max = 180): string {
  return String(value ?? "")
    .replace(/\r/g, "")
    .slice(0, max);
}

function getRuntimeStepResults(runtimeResult: unknown): unknown[] {
  const stepResults = (runtimeResult as { stepResults?: unknown } | null)?.stepResults;
  return Array.isArray(stepResults) ? stepResults : [];
}

function summarizeRuntimeStepResults(runtimeResult: unknown): Array<Record<string, unknown>> {
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
}

function getUnmatchedOptimizedCommands(runtimeResult: unknown, commands: string[]): string[] {
  const runtimeCommands = new Set(
    getRuntimeStepResults(runtimeResult).map((step) => normalizeBatchCommand(String((step as any)?.command ?? ""))),
  );

  return commands.filter((command) => !runtimeCommands.has(normalizeBatchCommand(command)));
}

function getPlanStepDiagnostics(plan: { steps?: unknown[] }): Array<Record<string, unknown>> {
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
}

function hasCompleteOptimizedStepResults(runtimeResult: unknown, commands: string[]): boolean {
  const stepResults = (runtimeResult as { stepResults?: unknown } | null)?.stepResults;
  if (!Array.isArray(stepResults)) return false;

  return getMatchedOptimizedStepResults(stepResults, commands) !== null;
}

function getMatchedOptimizedStepResults(stepResults: unknown[], commands: string[]): unknown[] | null {
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
}

function getOptimizedBatchCoverage(stepResults: unknown[], commands: string[]): {
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
}

function buildOptimizedBatchRejectedResult(args: {
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
  const runtimeStepSummary = summarizeRuntimeStepResults(args.runtimeResult);
  const planStepSummary = args.plan ? getPlanStepDiagnostics(args.plan) : [];
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
    optimizedBatchUnmatchedCommands: getUnmatchedOptimizedCommands(args.runtimeResult, args.commands),
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
}

export function createIosCommandExecutor(deps: IosCommandExecutorDeps) {
  const readinessChecker = createTerminalReadinessChecker({
    controller: deps.controller as any,
  });


  async function executeIosCommandBatchOptimized(
    device: string,
    commands: string[],
    options?: RunTerminalCommandOptions,
    timings?: TerminalServiceTimingMap,
  ): Promise<ReturnType<typeof buildCommandResult> | null> {
    const normalizedCommands = commands
      .map((command) => String(command ?? "").trim())
      .filter((command) => command.length > 0);

    if (!canUseOptimizedRuntimeBatch(normalizedCommands, options)) {
      return buildOptimizedBatchRejectedResult({
        device,
        commands: normalizedCommands,
        runtimeResult: null,
        reason: "unsafe_command",
      }) as any;
    }

    const runtimeTerminal = deps.runtimeTerminal;
    if (!runtimeTerminal?.runTerminalPlan) {
      return buildOptimizedBatchRejectedResult({
        device,
        commands: normalizedCommands,
        runtimeResult: null,
        reason: "no_runtime_terminal",
      }) as any;
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
      return createRuntimeUnavailableResult({
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command: commandText,
        health: heartbeat,
        reason: reason ?? "PT_RUNTIME_UNAVAILABLE",
      }) as any;
    }

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
      return buildOptimizedBatchRejectedResult({
        device,
        commands: normalizedCommands,
        runtimeResult: null,
        reason: "runtime_exception",
        plan,
      }) as any;
    }

    if (!hasCompleteOptimizedStepResults(runtimeResult, normalizedCommands)) {
      const stepResults = (runtimeResult as { stepResults?: unknown } | null)?.stepResults;
      const reason = !Array.isArray(stepResults)
        ? "missing_stepResults"
        : "command_mismatch";

      const partialCoverage = Array.isArray(stepResults)
        ? getOptimizedBatchCoverage(stepResults, normalizedCommands)
        : null;

      if (partialCoverage && partialCoverage.matchedStepResults.length > 0) {
        return buildOptimizedBatchRejectedResult({
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

      return buildOptimizedBatchRejectedResult({
        device,
        commands: normalizedCommands,
        runtimeResult,
        reason,
        plan,
      }) as any;
    }

    const stepResults = getMatchedOptimizedStepResults(runtimeResult.stepResults as Array<any>, normalizedCommands) as Array<any>;
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
  }

  async function executeIosCommand(
    device: string,
    command: string,
    options?: RunTerminalCommandOptions,
    timings?: TerminalServiceTimingMap,
  ): Promise<ReturnType<typeof buildCommandResult> | ReturnType<typeof createRuntimeUnavailableResult>> {
    const serviceTimings = timings ?? {};
    const runtimeTerminal = deps.runtimeTerminal;
    const executionTimeout = options?.timeoutMs ?? 45000;
    const bridgeTimeout = executionTimeout + 5000;
    const buildPlan = () =>
      buildUniversalTerminalPlan({
        id: deps.generateId(),
        device,
        command,
        deviceKind: "ios",
        mode: options?.mode,
        allowConfirm: options?.allowConfirm,
        allowDestructive: options?.allowDestructive,
        timeoutMs: executionTimeout,
      });

    const plan = measureServiceSync(serviceTimings, "buildIosPlanMs", buildPlan);

    const { isReady, heartbeat, heartbeatAgeMs, reason } = readinessChecker.checkReadiness({
      isHighRiskCommand: isHighRiskIosCommand(command, plan),
    });

    if (!isReady) {
      return createRuntimeUnavailableResult({
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        health: heartbeat,
        reason: reason ?? "PT_RUNTIME_UNAVAILABLE",
      });
    }

    if (runtimeTerminal?.runTerminalPlan) {
      const runPlan = async (planToRun: typeof plan, timingName: string) => {
        const startedAt = Date.now();

        try {
          return await runtimeTerminal.runTerminalPlan(planToRun, { timeoutMs: bridgeTimeout });
        } finally {
          serviceTimings[timingName] =
            (serviceTimings[timingName] ?? 0) + Math.max(0, Date.now() - startedAt);
        }
      };

      let runtimeResult = (await runPlan(plan, "runtimeTerminalRunPlanMs")) as any;

      if (isRecoverableEmptyTerminalTimeout(runtimeResult, command)) {
        const retryDelayMs = 350;
        serviceTimings.runtimeTerminalRetryCount =
          (serviceTimings.runtimeTerminalRetryCount ?? 0) + 1;

        if (typeof runtimeTerminal.ensureSession === "function") {
          await measureServiceAsync(serviceTimings, "runtimeTerminalRetryEnsureSessionMs", async () => {
            try {
              await runtimeTerminal.ensureSession(device);
            } catch {
              // Best-effort recovery: retry still proceeds because some PT sessions recover lazily.
            }
          });
        }

        await measureServiceAsync(serviceTimings, "runtimeTerminalRetryDelayMs", () =>
          sleep(retryDelayMs),
        );

        const retryPlan = measureServiceSync(serviceTimings, "buildIosRetryPlanMs", buildPlan);
        const retryResult = (await runPlan(retryPlan, "runtimeTerminalRetryRunPlanMs")) as any;

        runtimeResult = attachRuntimeRetryEvidence(retryResult, {
          reason: "empty_terminal_timeout",
          attempts: 2,
          firstRuntimeResult: runtimeResult,
          retryDelayMs,
        });
      }

      if (!runtimeResult.ok && hasPagerSuppressionSteps(plan.steps)) {
        recordTerminalLengthZeroResult(device, false);

        const retryPlan = measureServiceSync(serviceTimings, "buildIosPlanNoPagerMs", () =>
          buildUniversalTerminalPlan({
            id: deps.generateId(),
            device,
            command,
            deviceKind: "ios",
            mode: options?.mode,
            allowConfirm: options?.allowConfirm,
            allowDestructive: options?.allowDestructive,
            timeoutMs: executionTimeout,
          }),
        );
        retryPlan.steps = stripPagerSuppressionSteps(retryPlan.steps);

        const retryResult = (await runPlan(retryPlan, "runtimeTerminalRetryRunPlanMs")) as any;

        if (retryResult.ok) {
          const warnings = [
            ...(retryResult.warnings ?? []),
            {
              code: "IOS_PAGING_PRELUDE_UNSUPPORTED",
              message: `Device '${device}' rejected 'terminal length 0'; continuing without pager prelude.`,
              retryable: false,
            },
          ];

          const rawOutput = firstString(retryResult.rawOutput, retryResult.output);
          const barrier = applyTerminalEvidenceBarrier({ command, rawOutput });

          if (barrier.override && barrier.error) {
            return buildCommandResult({
              ok: false,
              action: "ios.exec",
              device,
              deviceKind: "ios",
              command,
              output: firstString(retryResult.output),
              rawOutput,
              status: 1,
              warnings: [...warnings, ...barrier.error.warnings],
              evidence: retryResult.evidence,
              error: {
                code: barrier.error.code,
                message: barrier.error.message,
                phase: "execution",
              },
            });
          }

          return buildCommandResult({
            ok: true,
            action: "ios.exec",
            device,
            deviceKind: "ios",
            command,
            output: firstString(retryResult.output),
            rawOutput,
            status: Number(retryResult.status ?? 0),
            warnings,
            evidence: retryResult.evidence,
          });
        }

        runtimeResult = retryResult;
      }

      if (!runtimeResult.ok) {
        const iosFailure = extractIosFailureDetails({
          output: getRuntimeFailureText(runtimeResult),
          error: runtimeResult.error,
          parsed: runtimeResult.parsed,
        });

        return buildCommandResult({
          ok: false,
          action: "ios.exec",
          device,
          deviceKind: "ios",
          command,
          output: firstString(runtimeResult.output),
          rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
          status: Number(runtimeResult.status ?? 1),
          error: {
            code: iosFailure.code,
            message: iosFailure.message,
            phase: "execution",
          },
          warnings: runtimeResult.warnings,
          evidence: runtimeResult.evidence,
        });
      }

      const semanticFailure = detectIosSemanticFailureFromRuntimeResult(runtimeResult);

      if (semanticFailure) {
        return buildCommandResult({
          ok: false,
          action: "ios.exec",
          device,
          deviceKind: "ios",
          command,
          output: firstString(runtimeResult.output),
          rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
          status: 1,
          error: {
            code: semanticFailure.code,
            message: semanticFailure.message,
            phase: "execution",
          },
          warnings: runtimeResult.warnings,
          evidence: runtimeResult.evidence,
        });
      }

      const autoConfigFinalModeFailure = detectAutoConfigFinalModeFailure(plan, runtimeResult);

      if (autoConfigFinalModeFailure) {
        return buildCommandResult({
          ok: false,
          action: "ios.exec",
          device,
          deviceKind: "ios",
          command,
          output: firstString(runtimeResult.output),
          rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
          status: 1,
          error: {
            code: autoConfigFinalModeFailure.code,
            message: autoConfigFinalModeFailure.message,
            phase: "execution",
          },
          warnings: runtimeResult.warnings,
          evidence: runtimeResult.evidence,
        });
      }

      const rawOutput = firstString(runtimeResult.rawOutput, runtimeResult.output);

      const barrier = applyTerminalEvidenceBarrier({ command, rawOutput });

      if (barrier.override && barrier.error) {
        return buildCommandResult({
          ok: false,
          action: "ios.exec",
          device,
          deviceKind: "ios",
          command,
          output: firstString(runtimeResult.output),
          rawOutput,
          status: 1,
          warnings: barrier.error.warnings,
          evidence: runtimeResult.evidence,
          error: {
            code: barrier.error.code,
            message: barrier.error.message,
            phase: "execution",
          },
        });
      }

      return buildCommandResult({
        ok: true,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        output: firstString(runtimeResult.output),
        rawOutput,
        status: Number(runtimeResult.status ?? 0),
        warnings: runtimeResult.warnings,
        evidence: runtimeResult.evidence,
      });
    }

    let execResult: any;

    try {
      const startedAt = Date.now();
      execResult = await deps.controller.execIos(device, command, false, executionTimeout);
      serviceTimings.legacyExecIosMs = (serviceTimings.legacyExecIosMs ?? 0) + Math.max(0, Date.now() - startedAt);
    } catch (error) {
      const err = error as any;

      return buildCommandResult({
        ok: false,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        output: firstString(
          err?.details?.output,
          err?.details?.evidence?.raw,
          err?.details?.parsed?.raw,
          err?.output,
          err?.raw,
        ),
        rawOutput: firstString(
          err?.details?.rawOutput,
          err?.details?.output,
          err?.details?.evidence?.raw,
          err?.details?.parsed?.raw,
          err?.output,
          err?.raw,
        ),
        status: 1,
        error: {
          code: String(
            err?.code ??
              err?.error?.code ??
              (String(err?.message ?? "").includes("Timeout waiting for result")
                ? "IOS_RESULT_TIMEOUT"
                : "IOS_EXEC_FAILED")
          ),
          message: String(err?.message ?? err?.error?.message ?? "Error en ejecución de comando IOS"),
          phase: "execution",
        },
        warnings: [],
        evidence: {
          thrown: true,
          details: err?.details ?? null,
          stack: err?.stack ?? null,
        },
      });
    }

    const output = firstString(
      execResult.raw,
      execResult.output,
      execResult.evidence?.raw,
      execResult.parsed?.raw,
      execResult.parsed?.output,
      execResult.error?.details?.output,
    );

    const ok = Boolean(execResult.ok ?? false);
    const semanticFailure = detectIosSemanticFailureFromRuntimeResult(execResult);

    if (!ok) {
      const evidence = execResult.evidence as any;
      const events = Array.isArray(evidence?.events) ? evidence.events : [];
      const parsedError = (execResult.parsed as any)?.error;
      const failureEvent = events.find((e: any) => e?.error || e?.code);
      const iosFailure = extractIosFailureDetails({
        output,
        error: parsedError,
      });

      return buildCommandResult({
        ok: false,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        output,
        rawOutput: firstString(
          execResult.rawOutput,
          execResult.raw,
          execResult.output,
          execResult.evidence?.raw,
          execResult.parsed?.raw,
          execResult.parsed?.output,
          execResult.error?.details?.output,
        ),
        status: 1,
        error: {
          code: String(parsedError?.code ?? failureEvent?.code ?? iosFailure.code),
          message: String(parsedError?.message ?? failureEvent?.error ?? iosFailure.message),
          phase: "execution",
        },
        warnings: execResult.warnings,
        evidence,
      });
    }

    if (semanticFailure) {
      return buildCommandResult({
        ok: false,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        output,
        rawOutput: firstString(
          execResult.rawOutput,
          execResult.raw,
          execResult.output,
          execResult.evidence?.raw,
          execResult.parsed?.raw,
          execResult.parsed?.output,
          execResult.error?.details?.output,
        ),
        status: 1,
        error: {
          code: semanticFailure.code,
          message: semanticFailure.message,
          phase: "execution",
        },
        warnings: execResult.warnings,
        evidence: execResult.evidence,
      });
    }

    return buildCommandResult({
      ok: true,
      action: "ios.exec",
      device,
      deviceKind: "ios",
      command,
      output,
      rawOutput: firstString(
        execResult.rawOutput,
        execResult.raw,
        execResult.output,
        execResult.evidence?.raw,
        execResult.parsed?.raw,
        execResult.parsed?.output,
        execResult.error?.details?.output,
      ),
      status: 0,
      warnings: execResult.warnings,
      evidence: execResult.evidence,
    });
  }

  return {
    executeIosCommand,
    executeIosCommandBatchOptimized,
  };
}
