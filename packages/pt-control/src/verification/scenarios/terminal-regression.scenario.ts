import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";
import {
  terminalRegressionCases,
  type TerminalRegressionCase,
} from "../profiles/terminal-regression-profile.js";

type NormalizedCommandResult = {
  ok: boolean;
  raw: string;
  output: string;
  errorCode?: string;
  errorMessage?: string;
  promptAfter?: string;
  modeAfter?: string;
  durationMs?: number;
  original: unknown;
};

const TERMINAL_REGRESSION_SCENARIO_ID = "terminal-regression";

function capabilityIdForHostCommand(command: string): string {
  const cmd = command.trim().toLowerCase();

  if (cmd === "ipconfig" || cmd.startsWith("ipconfig ")) return "host.ipconfig";
  if (cmd === "ping" || cmd.startsWith("ping ")) return "host.ping";
  if (cmd === "tracert" || cmd.startsWith("tracert ")) return "host.tracert";
  if (cmd === "nslookup" || cmd.startsWith("nslookup ")) return "host.nslookup";
  if (cmd === "arp" || cmd.startsWith("arp ")) return "host.arp";
  if (cmd === "netstat" || cmd.startsWith("netstat ")) return "host.netstat";
  if (cmd === "route" || cmd.startsWith("route ")) return "host.route";
  if (cmd === "telnet" || cmd.startsWith("telnet ")) return "host.telnet";

  return "host.exec";
}

function inferSemanticCodeFromOutput(output: string, deviceKind: "ios" | "host"): string {
  const text = output.toLowerCase();

  if (deviceKind === "ios") {
    if (text.includes("% invalid input detected")) return "IOS_INVALID_INPUT";
    if (text.includes("% incomplete command")) return "IOS_INCOMPLETE_COMMAND";
    if (text.includes("% ambiguous command")) return "IOS_AMBIGUOUS_COMMAND";
    if (text.includes("translating...")) return "IOS_DNS_LOOKUP_TRIGGERED";
    return "";
  }

  if (
    text.includes("invalid command") ||
    text.includes("bad command or file name") ||
    text.includes("not recognized")
  ) {
    return "HOST_INVALID_COMMAND";
  }

  if (text.includes("request timed out")) return "HOST_NETWORK_TIMEOUT";
  if (text.includes("destination host unreachable")) return "HOST_UNREACHABLE";
  if (text.includes("could not find host") || text.includes("unknown host")) {
    return "HOST_DNS_FAILURE";
  }

  return "";
}

function normalizeResult(result: any, thrown?: unknown): NormalizedCommandResult {
  if (thrown) {
    const err = thrown as any;
    const details = err?.details ?? err?.error?.details ?? {};

    const raw = String(
      details?.output ??
        details?.evidence?.raw ??
        details?.parsed?.raw ??
        details?.parsed?.output ??
        err?.raw ??
        err?.output ??
        err?.message ??
        String(thrown),
    );

    return {
      ok: false,
      raw,
      output: raw,
      errorCode: String(
        err?.code ??
          err?.error?.code ??
          details?.parsed?.error?.code ??
          "THROWN_ERROR",
      ),
      errorMessage: String(err?.message ?? err?.error?.message ?? String(thrown)),
      promptAfter: details?.evidence?.prompt ?? details?.parsed?.session?.promptAfter,
      modeAfter: details?.evidence?.mode ?? details?.parsed?.session?.modeAfter,
      original: thrown,
    };
  }

  const raw = String(
    result?.raw ??
      result?.output ??
      result?.evidence?.raw ??
      result?.error?.details?.output ??
      result?.error?.details?.evidence?.raw ??
      result?.parsed?.raw ??
      result?.parsed?.output ??
      result?.verdict?.reason ??
      "",
  );

  const ok = Boolean(
    result?.ok ??
      result?.success ??
      (result?.verdict ? result.verdict.ok : undefined),
  );

  return {
    ok,
    raw,
    output: raw,
    errorCode: String(
      result?.error?.code ??
        result?.parsed?.error?.code ??
        result?.error?.details?.parsed?.error?.code ??
        result?.verdict?.code ??
        "",
    ),
    errorMessage: String(
      result?.error?.message ??
        result?.parsed?.error?.message ??
        result?.error?.details?.parsed?.error?.message ??
        result?.verdict?.reason ??
        "",
    ),
    promptAfter: String(
      result?.evidence?.prompt ??
        result?.promptAfter ??
        result?.parsed?.session?.promptAfter ??
        result?.error?.details?.evidence?.prompt ??
        "",
    ),
    modeAfter: String(
      result?.evidence?.mode ??
        result?.modeAfter ??
        result?.parsed?.session?.modeAfter ??
        result?.error?.details?.evidence?.mode ??
        "",
    ),
    durationMs: Number(
      result?.durationMs ??
        result?.parsed?.durationMs ??
        result?.diagnostics?.durationMs ??
        0,
    ),
    original: result,
  };
}

async function runCommand(
  controller: any,
  testCase: TerminalRegressionCase,
  command: string,
): Promise<NormalizedCommandResult> {
  try {
    let normalized: NormalizedCommandResult;

    if (testCase.deviceKind === "host") {
      const result = await controller.execHost(
        testCase.device,
        command,
        capabilityIdForHostCommand(command),
        { timeoutMs: testCase.maxDurationMs },
      );

      normalized = normalizeResult(result);
    } else {
      const result = await controller.execIos(
        testCase.device,
        command,
        false,
        testCase.maxDurationMs,
      );

      normalized = normalizeResult(result);
    }

    if (!normalized.ok && !normalized.errorCode) {
      normalized.errorCode = inferSemanticCodeFromOutput(
        normalized.output || normalized.raw || normalized.errorMessage || "",
        testCase.deviceKind,
      );
    }

    return normalized;
  } catch (error) {
    const normalized = normalizeResult(undefined, error);

    if (!normalized.ok && !normalized.errorCode) {
      const message = String((error as any)?.message ?? "");

      normalized.errorCode =
        message.includes("Timeout waiting for result")
          ? "IOS_RESULT_TIMEOUT"
          : inferSemanticCodeFromOutput(
              normalized.output || normalized.raw || normalized.errorMessage || "",
              testCase.deviceKind,
            );
    }

    return normalized;
  }
}

async function runBestEffortCleanup(
  controller: any,
  testCase: TerminalRegressionCase,
  warnings: string[],
): Promise<void> {
  for (const command of testCase.postCommands ?? []) {
    const result = await runCommand(controller, testCase, command);
    if (!result.ok) {
      warnings.push(
        `postCommand failed for ${testCase.id}: "${command}" — ${result.errorCode || result.errorMessage || "unknown"}`,
      );
    }
  }
}

async function runPreCommands(
  controller: any,
  testCase: TerminalRegressionCase,
): Promise<{ ok: true } | { ok: false; error: string; result: NormalizedCommandResult }> {
  for (const command of testCase.preCommands ?? []) {
    const result = await runCommand(controller, testCase, command);
    if (!result.ok) {
      return {
        ok: false,
        error: `preCommand failed: "${command}" — ${result.errorCode || result.errorMessage || "unknown"}`,
        result,
      };
    }
  }

  return { ok: true };
}

function includesCaseInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function evaluateCase(
  testCase: TerminalRegressionCase,
  result: NormalizedCommandResult,
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (result.ok !== testCase.expectedOk) {
    reasons.push(`expectedOk=${testCase.expectedOk}, got ${result.ok}`);
  }

  const output = result.output || result.raw || "";

  for (const expected of testCase.expectedOutputIncludes ?? []) {
    if (!includesCaseInsensitive(output, expected)) {
      reasons.push(`output missing "${expected}"`);
    }
  }

  if ((testCase.expectedErrorIncludes ?? []).length > 0) {
    const errorHaystack = `${output}\n${result.errorMessage ?? ""}`;

    const matchedAny = testCase.expectedErrorIncludes!.some((expected) =>
      includesCaseInsensitive(errorHaystack, expected),
    );

    if (!matchedAny) {
      reasons.push(
        `error output missing one of: ${testCase.expectedErrorIncludes!.map((x) => `"${x}"`).join(", ")}`,
      );
    }
  }

  if (testCase.expectedErrorCode) {
    if (result.errorCode !== testCase.expectedErrorCode) {
      reasons.push(
        `expected error code ${testCase.expectedErrorCode}, got ${result.errorCode || "(empty)"}; message="${result.errorMessage || ""}"`,
      );
    }
  }

  if (testCase.expectedPromptPattern) {
    if (!includesCaseInsensitive(result.promptAfter ?? "", testCase.expectedPromptPattern)) {
      reasons.push(
        `expected prompt containing "${testCase.expectedPromptPattern}", got "${result.promptAfter || "(empty)"}"`,
      );
    }
  }

  if (testCase.expectedModeAfter) {
    if ((result.modeAfter ?? "") !== testCase.expectedModeAfter) {
      reasons.push(
        `expected modeAfter="${testCase.expectedModeAfter}", got "${result.modeAfter || "(empty)"}"`,
      );
    }
  }

  if (testCase.maxDurationMs && result.durationMs && result.durationMs > testCase.maxDurationMs) {
    reasons.push(`duration ${result.durationMs}ms exceeded ${testCase.maxDurationMs}ms`);
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

export const terminalRegressionScenario: RealScenarioDefinition = {
  id: "terminal-regression",
  title: "Terminal Regression Suite",
  tags: ["terminal", "regression", "smoke", "terminal-regression"],
  profile: ["terminal-regression", "smoke"],
  dependsOn: [],

  timeoutMs: 10 * 60 * 1000,
  executeTimeoutMs: 10 * 60 * 1000,
  setupTimeoutMs: 60 * 1000,
  verifyTimeoutMs: 60 * 1000,
  cleanupTimeoutMs: 60 * 1000,

  async setup(_ctx) {
    // No setup global. Cada caso debe ser determinista vía preCommands/postCommands.
  },

  async execute(ctx): Promise<{
    outcome: ExecutionOutcome;
    evidence: Record<string, unknown>;
    warnings: string[];
    error?: string;
  }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();

    const results: Array<{
      caseId: string;
      description: string;
      device: string;
      deviceKind: string;
      command: string;
      expectedOk: boolean;
      ok: boolean;
      reasons: string[];
      output: string;
      errorCode?: string;
      errorMessage?: string;
      promptAfter?: string;
      modeAfter?: string;
      durationMs?: number;
    }> = [];

    const warnings: string[] = [];

    function writePartialResults(): void {
      store.writeStepArtifact(
        ctx.runId,
        TERMINAL_REGRESSION_SCENARIO_ID,
        "execute",
        "results.json",
        JSON.stringify(results, null, 2),
      );
    }

    for (const testCase of terminalRegressionCases) {
      let caseResult: NormalizedCommandResult | null = null;

      try {
        const pre = await runPreCommands(controller, testCase);
        if (!pre.ok) {
          results.push({
            caseId: testCase.id,
            description: testCase.description,
            device: testCase.device,
            deviceKind: testCase.deviceKind,
            command: testCase.command,
            expectedOk: testCase.expectedOk,
            ok: false,
            reasons: [pre.error],
            output: pre.result.output,
            errorCode: pre.result.errorCode,
            errorMessage: pre.result.errorMessage,
            promptAfter: pre.result.promptAfter,
            modeAfter: pre.result.modeAfter,
            durationMs: pre.result.durationMs,
          });

          writePartialResults();

          continue;
        }

        caseResult = await runCommand(controller, testCase, testCase.command);
        const evaluation = evaluateCase(testCase, caseResult);

        results.push({
          caseId: testCase.id,
          description: testCase.description,
          device: testCase.device,
          deviceKind: testCase.deviceKind,
          command: testCase.command,
          expectedOk: testCase.expectedOk,
          ok: evaluation.ok,
          reasons: evaluation.reasons,
          output: caseResult.output,
          errorCode: caseResult.errorCode,
          errorMessage: caseResult.errorMessage,
          promptAfter: caseResult.promptAfter,
          modeAfter: caseResult.modeAfter,
          durationMs: caseResult.durationMs,
        });

        writePartialResults();
      } catch (error) {
        results.push({
          caseId: testCase.id,
          description: testCase.description,
          device: testCase.device,
          deviceKind: testCase.deviceKind,
          command: testCase.command,
          expectedOk: testCase.expectedOk,
          ok: false,
          reasons: [`unexpected exception: ${String(error)}`],
          output: caseResult?.output ?? "",
          errorCode: caseResult?.errorCode,
          errorMessage: caseResult?.errorMessage ?? String(error),
          promptAfter: caseResult?.promptAfter,
          modeAfter: caseResult?.modeAfter,
          durationMs: caseResult?.durationMs,
        });

        writePartialResults();
      } finally {
        await runBestEffortCleanup(controller, testCase, warnings);
      }
    }

    const failed = results.filter((r) => !r.ok);

    writePartialResults();

    return {
      outcome: failed.length === 0 ? "passed" : "failed",
      evidence: {
        total: results.length,
        passed: results.length - failed.length,
        failed: failed.length,
        results,
      },
      warnings,
      error: failed.length > 0 ? `${failed.length} cases failed` : undefined,
    };
  },

  async verify(_ctx): Promise<{
    outcome: ExecutionOutcome;
    evidence: Record<string, unknown>;
    warnings: string[];
  }> {
    return {
      outcome: "passed",
      evidence: {},
      warnings: [],
    };
  },

  async cleanup(_ctx) {
    // No cleanup global.
  },
};