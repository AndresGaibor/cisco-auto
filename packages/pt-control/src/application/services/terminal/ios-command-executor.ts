import type { TerminalDeviceKind, RunTerminalCommandOptions } from "@cisco-auto/terminal-contracts";
import type { RuntimeTerminalPort } from "../../../ports/runtime-terminal-port.js";
import { buildUniversalTerminalPlan, mergeConsecutiveCommandSteps, splitCommandLines } from "../terminal-plan-builder.js";
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
import { buildFailureResult, buildSuccessResult } from "./ios-command-result-builders.js";
import { buildOptimizedBatchSubResultsFromSteps, getBatchStepDurationMs } from "./ios-command-batch-result-builders.js";
import {
  attachRuntimeRetryEvidence,
  isRecoverableEmptyTerminalTimeout,
} from "./ios-retry-policy.js";
import { executeIosCommandBatchOptimized as executeBatchOptimized, type IosCommandBatchDeps } from "./ios-command-batch.js";

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

export function createIosCommandExecutor(deps: IosCommandExecutorDeps) {
  const readinessChecker = createTerminalReadinessChecker({
    controller: deps.controller as any,
  });

  const batchDeps: IosCommandBatchDeps = {
    runtimeTerminal: deps.runtimeTerminal,
    controller: deps.controller,
    generateId: deps.generateId,
  };

  async function executeIosCommandBatchOptimized(
    device: string,
    commands: string[],
    options?: RunTerminalCommandOptions,
    timings?: TerminalServiceTimingMap,
  ): Promise<ReturnType<typeof buildCommandResult> | null> {
    return executeBatchOptimized(batchDeps, device, commands, options, timings);
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
    plan.steps = mergeConsecutiveCommandSteps(plan.steps);

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
      let semanticFailure = detectIosSemanticFailureFromRuntimeResult(runtimeResult);

      if (hasPagerSuppressionSteps(plan.steps) && (semanticFailure || !runtimeResult.ok)) {
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
            return buildFailureResult({
              result: { device, command, output: firstString(retryResult.output), rawOutput, status: 1, warnings },
              reason: { code: barrier.error.code, message: barrier.error.message },
              output: firstString(retryResult.output),
              rawOutput,
              status: 1,
              warnings: [...warnings, ...barrier.error.warnings],
              evidence: retryResult.evidence,
            });
          }

          return buildSuccessResult({
            result: { device, command, warnings },
            output: firstString(retryResult.output),
            rawOutput,
            status: Number(retryResult.status ?? 0),
            warnings,
            evidence: retryResult.evidence,
          });
        }

        runtimeResult = retryResult;
        semanticFailure = detectIosSemanticFailureFromRuntimeResult(runtimeResult);
      }

      if (isRecoverableEmptyTerminalTimeout(runtimeResult, command)) {
        const retryDelayMs = 350;
        serviceTimings.runtimeTerminalRetryCount =
          (serviceTimings.runtimeTerminalRetryCount ?? 0) + 1;

        if (typeof runtimeTerminal.ensureSession === "function") {
          await measureServiceAsync(serviceTimings, "runtimeTerminalRetryEnsureSessionMs", async () => {
            try {
              await runtimeTerminal.ensureSession(device);
            } catch {
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

        semanticFailure = detectIosSemanticFailureFromRuntimeResult(runtimeResult);
      }

      if (semanticFailure) {
        return buildFailureResult({
          result: { device, command },
          reason: { code: semanticFailure.code, message: semanticFailure.message },
          output: firstString(runtimeResult.output),
          rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
          status: 1,
          warnings: runtimeResult.warnings,
          evidence: runtimeResult.evidence,
        });
      }

      if (!runtimeResult.ok) {
        const iosFailure = extractIosFailureDetails({
          output: getRuntimeFailureText(runtimeResult),
          error: runtimeResult.error,
          parsed: runtimeResult.parsed,
        });

        return buildFailureResult({
          result: { device, command },
          reason: { code: iosFailure.code, message: iosFailure.message },
          output: firstString(runtimeResult.output),
          rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
          status: Number(runtimeResult.status ?? 1),
          warnings: runtimeResult.warnings,
          evidence: runtimeResult.evidence,
        });
      }

      const autoConfigFinalModeFailure = detectAutoConfigFinalModeFailure(plan, runtimeResult);

      if (autoConfigFinalModeFailure) {
        return buildFailureResult({
          result: { device, command },
          reason: { code: autoConfigFinalModeFailure.code, message: autoConfigFinalModeFailure.message },
          output: firstString(runtimeResult.output),
          rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
          status: 1,
          warnings: runtimeResult.warnings,
          evidence: runtimeResult.evidence,
        });
      }

      const rawOutput = firstString(runtimeResult.rawOutput, runtimeResult.output);

      const barrier = applyTerminalEvidenceBarrier({ command, rawOutput });

      if (barrier.override && barrier.error) {
        return buildFailureResult({
          result: { device, command, output: firstString(runtimeResult.output) },
          reason: { code: barrier.error.code, message: barrier.error.message },
          output: firstString(runtimeResult.output),
          rawOutput,
          status: 1,
          warnings: barrier.error.warnings,
          evidence: runtimeResult.evidence,
        });
      }

      return buildSuccessResult({
        result: { device, command },
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
