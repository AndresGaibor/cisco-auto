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

function extractString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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
    if (testCase.deviceKind === "host") {
      const result = await controller.execHost(
        testCase.device,
        command,
        capabilityIdForHostCommand(command),
        { timeoutMs: testCase.maxDurationMs },
      );

      return normalizeResult(result);
    }

    const result = await controller.execIos(
      testCase.device,
      command,
      false,
      testCase.maxDurationMs,
    );

    return normalizeResult(result);
  } catch (error) {
    return normalizeResult(undefined, error);
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

  for (const expected of testCase.expectedErrorIncludes ?? []) {
    if (!includesCaseInsensitive(output, expected) && !includesCaseInsensitive(result.errorMessage ?? "", expected)) {
      reasons.push(`error output missing "${expected}"`);
    }
  }

  if (testCase.expectedErrorCode) {
    if (result.errorCode !== testCase.expectedErrorCode) {
      reasons.push(`expected error code ${testCase.expectedErrorCode}, got ${result.errorCode || "(empty)"}`);
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

          await runBestEffortCleanup(controller, testCase, warnings);
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
      } finally {
        await runBestEffortCleanup(controller, testCase, warnings);
      }
    }

    const failed = results.filter((r) => !r.ok);

    store.writeStepArtifact(
      ctx.runId,
      this.id,
      "execute",
      "results.json",
      JSON.stringify(results, null, 2),
    );

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