import { describe, expect, test } from "bun:test";
import {
  buildDefaultTerminalPolicies,
  buildDefaultTerminalTimeouts,
  buildStallTimeoutForCommand,
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
      stallTimeoutMs: 12000,
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

  test("buildStallTimeoutForCommand para show usa timeout rapido", () => {
    expect(buildStallTimeoutForCommand("show version")).toBe(5000);
    expect(buildStallTimeoutForCommand("show ip interface brief")).toBe(5000);
    expect(buildStallTimeoutForCommand("ping 192.168.1.1")).toBe(5000);
  });

  test("buildStallTimeoutForCommand para config usa timeout largo", () => {
    expect(buildStallTimeoutForCommand("configure terminal")).toBe(20000);
    expect(buildStallTimeoutForCommand("interface g0/0")).toBe(20000);
    expect(buildStallTimeoutForCommand("router ospf 1")).toBe(20000);
    expect(buildStallTimeoutForCommand("vlan 10")).toBe(20000);
  });

  test("buildStallTimeoutForCommand para save/reload usa timeout largo", () => {
    expect(buildStallTimeoutForCommand("write memory")).toBe(20000);
    expect(buildStallTimeoutForCommand("copy running-config startup-config")).toBe(20000);
    expect(buildStallTimeoutForCommand("reload")).toBe(20000);
  });

  test("buildStallTimeoutForCommand para config commands normales usa timeout normal", () => {
    expect(buildStallTimeoutForCommand("no shutdown")).toBe(12000);
    expect(buildStallTimeoutForCommand("ip address 192.168.1.1 255.255.255.0")).toBe(12000);
    expect(buildStallTimeoutForCommand("description uplink")).toBe(12000);
  });

  test("buildStallTimeoutForCommand para comandos desconocidos usa timeout normal", () => {
    expect(buildStallTimeoutForCommand("enable")).toBe(12000);
    expect(buildStallTimeoutForCommand("exit")).toBe(12000);
  });
});
