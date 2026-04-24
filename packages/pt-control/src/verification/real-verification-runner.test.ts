import { describe, expect, test } from "bun:test";
import { executeScenario } from "./real-verification-runner.js";

test("executeScenario se detiene si setup expira", async () => {
  const llamadas: string[] = [];

  const scenario = {
    id: "scenario-timeout",
    title: "Scenario timeout",
    tags: ["smoke"],
    profile: ["smoke"],
    dependsOn: [],
    setup: async () => {
      llamadas.push("setup");
      await new Promise(() => {});
    },
    execute: async () => {
      llamadas.push("execute");
      return { outcome: "passed", evidence: {}, warnings: [] };
    },
    verify: async () => {
      llamadas.push("verify");
      return { outcome: "passed", evidence: {}, warnings: [] };
    },
    cleanup: async () => {
      llamadas.push("cleanup");
    },
  } as any;

  const state = {
    runId: "run-1",
    profile: "smoke",
    startedAt: Date.now(),
    continueOnError: true,
    attemptRecovery: true,
    maxRecoveryAttempts: 1,
    commandTimeoutMs: 5,
    scenarios: [],
    scenarioResults: [],
    warnings: [],
    fatalErrors: [],
    environmentDegraded: false,
    recoveryCounts: { attempted: 0, succeeded: 0, failed: 0 },
  } as any;

  const harness = {
    prepareScenario: async () => {},
    cleanupScenario: async () => ({ ok: true, warnings: [] }),
    cleanupRun: async () => {},
    getController: () => ({}) ,
    markScenarioContaminated: () => {},
    markRunDegraded: () => {},
    isContaminated: () => false,
    isDegraded: () => false,
  } as any;

  const store = {
    writeScenarioResult: () => {},
  } as any;

  const result = await executeScenario(scenario, state, harness, store);

  expect(result.outcome).toBe("aborted");
  expect(llamadas).toEqual(["setup"]);
});
