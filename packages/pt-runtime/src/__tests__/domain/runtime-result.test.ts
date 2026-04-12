// packages/pt-runtime/src/__tests__/domain/runtime-result.test.ts
import { describe, test, expect } from "bun:test";
import { okResult, errorResult, deferredResult } from "../../domain/runtime-result";
import { createDeferredJobPlan, commandStep } from "../../domain/deferred-job-plan";

describe("okResult", () => {
  test("creates success result", () => {
    const result = okResult("output here");
    
    expect(result.ok).toBe(true);
    expect(result.raw).toBe("output here");
    expect(result.status).toBeUndefined();
  });

  test("creates success result with options", () => {
    const result = okResult("output", {
      status: 0,
      parsed: { version: "15.1" },
      session: { mode: "privileged", prompt: "Router#", paging: false, awaitingConfirm: false },
    });
    
    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.parsed?.version).toBe("15.1");
  });
});

describe("errorResult", () => {
  test("creates error result", () => {
    const result = errorResult("Something went wrong");
    
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Something went wrong");
  });

  test("creates error result with options", () => {
    const result = errorResult("Command failed", {
      code: "CMD_FAILED",
      raw: "Error: Invalid input",
    });
    
    expect(result.ok).toBe(false);
    expect(result.code).toBe("CMD_FAILED");
    expect(result.raw).toBe("Error: Invalid input");
  });
});

describe("deferredResult", () => {
  test("creates deferred result", () => {
    const plan = createDeferredJobPlan("R1", [commandStep("show version")]);
    const result = deferredResult("ticket-123", plan);
    
    expect(result.ok).toBe(true);
    expect(result.deferred).toBe(true);
    expect(result.ticket).toBe("ticket-123");
    expect(result.job).toBe(plan);
  });
});