import { describe, expect, test } from "bun:test";
import {
  buildDefaultTerminalPolicies,
  buildDefaultTerminalTimeouts,
  buildTerminalPoliciesForPlan,
  buildTerminalTimeoutsForPlan,
  isLongOutputIosShowCommand,
  isReadOnlyExecCommand,
  normalizeIosCommand,
  requiresPrivilegedIosCommand,
  shouldPrepareLongOutputShow,
} from "./terminal-plan-policies.js";

describe("terminal-plan-policies", () => {
  test("show running-config requiere privileged", () => {
    expect(requiresPrivilegedIosCommand("show running-config")).toBe(true);
  });

  test("show version no requiere privileged", () => {
    expect(requiresPrivilegedIosCommand("show version")).toBe(false);
  });

  test("configure terminal requiere privileged", () => {
    expect(requiresPrivilegedIosCommand("configure terminal")).toBe(true);
  });

  test("show ip route es long-output", () => {
    expect(isLongOutputIosShowCommand("show ip route")).toBe(true);
  });

  test("show version no es long-output", () => {
    expect(isLongOutputIosShowCommand("show version")).toBe(false);
  });

  test("long-output aumenta timeout y maxPagerAdvances", () => {
    expect(
      buildTerminalTimeoutsForPlan(
        {
          id: "plan-1",
          device: "SW1",
          command: "show ip route",
          deviceKind: "ios",
          timeoutMs: 12000,
        },
        ["show ip route"],
      ),
    ).toEqual({
      commandTimeoutMs: 90000,
      stallTimeoutMs: 25000,
    });

    expect(
      buildTerminalPoliciesForPlan(
        {
          id: "plan-1",
          device: "SW1",
          command: "show ip route",
          deviceKind: "ios",
          timeoutMs: 12000,
        },
        ["show ip route"],
      ).maxPagerAdvances,
    ).toBe(120);
  });

  test("raw mode no activa long-output policy", () => {
    expect(
      shouldPrepareLongOutputShow(
        {
          id: "plan-raw",
          device: "SW1",
          command: "show ip route",
          deviceKind: "ios",
          mode: "raw",
        },
        ["show ip route"],
      ),
    ).toBe(false);
  });

  test("normalizeIosCommand compacta espacios", () => {
    expect(normalizeIosCommand("  SHOW   VERSION  ")).toBe("show version");
  });

  test("isReadOnlyExecCommand detecta show", () => {
    expect(isReadOnlyExecCommand("show version")).toBe(true);
  });

  test("buildDefaultTerminalTimeouts y policies conservan defaults", () => {
    expect(buildDefaultTerminalTimeouts(12000)).toEqual({
      commandTimeoutMs: 12000,
      stallTimeoutMs: 15000,
    });

    expect(buildDefaultTerminalPolicies({ mode: "safe" })).toMatchObject({
      autoBreakWizard: true,
      autoAdvancePager: true,
      maxPagerAdvances: 80,
      maxConfirmations: 0,
      abortOnPromptMismatch: false,
      abortOnModeMismatch: true,
    });
  });
});
