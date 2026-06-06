# IOS Resilience Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the IOS stack so router, switch, L3 switch, DHCP, routing, ACL/NAT, and recovery flows are capability-aware, error-rich, and resilient.

**Architecture:** Keep `ios-primitives` as the pure capability/error foundation, make `ios-domain` own command planning, parsing, and recovery semantics, and let `pt-control` orchestrate workflows and rollback using those contracts. The implementation should add typed recoverable errors, capability-specific preflight checks, parser confidence/partial results, and recovery hooks without coupling domain logic back into runtime or bridge layers.

**Tech Stack:** TypeScript, Bun tests, `@cisco-auto/ios-primitives`, `@cisco-auto/types`.

---

### Task 1: Enrich IOS capability and error contracts

**Files:**
- Modify: `packages/ios-primitives/src/domain/ios/capability-matrix/capability-types.ts`
- Modify: `packages/ios-primitives/src/domain/ios/capability-matrix/capability-matrix-service.ts`
- Modify: `packages/ios-primitives/src/domain/ios/capability-matrix/model-capabilities.ts`
- Modify: `packages/ios-domain/src/errors.ts`
- Test: `packages/ios-primitives/src/domain/ios/capability-matrix/*.test.ts`
- Test: `packages/ios-domain/src/errors.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("lookupCapability returns the recommended IOS surface for routers", () => {
  const service = createCapabilityMatrixService();
  service.registerDeviceModel("R1", "2911");

  const capability = service.lookupCapability("R1", "static-route");

  expect(capability.supported).toBe(true);
  expect(capability.surface).toBe("ios");
  expect(capability.recommendedSurface).toBe("ios");
  expect(capability.reason).toBeUndefined();
});

test("createIosError infers retryable and phase metadata", () => {
  const error = createIosError({
    code: IOS_ERROR_CODES.TIMEOUT,
    message: "command timed out",
    command: "show ip route",
  });

  expect(error.retryable).toBe(true);
  expect(error.phase).toBe("execute");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/ios-primitives/src/domain/ios/capability-matrix/*.test.ts packages/ios-domain/src/errors.test.ts`
Expected: FAIL because recovery-aware capability metadata and richer error helpers do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
return {
  device,
  model,
  surface: recommendedSurface ?? "ios",
  operation,
  supported,
  recommendedSurface,
  reason: supported ? undefined : opCapability?.notes ?? "Operación no soportada",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/ios-primitives/src/domain/ios/capability-matrix/*.test.ts packages/ios-domain/src/errors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ios-primitives/src/domain/ios/capability-matrix/capability-types.ts packages/ios-primitives/src/domain/ios/capability-matrix/capability-matrix-service.ts packages/ios-primitives/src/domain/ios/capability-matrix/model-capabilities.ts packages/ios-domain/src/errors.ts packages/ios-primitives/src/domain/ios/capability-matrix/*.test.ts packages/ios-domain/src/errors.test.ts
git commit -m "feat: enrich ios capability errors"
```

### Task 2: Make IOS command plans recovery-aware

**Files:**
- Modify: `packages/ios-domain/src/operations/command-plan.ts`
- Modify: `packages/ios-domain/src/operations/configure-vlan.ts`
- Modify: `packages/ios-domain/src/operations/configure-trunk-port.ts`
- Modify: `packages/ios-domain/src/operations/configure-svi.ts`
- Modify: `packages/ios-domain/src/operations/configure-subinterface.ts`
- Modify: `packages/ios-domain/src/operations/configure-static-route.ts`
- Modify: `packages/ios-domain/src/operations/configure-dhcp-pool.ts`
- Test: `packages/ios-domain/tests/operations/*.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("router plans include rollback and recovery metadata", () => {
  const plan = planConfigureStaticRoute(resolveCapabilitySet("2911"), {
    network: Ipv4Address.from("10.10.10.0"),
    mask: SubnetMask.from("255.255.255.0"),
    nextHop: Ipv4Address.from("10.10.10.1"),
  });

  expect(plan?.rollback.length).toBeGreaterThan(0);
  expect(plan?.targetMode).toBe("config");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/ios-domain/tests/operations/*.test.ts`
Expected: FAIL if rollback/recovery metadata is incomplete.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface CommandPlan {
  recovery?: {
    retryable: boolean;
    fallbackMode?: IosMode;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/ios-domain/tests/operations/*.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ios-domain/src/operations/command-plan.ts packages/ios-domain/src/operations/*.ts packages/ios-domain/tests/operations/*.test.ts
git commit -m "feat: make ios plans recovery aware"
```

### Task 3: Harden IOS parsers and partial recovery

**Files:**
- Modify: `packages/ios-domain/src/parsers/parse-with-sanitization.ts`
- Modify: `packages/ios-domain/src/parsers/show-route.ts`
- Modify: `packages/ios-domain/src/parsers/show-run.ts`
- Modify: `packages/ios-domain/src/parsers/show-interface.ts`
- Modify: `packages/ios-domain/src/parsers/show-version.ts`
- Modify: `packages/ios-domain/src/utils/parse-result.ts`
- Test: `packages/ios-domain/src/parsers/*.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("show ip route parser returns partial confidence on truncated output", () => {
  const result = parseShowIpRoute("Gateway of last resort is 10.0.0.1\nS 10.0.0.0/24 via 10.0.0.1\n");
  expect(result.confidence).toBeLessThan(1);
  expect(result.warnings.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/ios-domain/src/parsers/*.test.ts`
Expected: FAIL because partial-confidence handling is not yet applied consistently.

- [ ] **Step 3: Write minimal implementation**

```ts
return createPartialParseResult(parsed, sanitizeResult.cleaned, warnings, options?.source ?? "terminal");
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/ios-domain/src/parsers/*.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ios-domain/src/parsers/*.ts packages/ios-domain/src/utils/parse-result.ts packages/ios-domain/src/parsers/*.test.ts
git commit -m "feat: harden ios parsers"
```

### Task 4: Wire recovery into IOS session execution

**Files:**
- Modify: `packages/ios-domain/src/session/cli-session.ts`
- Modify: `packages/ios-domain/src/session/transaction.ts`
- Modify: `packages/ios-domain/src/session/command-handler.ts`
- Modify: `packages/ios-domain/src/session/cli-session-handlers.ts`
- Modify: `packages/ios-domain/src/session/cli-session-state.ts`
- Test: `packages/ios-domain/src/session/*.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("session can recover from unknown mode by replaying exit and disable", async () => {
  const session = createCliSession("R1", handler, { commandTimeout: 1000 });
  session.markDesynced("prompt lost");
  const recovered = await session.recoverFromUnknownState();
  expect(recovered).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/ios-domain/src/session/*.test.ts`
Expected: FAIL if recovery path does not yet record retries and mode transitions.

- [ ] **Step 3: Write minimal implementation**

```ts
if (this.state.desynced) {
  await this.resyncPrompt();
  if (this.state.mode === "unknown") {
    await this.handler.enterCommand("end");
    await this.resyncPrompt();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/ios-domain/src/session/*.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ios-domain/src/session/*.ts packages/ios-domain/src/session/*.test.ts
git commit -m "feat: add ios session recovery"
```

### Task 5: Connect IOS recovery and capability data to pt-control workflows

**Files:**
- Modify: `packages/pt-control/src/application/services/ios-service.ts`
- Modify: `packages/pt-control/src/application/services/ios-execution-service.ts`
- Modify: `packages/pt-control/src/application/services/ios-semantic-service.ts`
- Modify: `packages/pt-control/src/application/routing/routing-use-cases.ts`
- Modify: `packages/pt-control/src/application/vlan/vlan-use-cases.ts`
- Modify: `packages/pt-control/src/application/dhcp-server/dhcp-server-use-cases.ts`
- Modify: `packages/pt-control/src/application/check/check-use-cases.ts`
- Test: `packages/pt-control/src/application/services/*.test.ts`
- Test: `packages/pt-control/src/application/*/*.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("router-on-stick scenario uses the real runner contract", async () => {
  const result = await labService.runScenario(routerOnStickBasicScenario);

  expect(result.scenarioId).toBe("router-on-stick-basic");
  expect(result.ok).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/pt-control/src/application/**/*.test.ts packages/pt-control/src/__tests__/*.test.ts`
Expected: FAIL before the workflows consume the richer error/recovery contract.

- [ ] **Step 3: Write minimal implementation**

```ts
const capability = resolveCapabilitySet(model);
if (!capability.supportsIpRouting && wantsRouting) {
  return createIosError({
    code: IOS_ERROR_CODES.UNSUPPORTED_DEVICE,
    message: `El modelo ${model} no soporta routing`,
    retryable: false,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/pt-control/src/application/**/*.test.ts packages/pt-control/src/__tests__/*.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/pt-control/src/application/**/*.ts packages/pt-control/src/__tests__/*.test.ts
git commit -m "feat: wire ios recovery into pt-control"
```

### Task 6: Verify end-to-end IOS resilience across router, switch, and recovery scenarios

**Files:**
- Test: `packages/pt-control/src/verification/scenarios/*.scenario.ts`
- Test: `packages/pt-control/src/verification/real-verification-runner.test.ts`
- Test: `packages/pt-control/src/verification/recovery/*.ts`
- Test: `packages/ios-domain/src/**/__tests__/*.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test("ios session recovery scenario survives prompt loss and resumes execution", async () => {
  const result = await labService.runScenario(iosSessionRecoveryScenario);

  expect(result.scenarioId).toBe("ios-session-recovery");
  expect(result.ok).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/pt-control/src/verification/**/*.test.ts packages/ios-domain/src/**/*.test.ts`
Expected: FAIL until the new recovery and parser semantics are wired end-to-end.

- [ ] **Step 3: Write minimal implementation**

```ts
if (!result.ok && result.errors.length > 0) {
  await retryWithRecovery(result);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/pt-control/src/verification/**/*.test.ts packages/ios-domain/src/**/*.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/pt-control/src/verification/**/*.ts packages/ios-domain/src/**/*.test.ts
git commit -m "test: cover ios recovery scenarios"
```
