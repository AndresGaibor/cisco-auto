import type { TerminalDeviceKind, RunTerminalCommandOptions } from "@cisco-auto/terminal-contracts";
import type { RuntimeTerminalPort } from "../../../ports/runtime-terminal-port.js";
import { parseTerminalOutput } from "../../../pt/terminal/terminal-output-parsers.js";
import { verifyTerminalEvidence } from "../../../pt/terminal/terminal-evidence-verifier.js";
import { buildUniversalTerminalPlan, splitCommandLines } from "../terminal-plan-builder.js";
import { measureServiceSync, type TerminalServiceTimingMap } from "./command-timing-recorder.js";
import { createTerminalReadinessChecker, type HeartbeatHealth } from "./terminal-readiness-checker.js";
import {
  buildCommandResult,
  createRuntimeUnavailableResult,
  detectIosSemanticFailure,
  extractIosFailureDetails,
  firstString,
  isPrivilegedIosCommand,
  normalizeWarnings,
} from "./command-result-mapper.js";

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

function isIosConfigModeText(value: unknown): boolean {
  const text = String(value ?? "").trim().toLowerCase();

  return (
    text.startsWith("global-config") ||
    text.startsWith("interface-config") ||
    text.startsWith("router-config") ||
    text.startsWith("line-config") ||
    text.startsWith("config") ||
    /\(config[^)]*\)#\s*$/.test(text)
  );
}

function getLastNonEmptyLine(value: unknown): string {
  const lines = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.at(-1) ?? "";
}

function isIosPrivilegedPromptText(value: unknown): boolean {
  const text = String(value ?? "").trim();

  return /^[A-Za-z0-9._-]+#\s*$/.test(text) && !/\(config[^)]*\)#\s*$/.test(text);
}

function inferRuntimeFinalPromptFromOutput(runtimeResult: any): string {
  return getLastNonEmptyLine(
    firstString(
      runtimeResult?.rawOutput,
      runtimeResult?.output,
      runtimeResult?.raw,
      runtimeResult?.result?.raw,
      runtimeResult?.result?.output,
    ),
  );
}

function getRuntimeFailureText(runtimeResult: any): string {
  return firstString(
    runtimeResult?.parsed?.result?.output,
    runtimeResult?.parsed?.result?.rawOutput,
    runtimeResult?.parsed?.result?.raw,
    runtimeResult?.rawOutput,
    runtimeResult?.output,
    runtimeResult?.error?.message,
    runtimeResult?.error,
  );
}

function getRuntimeModeAfter(runtimeResult: any): string {
  return String(
    runtimeResult?.modeAfter ??
      runtimeResult?.session?.modeAfter ??
      runtimeResult?.session?.mode ??
      runtimeResult?.parsed?.session?.modeAfter ??
      runtimeResult?.parsed?.session?.mode ??
      "",
  );
}

function getRuntimePromptAfter(runtimeResult: any): string {
  return String(
    runtimeResult?.promptAfter ??
      runtimeResult?.session?.promptAfter ??
      runtimeResult?.session?.prompt ??
      runtimeResult?.parsed?.session?.promptAfter ??
      runtimeResult?.parsed?.session?.prompt ??
      "",
  );
}

function detectAutoConfigFinalModeFailure(
  plan: any,
  runtimeResult: any,
): { code: string; message: string } | null {
  const metadata = plan?.metadata as { autoConfig?: unknown } | undefined;

  if (metadata?.autoConfig !== true) {
    return null;
  }

  const modeAfter = getRuntimeModeAfter(runtimeResult);
  const promptAfter = getRuntimePromptAfter(runtimeResult);
  const rawOutput = firstString(runtimeResult?.rawOutput, runtimeResult?.output);
  const finalPromptFromOutput = inferRuntimeFinalPromptFromOutput(runtimeResult);

  if (isIosPrivilegedPromptText(finalPromptFromOutput)) {
    return null;
  }

  if (isIosConfigModeText(modeAfter) || isIosConfigModeText(promptAfter)) {
    return {
      code: "IOS_AUTOCONFIG_DID_NOT_EXIT_CONFIG_MODE",
      message:
        `Auto-config terminó en modo configuración. modeAfter=${JSON.stringify(modeAfter)} ` +
        `promptAfter=${JSON.stringify(promptAfter)} ` +
        `finalPromptFromOutput=${JSON.stringify(finalPromptFromOutput)}\n` +
        rawOutput,
    };
  }

  return null;
}

function detectIosSemanticFailureFromRuntimeResult(runtimeResult: any): { code: string; message: string } | null {
  return detectIosSemanticFailure(
    firstString(runtimeResult?.rawOutput, runtimeResult?.output, runtimeResult?.raw),
  );
}

function isHighRiskIosCommand(command: string, plan: any): boolean {
  if (plan?.metadata?.autoConfig === true) {
    return true;
  }

  return splitCommandLines(command).some(isPrivilegedIosCommand);
}

function inferCapabilityId(command: string): string | null {
  const normalized = String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();

  if (/^show\s+running-config$/i.test(normalized)) return "terminal.show-running-config";
  if (/^show\s+startup-config$/i.test(normalized)) return "terminal.show-startup-config";
  if (/^show\s+version$/i.test(normalized)) return "terminal.show-version";
  if (/^show\s+ip\s+interface\s+brief$/i.test(normalized)) return "terminal.show-ip-interface-brief";
  if (/^show\s+vlan(?:\s+brief)?$/i.test(normalized)) return "terminal.show-vlan-brief";
  if (/^show\s+cdp\s+neighbors$/i.test(normalized)) return "terminal.show-cdp-neighbors";
  if (/^show\s+ip\s+route$/i.test(normalized)) return "terminal.show-ip-route";
  if (/^show\s+access-lists?$/i.test(normalized)) return "terminal.show-access-lists";

  return null;
}

function applyEvidenceBarrier(params: {
  capabilityId: string;
  command: string;
  rawOutput: string;
  runtimeResult: any;
}): { override: boolean; error?: { code: string; message: string; warnings: string[] } } {
  const { capabilityId, rawOutput } = params;

  const parsed = parseTerminalOutput(capabilityId, rawOutput);
  const verdict = verifyTerminalEvidence(capabilityId, rawOutput, parsed, 0);

  if (verdict.evidenceOk) {
    return { override: false };
  }

  return {
    override: true,
    error: {
      code: "IOS_OUTPUT_COMMAND_MISMATCH",
      message: verdict.reason ?? "La salida no corresponde al comando ejecutado",
      warnings: verdict.warnings,
    },
  };
}

export function createIosCommandExecutor(deps: IosCommandExecutorDeps) {
  const readinessChecker = createTerminalReadinessChecker({
    controller: deps.controller as any,
  });

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
    const plan = measureServiceSync(serviceTimings, "buildIosPlanMs", () =>
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
      const runtimeResult = (await (async () => {
        const startedAt = Date.now();
        try {
          return await runtimeTerminal.runTerminalPlan(plan, { timeoutMs: bridgeTimeout });
        } finally {
          serviceTimings.runtimeTerminalRunPlanMs = (serviceTimings.runtimeTerminalRunPlanMs ?? 0) + Math.max(0, Date.now() - startedAt);
        }
      })()) as any;

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

      const capabilityId = inferCapabilityId(command);
      const rawOutput = firstString(runtimeResult.rawOutput, runtimeResult.output);

      if (capabilityId) {
        const barrier = applyEvidenceBarrier({
          capabilityId,
          command,
          rawOutput,
          runtimeResult,
        });

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
    const semanticFailure = detectIosSemanticFailure(output);

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
  };
}