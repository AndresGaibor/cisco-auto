// ============================================================================
// Standard Plans - Biblioteca de planes terminal reutilizables
// ============================================================================

import { createTerminalPlan, createCommandStep, type TerminalPlanStep } from "./terminal-plan";
import type { TerminalMode } from "./session-state";

function defaultTimeouts() {
  return {
    commandTimeoutMs: 15000,
    stallTimeoutMs: 5000,
  };
}

function defaultPolicies() {
  return {
    autoBreakWizard: true,
    autoAdvancePager: true,
    maxPagerAdvances: 50,
    maxConfirmations: 3,
    abortOnPromptMismatch: false,
    abortOnModeMismatch: true,
  };
}

export function createIosShowPlan(deviceName: string, command: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(command, { allowPager: true }),
  ], {
    targetMode: "privileged-exec",
    timeouts: defaultTimeouts(),
    policies: {
      ...defaultPolicies(),
      autoAdvancePager: true,
    },
  });
}

export function createIosConfigPlan(
  deviceName: string,
  commands: string[],
  options?: { save?: boolean },
) {
  const steps: TerminalPlanStep[] = [];

  steps.push({ kind: "command", command: "configure terminal", expectMode: "global-config" });

  for (const cmd of commands) {
    steps.push({ kind: "command", command: cmd, expectMode: "global-config" });
  }

  if (options?.save) {
    steps.push({ kind: "command", command: "end", expectMode: "privileged-exec" });
    steps.push({ kind: "command", command: "copy running-config startup-config" });
  }

  return createTerminalPlan(deviceName, steps, {
    targetMode: "global-config",
    timeouts: { commandTimeoutMs: 20000, stallTimeoutMs: 5000 },
    policies: defaultPolicies(),
  });
}

export function createIosEnablePlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    { kind: "ensureMode", expectMode: "privileged-exec" },
  ], {
    targetMode: "privileged-exec",
    timeouts: defaultTimeouts(),
    policies: defaultPolicies(),
  });
}

export function createIosSaveConfigPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    { kind: "ensureMode", expectMode: "privileged-exec" },
    { kind: "command", command: "copy running-config startup-config" },
  ], {
    targetMode: "privileged-exec",
    timeouts: { commandTimeoutMs: 20000, stallTimeoutMs: 8000 },
    policies: { ...defaultPolicies(), autoAdvancePager: false },
  });
}

export function createHostPingPlan(deviceName: string, target: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(`ping ${target}`),
  ], {
    targetMode: "host-prompt",
    timeouts: { commandTimeoutMs: 30000, stallTimeoutMs: 10000 },
    policies: { ...defaultPolicies(), autoAdvancePager: false, abortOnModeMismatch: false },
  });
}

export function createHostIpconfigPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("ipconfig"),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostTracertPlan(deviceName: string, target: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(`tracert ${target}`),
  ], {
    targetMode: "host-prompt",
    timeouts: { commandTimeoutMs: 60000, stallTimeoutMs: 30000 },
    policies: { ...defaultPolicies(), autoAdvancePager: false, abortOnModeMismatch: false },
  });
}

export function createHostArpPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("arp -a"),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostRoutePlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("route print"),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostNslookupPlan(deviceName: string, target: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(`nslookup ${target}`),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostNetstatPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("netstat"),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostHistoryPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("history"),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostTelnetPlan(deviceName: string, target: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(`telnet ${target}`),
  ], {
    targetMode: "host-prompt",
    timeouts: { commandTimeoutMs: 20000, stallTimeoutMs: 10000 },
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostSshPlan(deviceName: string, user: string, target: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(`ssh -l ${user} ${target}`),
  ], {
    targetMode: "host-prompt",
    timeouts: { commandTimeoutMs: 20000, stallTimeoutMs: 10000 },
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function buildIosBootstrapPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("terminal length 0", { expectMode: "privileged-exec" }),
    createCommandStep("terminal width 512", { expectMode: "privileged-exec", optional: true }),
    createCommandStep("configure terminal", { expectMode: "global-config" }),
    createCommandStep("line console 0", { expectMode: "config-line" }),
    createCommandStep("exec-timeout 0 0", { expectMode: "config-line" }),
    createCommandStep("logging synchronous", { expectMode: "config-line" }),
    createCommandStep("exit", { expectMode: "global-config" }),
    createCommandStep("no ip domain-lookup", { expectMode: "global-config", optional: true }),
    createCommandStep("end", { expectMode: "privileged-exec" }),
  ], {
    targetMode: "privileged-exec",
    timeouts: defaultTimeouts(),
    policies: defaultPolicies(),
  });
}
