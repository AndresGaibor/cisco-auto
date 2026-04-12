// packages/pt-runtime/src/__tests__/domain/deferred-job-plan.test.ts
import { describe, test, expect } from "bun:test";
import {
  createDeferredJobPlan,
  ensureModeStep,
  commandStep,
  confirmStep,
  expectPromptStep,
  saveConfigStep,
} from "../../domain/deferred-job-plan";

describe("createDeferredJobPlan", () => {
  test("creates plan with id", () => {
    const plan = createDeferredJobPlan("R1", [
      commandStep("show version"),
    ]);
    
    expect(plan.id).toMatch(/^ios_job_/);
    expect(plan.device).toBe("R1");
    expect(plan.kind).toBe("ios-session");
    expect(plan.version).toBe(1);
    expect(plan.plan).toHaveLength(1);
  });

  test("uses custom options", () => {
    const plan = createDeferredJobPlan("R1", [], {
      stopOnError: false,
      commandTimeoutMs: 5000,
    });
    
    expect(plan.options.stopOnError).toBe(false);
    expect(plan.options.commandTimeoutMs).toBe(5000);
  });
});

describe("step builders", () => {
  test("ensureModeStep", () => {
    const step = ensureModeStep("privileged");
    expect(step.type).toBe("ensure-mode");
    expect(step.value).toBe("privileged");
  });

  test("commandStep", () => {
    const step = commandStep("show version", { timeoutMs: 10000 });
    expect(step.type).toBe("command");
    expect(step.value).toBe("show version");
    expect(step.options?.timeoutMs).toBe(10000);
  });

  test("confirmStep", () => {
    const step = confirmStep();
    expect(step.type).toBe("confirm");
    expect(step.value).toBeUndefined();
  });

  test("expectPromptStep", () => {
    const step = expectPromptStep("Router#");
    expect(step.type).toBe("expect-prompt");
    expect(step.value).toBe("Router#");
  });

  test("saveConfigStep", () => {
    const step = saveConfigStep();
    expect(step.type).toBe("save-config");
  });
});