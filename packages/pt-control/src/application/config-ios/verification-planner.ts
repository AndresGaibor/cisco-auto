// ============================================================================
// Verification Planner - Pure functions for IOS config verification
// ============================================================================

import type { VerificationStep, VerificationPlan } from "./config-ios-types.js";

/**
 * Build a verification plan from a list of IOS commands.
 * Returns steps that should be run to verify the config was applied.
 */
export function buildVerificationPlan(commands: string[]): VerificationStep[] {
  const plans: VerificationStep[] = [];

  const unique = Array.from(
    new Set(commands.map((command) => command.trim()).filter(Boolean)),
  );

  if (unique.some((c) => /^vlan\s+\d+/i.test(c))) {
    plans.push({
      kind: "vlan",
      verifyCommand: "show vlan brief",
      assert: (raw, _parsed, original) =>
        original
          .filter((c) => /^vlan\s+\d+/i.test(c))
          .every((c) => {
            const match = c.match(/^vlan\s+(\d+)/i);
            return Boolean(match && raw.includes(match[1]!));
          }),
    });
  }

  if (
    unique.some(
      (c) => /^interface\s+/i.test(c) || /^ip address\s+/i.test(c),
    )
  ) {
    plans.push({
      kind: "interface",
      verifyCommand: "show ip interface brief",
      assert: (raw) => raw.length > 0,
    });
  }

  if (
    unique.some(
      (c) =>
        /^ip route\s+/i.test(c) ||
        /^router\s+/i.test(c) ||
        /\bospf\b/i.test(c) ||
        /\beigrp\b/i.test(c) ||
        /\brip\b/i.test(c),
    )
  ) {
    plans.push({
      kind: "routing",
      verifyCommand: "show ip route",
      assert: (raw) => raw.length > 0,
    });
  }

  if (unique.some((c) => /access-list/i.test(c))) {
    plans.push({
      kind: "acl",
      verifyCommand: "show access-lists",
      assert: (raw) => raw.length > 0,
    });
  }

  if (unique.some((c) => /spanning-tree|\bstp\b/i.test(c))) {
    plans.push({
      kind: "stp",
      verifyCommand: "show spanning-tree",
      assert: (raw) => raw.length > 0,
    });
  }

  if (unique.some((c) => /etherchannel|port-channel/i.test(c))) {
    plans.push({
      kind: "etherchannel",
      verifyCommand: "show etherchannel summary",
      assert: (raw) => raw.length > 0,
    });
  }

  return plans;
}

/**
 * Detect command types from a list of IOS commands.
 * Returns array of detected type labels.
 */
export function detectCommandType(commands: string[]): string[] {
  const types: string[] = [];

  for (const cmd of commands) {
    const c = cmd.toLowerCase();
    if (c.includes("interface")) types.push("interface");
    if (c.includes("vlan")) types.push("vlan");
    if (c.includes("ip route") || c.includes("router")) types.push("routing");
    if (c.includes("access-list")) types.push("acl");
    if (c.includes("spanning") || c.includes("stp")) types.push("stp");
    if (c.includes("etherchannel") || c.includes("port-channel"))
      types.push("etherchannel");
    if (c.includes("line vty") || c.includes("line console")) types.push("line");
    if (
      c.includes("hostname") ||
      c.includes("enable") ||
      c.includes("service")
    )
      types.push("global");
  }

  return [...new Set(types)];
}

/**
 * Build a rich verification plan with metadata about what kinds of
 * verification steps are included.
 */
export function buildVerificationPlanRich(
  commands: string[],
): VerificationPlan {
  const steps = buildVerificationPlan(commands);

  const unique = Array.from(
    new Set(commands.map((c) => c.trim()).filter(Boolean)),
  );

  return {
    steps,
    hasVlan: unique.some((c) => /^vlan\s+\d+/i.test(c)),
    hasInterface: unique.some(
      (c) => /^interface\s+/i.test(c) || /^ip address\s+/i.test(c),
    ),
    hasRouting: unique.some(
      (c) =>
        /^ip route\s+/i.test(c) ||
        /^router\s+/i.test(c) ||
        /\bospf\b/i.test(c) ||
        /\beigrp\b/i.test(c) ||
        /\brip\b/i.test(c),
    ),
    hasAcl: unique.some((c) => /access-list/i.test(c)),
    hasStp: unique.some((c) => /spanning-tree|\bstp\b/i.test(c)),
    hasEtherchannel: unique.some((c) => /etherchannel|port-channel/i.test(c)),
  };
}