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

  test("marca wrappers auto-config como internos y deja visibles las líneas del usuario", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-auto-config",
      device: "SW1",
      command: "interface range f0/21 - 22\nchannel-group 7 mode active",
      deviceKind: "ios",
      timeoutMs: 5000,
    });

    const visibleCommands = plan.steps
      .filter((step) => (step.metadata as any)?.internal !== true)
      .map((step) => String(step.command ?? "").trim())
      .filter(Boolean);

    expect(plan.metadata).toMatchObject({ autoConfig: true });
    expect(plan.steps[0]).toMatchObject({
      kind: "ensureMode",
      expectMode: "privileged-exec",
    });
    expect(plan.steps[1]).toMatchObject({
      command: "configure terminal",
      metadata: {
        autoConfig: true,
        internal: true,
        autoWrapper: "configure-terminal",
      },
    });
    expect(plan.steps[2]).toMatchObject({
      command: "interface range f0/21 - 22",
      metadata: {
        autoConfig: true,
        originalLineCount: 2,
        userCommand: true,
      },
    });
    expect(plan.steps[3]).toMatchObject({
      command: "channel-group 7 mode active",
      metadata: {
        autoConfig: true,
        originalLineCount: 2,
        userCommand: true,
      },
    });
    expect(plan.steps.at(-1)).toMatchObject({
      command: "end",
      metadata: {
        autoConfig: true,
        internal: true,
        autoWrapper: "end",
      },
    });
    expect(visibleCommands.at(-1)).toBe("channel-group 7 mode active");
  });
});
