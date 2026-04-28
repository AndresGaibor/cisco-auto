import { describe, expect, test } from "bun:test";
import { buildUniversalTerminalPlan } from "../application/services/terminal-plan-builder.js";
import { createIosEnablePlan } from "../pt/terminal/standard-terminal-plans.js";

describe("terminal plan builder", () => {
  test("trata enable como transición de modo privilegiado", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-enable",
      device: "R1",
      command: "enable",
      deviceKind: "ios",
      timeoutMs: 5000,
    });

    expect(plan.targetMode).toBe("privileged-exec");
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toMatchObject({
      kind: "ensureMode",
      expectMode: "privileged-exec",
    });
  });

  test("createIosEnablePlan usa ensure-mode", () => {
    const plan = createIosEnablePlan("R1", { id: "ios-enable", timeout: 4000 });

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]).toMatchObject({
      kind: "ensureMode",
      expectMode: "privileged-exec",
      timeout: 4000,
    });
  });
});
