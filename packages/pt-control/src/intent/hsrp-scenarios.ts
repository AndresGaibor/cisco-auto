/**
 * HSRP Scenarios - Preempt, Failover, and Diagnostic Test Cases
 * These scenarios verify HSRP behavior in Packet Tracer
 */

import type { SVIStandbyConfig } from "./vlan-builder.js";
import { HSRP_DEFAULTS } from "./hsrp-builder.js";

export interface HSRPScenarioContext {
  activeRouter: string;
  standbyRouter: string;
  group: number;
  vlanId: number;
  virtualIP: string;
  physicalIPs: { active: string; standby: string };
}

export interface HSRPScenarioExpectation {
  activeRouter?: string;
  standbyRouter?: string;
  virtualIP?: string;
  preemptEnabled?: boolean;
  priority?: number;
  state?: "Active" | "Standby" | "Listen";
}

export interface HSRPScenarioResult {
  scenario: string;
  executed: boolean;
  verified: boolean;
  checks: Array<{
    name: string;
    ok: boolean;
    details?: Record<string, unknown>;
  }>;
  warnings: string[];
}

export function createPreemptScenario(
  context: HSRPScenarioContext,
  higherPriority: number,
): { config: SVIStandbyConfig[]; expectations: HSRPScenarioExpectation } {
  const { activeRouter, standbyRouter, group, vlanId, virtualIP, physicalIPs } = context;

  return {
    config: [
      {
        group,
        virtualIP,
        priority: higherPriority,
        preempt: true,
        version: HSRP_DEFAULTS.version,
      },
      {
        group,
        virtualIP,
        priority: HSRP_DEFAULTS.priority,
        preempt: true,
        version: HSRP_DEFAULTS.version,
      },
    ],
    expectations: {
      activeRouter: activeRouter,
      preemptEnabled: true,
      priority: higherPriority,
    },
  };
}

export function createFailoverScenario(
  context: HSRPScenarioContext,
): { trigger: string; expectations: HSRPScenarioExpectation } {
  const { standbyRouter, group, virtualIP } = context;

  return {
    trigger: "shutdown",
    expectations: {
      activeRouter: standbyRouter,
      state: "Active",
    },
  };
}

export function createStandbyPriorityScenario(
  context: HSRPScenarioContext,
  expectedPriority: number,
): { config: SVIStandbyConfig; expectations: HSRPScenarioExpectation } {
  const { group, virtualIP } = context;

  return {
    config: {
      group,
      virtualIP,
      priority: expectedPriority,
      preempt: true,
      version: HSRP_DEFAULTS.version,
    },
    expectations: {
      priority: expectedPriority,
      preemptEnabled: true,
    },
  };
}

export function createTrackingScenario(
  context: HSRPScenarioContext,
  trackInterface: string,
  decrement: number,
): { config: SVIStandbyConfig; expectations: HSRPScenarioExpectation } {
  const { group, virtualIP } = context;

  return {
    config: {
      group,
      virtualIP,
      priority: HSRP_DEFAULTS.priority + decrement,
      preempt: true,
      trackInterface,
      trackDecrement: decrement,
      version: HSRP_DEFAULTS.version,
    },
    expectations: {
      preemptEnabled: true,
    },
  };
}

export function createAuthScenario(
  context: HSRPScenarioContext,
  authKey: string,
): { config: SVIStandbyConfig; expectations: HSRPScenarioExpectation } {
  const { group, virtualIP } = context;

  return {
    config: {
      group,
      virtualIP,
      priority: HSRP_DEFAULTS.priority,
      preempt: true,
      authentication: authKey,
      version: HSRP_DEFAULTS.version,
    },
    expectations: {
      preemptEnabled: true,
    },
  };
}

export function parseStandbyOutputForGroup(output: string, group: number): {
  state?: string;
  activeRouter?: string;
  standbyRouter?: string;
  virtualIP?: string;
  priority?: number;
  preempt?: boolean;
} {
  const groupMatch = output.match(new RegExp(`Group\\s+${group}[\\s\\S]*?(?=Group\\s+|Standby|^$)`, "i"));
  const block = groupMatch?.[0] ?? "";

  const stateMatch = block.match(/State is (\w+)/i);
  const activeMatch = block.match(/Active router is ([\w.-]+)/i);
  const standbyMatch = block.match(/Standby router is ([\w.-]+)/i);
  const vipMatch = block.match(/Virtual IP(?: address)? is ([\d.]+)/i);
  const priorityMatch = block.match(/Priority\s+(\d+)/i);
  const preemptMatch = block.match(/Preempt (\w+)/i);

  return {
    state: stateMatch?.[1],
    activeRouter: activeMatch?.[1],
    standbyRouter: standbyMatch?.[1],
    virtualIP: vipMatch?.[1],
    priority: priorityMatch?.[1] ? parseInt(priorityMatch[1], 10) : undefined,
    preempt: preemptMatch?.[1]?.toLowerCase() === "enabled" ? true : preemptMatch?.[1]?.toLowerCase() === "yes" ? true : undefined,
  };
}

export function verifyHSRPState(
  actual: ReturnType<typeof parseStandbyOutputForGroup>,
  expected: HSRPScenarioExpectation,
): HSRPScenarioResult {
  const checks: Array<{ name: string; ok: boolean; details?: Record<string, unknown> }> = [];
  const warnings: string[] = [];

  if (expected.state) {
    const ok = actual.state === expected.state;
    checks.push({ name: "state", ok, details: { expected: expected.state, found: actual.state } });
    if (!ok) warnings.push(`State mismatch: expected ${expected.state}, got ${actual.state}`);
  }

  if (expected.activeRouter) {
    const ok = actual.activeRouter === expected.activeRouter || actual.activeRouter === "local";
    checks.push({ name: "active-router", ok, details: { expected: expected.activeRouter, found: actual.activeRouter } });
    if (!ok) warnings.push(`Active router mismatch: expected ${expected.activeRouter}, got ${actual.activeRouter}`);
  }

  if (expected.standbyRouter) {
    const ok = actual.standbyRouter === expected.standbyRouter;
    checks.push({ name: "standby-router", ok, details: { expected: expected.standbyRouter, found: actual.standbyRouter } });
    if (!ok) warnings.push(`Standby router mismatch: expected ${expected.standbyRouter}, got ${actual.standbyRouter}`);
  }

  if (expected.priority !== undefined) {
    const ok = actual.priority === expected.priority;
    checks.push({ name: "priority", ok, details: { expected: expected.priority, found: actual.priority } });
    if (!ok) warnings.push(`Priority mismatch: expected ${expected.priority}, got ${actual.priority}`);
  }

  if (expected.preemptEnabled !== undefined) {
    const ok = actual.preempt === expected.preemptEnabled;
    checks.push({ name: "preempt", ok, details: { expected: expected.preemptEnabled, found: actual.preempt } });
    if (!ok) warnings.push(`Preempt mismatch: expected ${expected.preemptEnabled}, got ${actual.preempt}`);
  }

  const verified = checks.every((c) => c.ok);
  return {
    scenario: "hsrp-state-verification",
    executed: true,
    verified,
    checks,
    warnings,
  };
}