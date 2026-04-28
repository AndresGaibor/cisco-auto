import { describe, expect, test } from "bun:test";
import {
  buildDefaultTerminalPolicies,
  buildDefaultTerminalTimeouts,
  buildUniversalTerminalPlan,
  splitCommandLines,
} from "./terminal-plan-builder.js";
import { createIosRunningConfigPlan } from "../../pt/terminal/standard-terminal-plans.js";
import type { TerminalPlanStep } from "../../ports/runtime-terminal-port.js";

describe("terminal-plan-builder", () => {
  test("splitCommandLines elimina comentarios y líneas vacías", () => {
    expect(splitCommandLines("conf t\n# nope\n\ninterface g0/0\n no shutdown\n")).toEqual([
      "conf t",
      "interface g0/0",
      " no shutdown",
    ]);
  });

  test("buildDefaultTerminalTimeouts usa timeoutMs como commandTimeoutMs", () => {
    expect(buildDefaultTerminalTimeouts(12000)).toEqual({
      commandTimeoutMs: 12000,
      stallTimeoutMs: 15000,
    });
  });

  test("buildDefaultTerminalPolicies activa confirmación solo cuando se pide", () => {
    expect(buildDefaultTerminalPolicies({ mode: "safe" })).toEqual({
      autoBreakWizard: true,
      autoAdvancePager: true,
      maxPagerAdvances: 80,
      maxConfirmations: 0,
      abortOnPromptMismatch: false,
      abortOnModeMismatch: true,
    });

    expect(buildDefaultTerminalPolicies({ mode: "interactive", allowConfirm: true })).toEqual({
      autoBreakWizard: true,
      autoAdvancePager: true,
      maxPagerAdvances: 80,
      maxConfirmations: 5,
      abortOnPromptMismatch: false,
      abortOnModeMismatch: true,
    });
  });

  test("buildUniversalTerminalPlan crea un plan host", () => {
    const plan = buildUniversalTerminalPlan({
      id: "host-plan",
      device: "PC1",
      deviceKind: "host",
      command: "ipconfig",
      mode: "safe",
    });

    expect(plan.targetMode).toBe("host-prompt");
    expect(plan.steps.map((step: TerminalPlanStep) => step.command)).toEqual(["ipconfig"]);
  });

  test("buildUniversalTerminalPlan crea un plan IOS multi-step", () => {
    const plan = buildUniversalTerminalPlan({
      id: "ios-plan",
      device: "R1",
      deviceKind: "ios",
      command: "configure terminal\ninterface g0/0\nno shutdown\nend",
      mode: "safe",
    });

    expect(plan.steps.map((step: TerminalPlanStep) => step.kind)).toEqual([
      "ensureMode",
      "command",
      "command",
      "command",
      "command",
    ]);
    expect(plan.steps[0]).toMatchObject({ kind: "ensureMode", expectMode: "privileged-exec" });
    expect(plan.steps.slice(1).map((step: TerminalPlanStep) => step.command)).toEqual([
      "configure terminal",
      "interface g0/0",
      "no shutdown",
      "end",
    ]);
    expect(plan.targetMode).toBe("global-config");
  });

  test("buildUniversalTerminalPlan inserta enable para show IOS sin desactivar pager", () => {
    const plan = buildUniversalTerminalPlan({
      id: "ios-privileged",
      device: "R1",
      deviceKind: "ios",
      command: "show running-config",
      mode: "safe",
    });

    expect(plan.targetMode).toBe("privileged-exec");
    expect(plan.steps.map((step: TerminalPlanStep) => step.kind)).toEqual([
      "ensureMode",
      "command",
    ]);
    expect(plan.steps[0]).toMatchObject({
      kind: "ensureMode",
      expectMode: "privileged-exec",
    });
    expect(plan.steps[1]).toMatchObject({
      kind: "command",
      command: "show running-config",
    });
  });

  test("buildUniversalTerminalPlan no inserta terminal length 0 para show IOS", () => {
    const plan = buildUniversalTerminalPlan({
      id: "ios-show",
      device: "R1",
      deviceKind: "ios",
      command: "show running-config",
      mode: "safe",
    });

    expect(plan.steps.map((step: TerminalPlanStep) => step.kind)).toEqual([
      "ensureMode",
      "command",
    ]);
    expect(plan.steps[0]).toMatchObject({
      kind: "ensureMode",
      expectMode: "privileged-exec",
    });
    expect(plan.steps[1]).toMatchObject({
      kind: "command",
      command: "show running-config",
      allowPager: true,
    });
  });

  test("createIosRunningConfigPlan solo contiene show running-config", () => {
    const plan = createIosRunningConfigPlan("R1", { id: "running-config", timeout: 9000 });

    expect(plan.steps.map((step: TerminalPlanStep) => step.command)).toEqual([
      "show running-config",
    ]);
    expect(plan.steps[0]).toMatchObject({
      kind: "command",
      command: "show running-config",
      timeout: 9000,
    });
  });
});
