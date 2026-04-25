import type { RealScenarioDefinition } from "./real-scenario-types.js";
import type { ExecutionOutcome } from "../real-run-types.js";
import { getRealRunStore } from "../real-run-store.js";
import { terminalRegressionCases } from "../profiles/terminal-regression-profile.js";

/**
 * Escenario: Terminal Regression - Smoke tests para terminal IOS y host.
 *
 * Itera sobre los casos definidos en terminal-regression-profile.ts y ejecuta
 * cada comando verificando que el output contenga los strings esperados.
 *
 * Tags: ["terminal", "regression", "smoke"]
 * Profile: ["terminal-regression", "smoke"]
 */
export const terminalRegressionScenario: RealScenarioDefinition = {
  id: "terminal-regression",
  title: "Terminal Regression Suite",
  tags: ["terminal", "regression", "smoke", "terminal-regression"],
  profile: ["terminal-regression", "smoke"],
  dependsOn: [],

  async setup(_ctx) {
    // No setup needed - runs on existing lab
  },

  async execute(ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[]; error?: string }> {
    const controller = ctx.controller as any;
    const store = getRealRunStore();
    const results: { caseId: string; ok: boolean; output: string; error?: string }[] = [];
    const warnings: string[] = [];

    for (const testCase of terminalRegressionCases) {
      try {
        const result = await controller.execIos(testCase.device, testCase.command);
        const rawOutput = result.raw ?? JSON.stringify(result);
        const ok = result.ok && testCase.expectedOutputIncludes?.every(str => rawOutput.includes(str));
        results.push({ caseId: testCase.id, ok, output: rawOutput });
      } catch (e: unknown) {
        results.push({ caseId: testCase.id, ok: false, output: "", error: String(e) });
      }
    }

    const failed = results.filter(r => !r.ok);
    store.writeStepArtifact(ctx.runId, this.id, "execute", "results.json", JSON.stringify(results, null, 2));

    return {
      outcome: failed.length === 0 ? "passed" : "failed",
      evidence: { results },
      warnings,
      error: failed.length > 0 ? `${failed.length} cases failed` : undefined,
    };
  },

  async verify(_ctx): Promise<{ outcome: ExecutionOutcome; evidence: Record<string, unknown>; warnings: string[] }> {
    return { outcome: "passed" as const, evidence: {}, warnings: [] };
  },

  async cleanup(_ctx) {
    // No cleanup needed
  },
};