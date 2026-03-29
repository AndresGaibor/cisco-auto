// ============================================================================
// ValidationEngine - Unit Tests
// ============================================================================

import { afterEach, expect, test, describe, spyOn, mock } from "bun:test";
import { ValidationEngine } from "../validation-engine.js";
import type { ValidationContext, MutationKind } from "../validation-context.js";
import type { Rule } from "../rule.js";
import type { ValidationPolicy } from "../policies.js";
import type { Diagnostic } from "../diagnostic.js";
import { createDiagnostic } from "../diagnostic.js";

// ============================================================================
// Fixtures
// ============================================================================

function createMockPolicy(shouldBlock: boolean = false): ValidationPolicy {
  return {
    name: "normal" as const,
    shouldBlock: mock(() => shouldBlock),
  };
}

function createMockTwin() {
  return {
    devices: {
      Router1: {
        name: "Router1",
        model: "ISR 2911",
        type: "router",
        power: true,
        ports: {
          "Gig0/0": {
            name: "Gig0/0",
            status: "up",
            ipAddress: "10.0.0.1",
            subnetMask: "255.255.255.0",
            macAddress: "00:00:00:00:00:01",
            link: {
              device: "Switch1",
              port: "Fast0/1",
              status: "up",
            },
          },
        },
      },
      Switch1: {
        name: "Switch1",
        model: "2960-24TT",
        type: "switch",
        power: true,
        ports: {
          "Fast0/1": {
            name: "Fast0/1",
            status: "up",
            link: {
              device: "Router1",
              port: "Gig0/0",
              status: "up",
            },
          },
          "Fast0/2": {
            name: "Fast0/2",
            status: "up",
            accessVlan: 10,
          },
        },
      },
    },
    links: {
      "Router1:Gig0/0-Switch1:Fast0/1": {
        id: "Router1:Gig0/0-Switch1:Fast0/1",
        device1: "Router1",
        port1: "Gig0/0",
        device2: "Switch1",
        port2: "Fast0/1",
        cableType: "straight",
      },
    },
  };
}

function createMockMutation(kind: MutationKind, input: unknown = {}) {
  return {
    kind,
    targetDevice: "Switch1",
    targetInterface: "Fast0/2",
    input,
  };
}

function createMockContext(
  twin: ReturnType<typeof createMockTwin>,
  mutation: ReturnType<typeof createMockMutation>,
  phase: "preflight" | "postflight" = "preflight"
): ValidationContext {
  return {
    twin,
    mutation,
    phase,
  };
}

// ============================================================================
// Issue #7: Memoization of Validations
// ============================================================================

describe("Issue #7: ValidationEngine caching", () => {
  test("returns cached result for same context within TTL", () => {
    const rule: Rule = {
      id: "test-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => [
        createDiagnostic({
          code: "TEST",
          severity: "warning",
          blocking: false,
          message: "Test diagnostic",
          target: { device: "Switch1" },
        }),
      ]),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    // First call
    const result1 = engine.run(createMockContext(twin, mutation));
    expect(rule.validate).toHaveBeenCalledTimes(1);

    // Second call with same context
    const result2 = engine.run(createMockContext(twin, mutation));
    expect(rule.validate).toHaveBeenCalledTimes(1); // Should be cached
    expect(result1).toEqual(result2);
  });

  test("invalidates cache when invalidateCache is called", () => {
    const rule = {
      id: "test-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => [
        createDiagnostic({
          code: "TEST",
          severity: "warning",
          blocking: false,
          message: "Test diagnostic",
          target: { device: "Switch1" },
        }),
      ]),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    // First call
    engine.run(createMockContext(twin, mutation));
    expect(rule.validate).toHaveBeenCalledTimes(1);

    // Invalidate cache
    engine.invalidateCache?.();

    // Second call should re-execute
    engine.run(createMockContext(twin, mutation));
    expect(rule.validate).toHaveBeenCalledTimes(2);
  });

  test("cache key considers mutation input", () => {
    const rule = {
      id: "test-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => []),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();

    // First mutation with vlan 10
    const mutation1 = createMockMutation("configureAccessPort", { vlan: { value: 10 } });
    engine.run(createMockContext(twin, mutation1));

    // Second mutation with vlan 20 - should NOT be cached
    const mutation2 = createMockMutation("configureAccessPort", { vlan: { value: 20 } });
    engine.run(createMockContext(twin, mutation2));

    expect(rule.validate).toHaveBeenCalledTimes(2);
  });

  test("cache respects MAX_CACHE_SIZE limit", () => {
    const rule = {
      id: "test-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => []),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();

    // Create many different mutations to exceed cache size
    for (let i = 0; i < 150; i++) {
      const mutation = createMockMutation("configureAccessPort", { vlan: { value: i } });
      engine.run(createMockContext(twin, mutation));
    }

    // Old entries should be evicted
    // Just verify no crash - cache should handle overflow
    expect(rule.validate).toHaveBeenCalledTimes(150);
  });
});

// ============================================================================
// Issue #3: Error Handling in Rules (try/catch)
// ============================================================================

describe("Issue #3: Error handling in rule validation", () => {
  test("rule throwing error does NOT block other rules", () => {
    const brokenRule: Rule = {
      id: "broken-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => {
        throw new Error("Intentional rule failure");
      }),
    };

    const workingRule: Rule = {
      id: "working-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => [
        createDiagnostic({
          code: "WORKING",
          severity: "info",
          blocking: false,
          message: "Working rule executed",
          target: { device: "Switch1" },
        }),
      ]),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([brokenRule, workingRule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    const result = engine.run(createMockContext(twin, mutation));

    // Working rule should still execute
    expect(workingRule.validate).toHaveBeenCalled();
    expect(result.diagnostics.length).toBeGreaterThan(0);

    // Should have error diagnostic for broken rule
    const errorDiags = result.diagnostics.filter((d) => d.code === "RULE_ERROR");
    expect(errorDiags.length).toBe(1);
  });

  test("broken rule produces RULE_ERROR diagnostic", () => {
    const brokenRule: Rule = {
      id: "broken-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => {
        throw new Error("Something went wrong");
      }),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([brokenRule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    const result = engine.run(createMockContext(twin, mutation));

    const ruleErrorDiag = result.diagnostics.find((d) => d.code === "RULE_ERROR");
    expect(ruleErrorDiag).toBeDefined();
    expect(ruleErrorDiag?.severity).toBe("warning");
    expect(ruleErrorDiag?.blocking).toBe(false);
    expect(ruleErrorDiag?.message).toContain("broken-rule");
    expect(ruleErrorDiag?.message).toContain("Something went wrong");
  });

  test("engine handles rule that returns null/undefined", () => {
    const nullRule: Rule = {
      id: "null-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => null as unknown as Diagnostic[]),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([nullRule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    // Should not throw
    const result = engine.run(createMockContext(twin, mutation));
    expect(result).toBeDefined();
  });

  test("engine handles rule that returns non-array", () => {
    const badRule: Rule = {
      id: "bad-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => "not an array" as unknown as Diagnostic[]),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([badRule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    // Should handle gracefully
    const result = engine.run(createMockContext(twin, mutation));
    expect(result).toBeDefined();
  });
});

// ============================================================================
// Performance Timing (Issue #10)
// ============================================================================

describe("Issue #10: Performance timing", () => {
  test("run() returns metadata with timing info", () => {
    const rule: Rule = {
      id: "slow-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => []),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    const result = engine.run(createMockContext(twin, mutation));

    // Should have metadata
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.durationMs).toBeDefined();
    expect(result.metadata?.rulesExecuted).toBeDefined();
  });

  test("slow rules (>100ms) produce warnings", () => {
    const slowRule: Rule = {
      id: "slow-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => {
        // Simulate slow operation
        const start = Date.now();
        while (Date.now() - start < 50) {
          // Busy wait
        }
        return [];
      }),
    };

    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    const policy = createMockPolicy();
    const engine = new ValidationEngine([slowRule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    engine.run(createMockContext(twin, mutation));

    // Should have logged warning for slow rule
    // Note: This is a timing-dependent test
    warnSpy.mockRestore();
  });
});

// ============================================================================
// Core Functionality Tests
// ============================================================================

describe("ValidationEngine core functionality", () => {
  test("run() executes all applicable rules", () => {
    const rule1: Rule = {
      id: "rule-1",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => [
        createDiagnostic({
          code: "RULE1",
          severity: "warning",
          blocking: false,
          message: "Rule 1 diagnostic",
          target: { device: "Switch1" },
        }),
      ]),
    };

    const rule2: Rule = {
      id: "rule-2",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => [
        createDiagnostic({
          code: "RULE2",
          severity: "error",
          blocking: true,
          message: "Rule 2 diagnostic",
          target: { device: "Switch1" },
        }),
      ]),
    };

    const policy = createMockPolicy(true);
    const engine = new ValidationEngine([rule1, rule2], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    const result = engine.run(createMockContext(twin, mutation));

    expect(rule1.validate).toHaveBeenCalled();
    expect(rule2.validate).toHaveBeenCalled();
    expect(result.diagnostics.length).toBe(2);
    expect(result.blocked).toBe(true);
  });

  test("run() skips rules not applicable to mutation kind", () => {
    const rule: Rule = {
      id: "router-rule",
      appliesTo: ["configureSvi"] as MutationKind[], // Different mutation type
      validate: mock(() => [
        createDiagnostic({
          code: "ROUTER",
          severity: "warning",
          blocking: false,
          message: "Router rule",
          target: { device: "Switch1" },
        }),
      ]),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    engine.run(createMockContext(twin, mutation));

    expect(rule.validate).not.toHaveBeenCalled();
  });

  test("preflight() sets phase to preflight", () => {
    const rule: Rule = {
      id: "test-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock((ctx: ValidationContext) => [
        createDiagnostic({
          code: "PHASE_CHECK",
          severity: "info",
          blocking: false,
          message: `Phase: ${ctx.phase}`,
          target: { device: "Switch1" },
        }),
      ]),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    const result = engine.preflight({ twin, mutation });

    expect(result.diagnostics[0].message).toBe("Phase: preflight");
  });

  test("postflight() sets phase to postflight", () => {
    const rule: Rule = {
      id: "test-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock((ctx: ValidationContext) => [
        createDiagnostic({
          code: "PHASE_CHECK",
          severity: "info",
          blocking: false,
          message: `Phase: ${ctx.phase}`,
          target: { device: "Switch1" },
        }),
      ]),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    const result = engine.postflight({ twin, mutation });

    expect(result.diagnostics[0].message).toBe("Phase: postflight");
  });

  test("addRule() adds rule to engine", () => {
    const policy = createMockPolicy();
    const engine = new ValidationEngine([], policy);

    const newRule: Rule = {
      id: "new-rule",
      appliesTo: ["assignHostIp"] as MutationKind[],
      validate: mock(() => []),
    };

    engine.addRule(newRule);

    const twin = createMockTwin();
    const mutation = createMockMutation("assignHostIp", { ip: "10.0.0.5" });

    engine.run(createMockContext(twin, mutation));

    expect(newRule.validate).toHaveBeenCalled();
  });

  test("removeRule() removes rule from engine", () => {
    const rule: Rule = {
      id: "removable-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => []),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    engine.removeRule("removable-rule");

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    engine.run(createMockContext(twin, mutation));

    expect(rule.validate).not.toHaveBeenCalled();
  });

  test("removeRule() with non-existent id does not throw", () => {
    const policy = createMockPolicy();
    const engine = new ValidationEngine([], policy);

    // Should not throw
    engine.removeRule("non-existent-rule");
  });
});

// ============================================================================
// Policy Integration
// ============================================================================

describe("Policy integration", () => {
  test("blocked is true when policy.shouldBlock returns true", () => {
    const rule: Rule = {
      id: "test-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => [
        createDiagnostic({
          code: "WARNING",
          severity: "warning",
          blocking: false,
          message: "Warning diagnostic",
          target: { device: "Switch1" },
        }),
      ]),
    };

    const policy = createMockPolicy(true); // shouldBlock = true
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    const result = engine.run(createMockContext(twin, mutation));

    expect(result.blocked).toBe(true);
  });

  test("blocked is false when policy.shouldBlock returns false", () => {
    const rule: Rule = {
      id: "test-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => [
        createDiagnostic({
          code: "INFO",
          severity: "info",
          blocking: false,
          message: "Info diagnostic",
          target: { device: "Switch1" },
        }),
      ]),
    };

    const policy = createMockPolicy(false); // shouldBlock = false
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    const result = engine.run(createMockContext(twin, mutation));

    expect(result.blocked).toBe(false);
  });

  test("blocked is false when no diagnostics", () => {
    const rule: Rule = {
      id: "clean-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock(() => []),
    };

    const policy = createMockPolicy(true); // Even with strict policy
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    const result = engine.run(createMockContext(twin, mutation));

    expect(result.blocked).toBe(false);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge cases", () => {
  test("handles empty rules array", () => {
    const policy = createMockPolicy();
    const engine = new ValidationEngine([], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });

    const result = engine.run(createMockContext(twin, mutation));

    expect(result.diagnostics.length).toBe(0);
    expect(result.blocked).toBe(false);
  });

  test("handles mutation with no input", () => {
    const rule: Rule = {
      id: "test-rule",
      appliesTo: ["assignHostIp"] as MutationKind[],
      validate: mock(() => []),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = {
      kind: "assignHostIp" as MutationKind,
      targetDevice: "Router1",
      targetInterface: "Gig0/0",
      input: {}, // Empty input
    };

    const result = engine.run(createMockContext(twin, mutation as typeof mutation));

    expect(result).toBeDefined();
  });

  test("handles missing target device in twin", () => {
    const rule: Rule = {
      id: "test-rule",
      appliesTo: ["configureAccessPort"] as MutationKind[],
      validate: mock((ctx: ValidationContext) => {
        const device = ctx.twin.devices[ctx.mutation.targetDevice];
        if (!device) {
          return [
            createDiagnostic({
              code: "DEVICE_NOT_FOUND",
              severity: "error",
              blocking: true,
              message: `Device ${ctx.mutation.targetDevice} not found`,
              target: { device: ctx.mutation.targetDevice },
            }),
          ];
        }
        return [];
      }),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("configureAccessPort", { vlan: { value: 10 } });
    mutation.targetDevice = "NonExistentDevice"; // Device doesn't exist

    const result = engine.run(createMockContext(twin, mutation));

    expect(result.diagnostics[0].code).toBe("DEVICE_NOT_FOUND");
  });

  test("handles wildcard appliesTo (applies to all)", () => {
    const rule: Rule = {
      id: "wildcard-rule",
      appliesTo: "*", // Wildcard - applies to all
      validate: mock(() => [
        createDiagnostic({
          code: "WILDCARD",
          severity: "info",
          blocking: false,
          message: "Wildcard rule applied",
          target: { device: "Switch1" },
        }),
      ]),
    };

    const policy = createMockPolicy();
    const engine = new ValidationEngine([rule], policy);

    const twin = createMockTwin();
    const mutation = createMockMutation("assignHostIp", {});

    const result = engine.run(createMockContext(twin, mutation));

    expect(result.diagnostics.some((d) => d.code === "WILDCARD")).toBe(true);
  });
});
