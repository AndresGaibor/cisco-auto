import { describe, expect, test } from "bun:test";
import {
  buildDefaultTerminalPolicies,
  buildDefaultTerminalTimeouts,
  buildUniversalTerminalPlan,
  splitCommandLines,
} from "./terminal-plan-builder.js";
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

    expect(plan.steps.map((step: TerminalPlanStep) => step.command)).toEqual([
      "configure terminal",
      "interface g0/0",
      "no shutdown",
      "end",
    ]);
    expect(plan.targetMode).toBe("global-config");
  });
});
