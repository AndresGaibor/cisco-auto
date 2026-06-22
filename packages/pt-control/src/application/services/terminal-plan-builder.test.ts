import { describe, expect, test } from "bun:test";
import {
  buildUniversalTerminalPlan,
  splitCommandLines,
} from "./terminal-plan-builder.js";
import {
  buildDefaultTerminalPolicies,
  buildDefaultTerminalTimeouts,
} from "./terminal-plan-policies.js";
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
      stallTimeoutMs: 12000,
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
    expect(plan.targetMode).toBe("privileged-exec");
  });

  test("buildUniversalTerminalPlan inserta enable y pager suppression para show IOS", () => {
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
      "command",
      "command",
    ]);
    expect(plan.steps[0]).toMatchObject({
      kind: "ensureMode",
      expectMode: "privileged-exec",
    });
    expect(plan.steps[1]).toMatchObject({
      kind: "command",
      command: "terminal length 0",
      optional: true,
    });
    expect(plan.steps[2]).toMatchObject({
      kind: "command",
      command: "terminal width 512",
      optional: true,
    });
    expect(plan.steps[3]).toMatchObject({
      kind: "command",
      command: "show running-config",
    });
  });

  test("buildUniversalTerminalPlan inserta terminal length 0 para show running-config", () => {
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
      "command",
      "command",
    ]);
    expect(plan.steps[0]).toMatchObject({
      kind: "ensureMode",
      expectMode: "privileged-exec",
    });
    expect(plan.steps[1]).toMatchObject({
      kind: "command",
      command: "terminal length 0",
      optional: true,
    });
    expect(plan.steps[2]).toMatchObject({
      kind: "command",
      command: "terminal width 512",
      optional: true,
    });
    expect(plan.steps[3]).toMatchObject({
      kind: "command",
      command: "show running-config",
    });
  });

  test("prepara show interfaces con budget largo y pager suppression", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-show-interfaces",
      device: "SW1",
      command: "show interfaces",
      deviceKind: "ios",
      mode: "safe",
    });

    expect(plan.metadata?.autoConfig).toBe(false);
    expect(plan.timeouts).toEqual({
      commandTimeoutMs: 90000,
      stallTimeoutMs: 25000,
    });
    expect(plan.policies?.maxPagerAdvances).toBe(120);
    expect(plan.steps.map((step: TerminalPlanStep) => step.command ?? step.expectMode)).toEqual([
      "terminal length 0",
      "terminal width 512",
      "show interfaces",
    ]);
    expect(plan.steps[2]).toMatchObject({
      kind: "command",
      command: "show interfaces",
      timeout: 90000,
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

  test("envuelve hostname en configure terminal/end automáticamente", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-hostname",
      device: "SW1",
      command: "hostname SW1-CORE",
      deviceKind: "ios",
      timeoutMs: 12000,
    });

    expect(plan.metadata?.autoConfig).toBe(true);
    expect(plan.targetMode).toBe("privileged-exec");
    expect(plan.steps.map((step: TerminalPlanStep) => step.command ?? step.expectMode)).toEqual([
      "privileged-exec",
      "configure terminal",
      "hostname SW1-CORE",
      "end",
    ]);
  });

  test("envuelve configuración de interfaz automáticamente", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-iface",
      device: "SW1",
      command: "interface f0/1\nswitchport mode access\nno shutdown",
      deviceKind: "ios",
      timeoutMs: 12000,
    });

    expect(plan.metadata?.autoConfig).toBe(true);
    expect(plan.steps.map((step: TerminalPlanStep) => step.command ?? step.expectMode)).toEqual([
      "privileged-exec",
      "configure terminal",
      "interface f0/1",
      "switchport mode access",
      "no shutdown",
      "end",
    ]);
  });

  test("no envuelve show version", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-show-version",
      device: "SW1",
      command: "show version",
      deviceKind: "ios",
      timeoutMs: 12000,
    });

    expect(plan.metadata?.autoConfig).toBe(false);
    expect(plan.steps.map((step: TerminalPlanStep) => step.command ?? step.expectMode)).toEqual([
      "show version",
    ]);
  });

  test("show running-config sigue usando privileged exec sin configure terminal", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-show-run",
      device: "SW1",
      command: "show running-config",
      deviceKind: "ios",
      timeoutMs: 12000,
    });

    expect(plan.metadata?.autoConfig).toBe(false);
    expect(plan.steps.map((step: TerminalPlanStep) => step.command ?? step.expectMode)).toEqual([
      "privileged-exec",
      "terminal length 0",
      "terminal width 512",
      "show running-config",
    ]);
  });

  const longShowCommands = ["show startup-config", "show tech-support"];

  for (const command of [
    "show startup-config",
    "show archive",
    "show tech-support",
    "write memory",
    "copy running-config startup-config",
    "erase startup-config",
    "clear counters",
    "debug ip packet",
    "undebug all",
  ]) {
    test(`auto-eleva comando privilegiado IOS: ${command}`, () => {
      const plan = buildUniversalTerminalPlan({
        id: `plan-${command.replace(/\s+/g, "-")}`,
        device: "SW1",
        command,
        deviceKind: "ios",
        mode: "safe",
        timeoutMs: 12000,
      });

      const isLongShow = longShowCommands.includes(command);
      const commandStepIndex = isLongShow ? 3 : 1;

      expect(plan.metadata?.autoConfig).toBe(false);
      expect(plan.targetMode).toBe("privileged-exec");
      expect(plan.steps[0]).toMatchObject({
        kind: "ensureMode",
        expectMode: "privileged-exec",
        metadata: {
          reason: "auto-enable-for-privileged-ios-command",
        },
      });

      if (isLongShow) {
        expect(plan.steps[1]).toMatchObject({
          kind: "command",
          command: "terminal length 0",
          optional: true,
        });
        expect(plan.steps[2]).toMatchObject({
          kind: "command",
          command: "terminal width 512",
          optional: true,
        });
      }

      expect(plan.steps[commandStepIndex]).toMatchObject({
        kind: "command",
        command,
      });

      if (command === "show tech-support") {
        expect(plan.timeouts).toEqual({
          commandTimeoutMs: 90000,
          stallTimeoutMs: 25000,
        });
        expect(plan.policies?.maxPagerAdvances).toBe(120);
        expect(plan.steps[commandStepIndex]).toMatchObject({
          kind: "command",
          command,
          timeout: 90000,
        });
      }

      const visibleCommands = plan.steps
        .map((step: TerminalPlanStep) => step.command)
        .filter(Boolean);

      expect(visibleCommands).not.toContain("configure terminal");
      expect(visibleCommands).not.toContain("end");
    });
  }

  test("raw mode no auto-eleva show running-config", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-show-run-raw",
      device: "SW1",
      command: "show running-config",
      deviceKind: "ios",
      mode: "raw",
      timeoutMs: 12000,
    });

    expect(plan.metadata?.autoConfig).toBe(false);
    expect(plan.steps.map((step: TerminalPlanStep) => step.command ?? step.expectMode)).toEqual([
      "show running-config",
    ]);
  });

  test("raw mode no inyecta pager suppression para show vlan brief", () => {
    const plan = buildUniversalTerminalPlan({
      id: "test-raw-show-vlan",
      device: "MLS-CORE-1",
      deviceKind: "ios",
      command: "show vlan brief",
      mode: "raw",
      timeoutMs: 12000,
    });

    const rendered = JSON.stringify(plan);

    expect(rendered).toContain("show vlan brief");
    expect(rendered).not.toContain("terminal length 0");
    expect(rendered).not.toContain("terminal width 512");
    expect(plan.targetMode).toBeUndefined();
    expect(plan.metadata?.autoConfig).toBe(false);
  });

  test("show version permanece como comando exec normal sin auto-enable", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-show-version-no-auto-enable",
      device: "SW1",
      command: "show version",
      deviceKind: "ios",
      mode: "safe",
      timeoutMs: 12000,
    });

    expect(plan.metadata?.autoConfig).toBe(false);
    expect(plan.targetMode).toBeUndefined();
    expect(plan.steps.map((step: TerminalPlanStep) => step.command ?? step.expectMode)).toEqual([
      "show version",
    ]);
  });

  test("no duplica configure terminal/end cuando el comando ya viene envuelto por --config", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-explicit-config",
      device: "SW1",
      command: "configure terminal\nhostname SW1\nend",
      deviceKind: "ios",
      timeoutMs: 12000,
    });

    const commands = plan.steps
      .map((step: TerminalPlanStep) => step.command)
      .filter(Boolean);

    expect(commands.filter((cmd) => cmd === "configure terminal")).toHaveLength(1);
    expect(commands.filter((cmd) => cmd === "end")).toHaveLength(1);
    expect(plan.metadata?.autoConfig).toBe(false);
  });

  test("raw mode desactiva auto-config", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-raw-hostname",
      device: "SW1",
      command: "hostname SW1-CORE",
      deviceKind: "ios",
      mode: "raw",
      timeoutMs: 12000,
    });

    expect(plan.metadata?.autoConfig).toBe(false);
    expect(plan.steps.map((step: TerminalPlanStep) => step.command ?? step.expectMode)).toEqual([
      "hostname SW1-CORE",
    ]);
  });

  test("host no usa auto-config IOS", () => {
    const plan = buildUniversalTerminalPlan({
      id: "plan-host",
      device: "PC1",
      command: "ipconfig",
      deviceKind: "host",
      timeoutMs: 12000,
    });

    expect(plan.metadata?.autoConfig).toBeUndefined();
    expect(plan.targetMode).toBe("host-prompt");
    expect(plan.steps.map((step: TerminalPlanStep) => step.command)).toEqual(["ipconfig"]);
  });
});
