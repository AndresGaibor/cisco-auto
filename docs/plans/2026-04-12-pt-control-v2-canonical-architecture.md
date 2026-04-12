# PT Control V2 Canonical Architecture Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Turn the current flat CLI and partially duplicated context/runtime surfaces into a canonical, intent-first Packet Tracer control stack with one source of truth for inspection, planning, and execution.

**Architecture:** Reuse the existing `PTController`, `NetworkTwin`, agent context service, FileBridgeV2, and event-driven PT terminal engine as the backbone. Add a thin domain-oriented CLI surface on top, route all agent-facing context through the controller and agent context service, and keep the Packet Tracer runtime changes small and testable. Do not create a second state model.

**Tech Stack:** TypeScript, Bun, commander, zod, Packet Tracer Script Module API, `PTController`, `NetworkTwin`, FileBridgeV2.

---

## Context to read before touching code

- `docs/PT_CONTROL_ARCHITECTURE.md`
- `docs/pt-runtime-contract.md`
- `docs/FILEBRIDGE_RUNTIME_COMPLETE_GUIDE.md`
- `docs/COMPATIBILITY.md`
- `docs/TESTS.md`
- `apps/pt-cli/src/program.ts`
- `apps/pt-cli/src/commands/command-registry.ts`
- `packages/pt-control/src/controller/index.ts`
- `packages/pt-control/src/agent/agent-context-service.ts`
- `packages/file-bridge/src/file-bridge-v2.ts`
- `packages/pt-runtime/src/pt/terminal/terminal-engine.ts`

## Guardrails

- Keep legacy command names working as aliases until the new domain-first commands are stable.
- Do not introduce a second topology/context store; always prefer controller/twin data over ad-hoc caches.
- Add or update tests before implementation for each task.
- Use Bun test commands that target the smallest failing surface first.
- Commit after each task.

---

## Phase 1: Canonical CLI surface and inspection context

### Task 1: Reorganize the top-level CLI into domains

**TDD scenario:** Modifying tested code — run existing tests first.

**Files:**
- Modify: `apps/pt-cli/src/program.ts`
- Modify: `apps/pt-cli/src/commands/command-registry.ts`
- Modify: `apps/pt-cli/src/help/formatter.ts`
- Modify: `apps/pt-cli/src/help/index.ts`
- Create: `apps/pt-cli/src/commands/inspect/index.ts`
- Create: `apps/pt-cli/src/commands/layout/index.ts`
- Create: `apps/pt-cli/src/commands/verify/index.ts`
- Create: `apps/pt-cli/src/commands/agent/index.ts`
- Modify: `tests/pt-cli.test.ts`

**Step 1: Write the failing test**

Update `tests/pt-cli.test.ts` so it asserts that `bun run apps/pt-cli/src/index.ts --help` shows domain-first groups such as `device`, `link`, `inspect`, `layout`, `verify`, and `agent`, while still accepting legacy aliases like `topology-show`.

**Step 2: Run test to verify it fails**

Run: `bun test tests/pt-cli.test.ts`

Expected: FAIL because the help surface is still the old flat registry.

**Step 3: Write minimal implementation**

Refactor `command-registry.ts` so the primary help surface is built from grouped domain entrypoints, then keep the old commands registered as aliases. Make `program.ts` load those grouped commands first, and keep `help` formatting focused on the domains instead of the historical flat list.

**Step 4: Run test to verify it passes**

Run: `bun test tests/pt-cli.test.ts`

Expected: PASS. `bun run apps/pt-cli/src/index.ts --help` should show the new domain-first organization.

**Step 5: Commit**

```bash
git add apps/pt-cli/src/program.ts apps/pt-cli/src/commands/command-registry.ts apps/pt-cli/src/help/formatter.ts apps/pt-cli/src/help/index.ts apps/pt-cli/src/commands/inspect/index.ts apps/pt-cli/src/commands/layout/index.ts apps/pt-cli/src/commands/verify/index.ts apps/pt-cli/src/commands/agent/index.ts tests/pt-cli.test.ts
git commit -m "feat(pt-cli): organize command surface by domain"
```

---

### Task 2: Enrich the supervisor and agent context payloads

**TDD scenario:** Modifying tested code — run existing tests first.

**Files:**
- Modify: `apps/pt-cli/src/application/context-supervisor.ts`
- Modify: `apps/pt-cli/src/application/context-inspector.ts`
- Modify: `apps/pt-cli/src/system/context-supervisor.ts`
- Modify: `apps/pt-cli/src/contracts/context-status.ts`
- Modify: `packages/pt-control/src/controller/context-service.ts`
- Modify: `packages/pt-control/src/contracts/agent-context-types.ts`
- Modify: `packages/pt-control/src/agent/agent-context-service.ts`
- Modify: `packages/pt-control/src/agent/context-renderer.ts`
- Modify: `packages/pt-control/src/agent/context-profiles.ts`
- Modify: `packages/pt-control/src/agent/queries.ts`
- Modify: `tests/pt-cli.test.ts`
- Modify: `packages/pt-control/src/controller/context-service.test.ts`

**Step 1: Write the failing test**

Extend the controller/context tests so a selected device or selected zone produces richer task-scoped context, including focus devices, warnings, and selection metadata. Add one assertion that the persisted CLI context still includes the bridge/heartbeat summary, and one assertion that the agent context now carries the selected device or zone.

**Step 2: Run test to verify it fails**

Run: `bun test tests/pt-cli.test.ts packages/pt-control/src/controller/context-service.test.ts`

Expected: FAIL because the current payloads are summary-only.

**Step 3: Write minimal implementation**

Keep `ControllerContextService.getSystemContext()` as the single summary source, then expand `AgentContextService` to build base/task/device/zone context from the twin with cache-aware selection enrichment. Make `context-supervisor.ts` persist the richer status without inventing a second data model, and keep the renderer deterministic for prompt output.

**Step 4: Run test to verify it passes**

Run: `bun test tests/pt-cli.test.ts packages/pt-control/src/controller/context-service.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/pt-cli/src/application/context-supervisor.ts apps/pt-cli/src/application/context-inspector.ts apps/pt-cli/src/system/context-supervisor.ts apps/pt-cli/src/contracts/context-status.ts packages/pt-control/src/controller/context-service.ts packages/pt-control/src/contracts/agent-context-types.ts packages/pt-control/src/agent/agent-context-service.ts packages/pt-control/src/agent/context-renderer.ts packages/pt-control/src/agent/context-profiles.ts packages/pt-control/src/agent/queries.ts tests/pt-cli.test.ts packages/pt-control/src/controller/context-service.test.ts
git commit -m "feat(pt-control): enrich agent and status context"
```

---

### Task 3: Replace `topology-show` with inspect-first queries

**TDD scenario:** New feature — full TDD cycle.

**Files:**
- Modify: `apps/pt-cli/src/commands/topology-show.ts`
- Modify: `apps/pt-cli/src/commands/topology/index.ts`
- Create: `apps/pt-cli/src/commands/inspect/topology.ts`
- Create: `apps/pt-cli/src/commands/inspect/neighbors.ts`
- Create: `apps/pt-cli/src/commands/inspect/free-ports.ts`
- Create: `apps/pt-cli/src/commands/inspect/drift.ts`
- Modify: `apps/pt-cli/src/application/context-inspector.ts`
- Modify: `packages/pt-control/src/query/twin-query-engine.ts`
- Modify: `packages/pt-control/src/vdom/twin-adapter.ts`
- Modify: `packages/pt-control/src/controller/index.ts`
- Create: `tests/pt-cli-inspect.test.ts`

**Step 1: Write the failing test**

Create `tests/pt-cli-inspect.test.ts` to assert that `pt inspect topology --json`, `pt inspect neighbors R1`, and `pt inspect free-ports R1` exist and return structured data from the twin, not from the old SQLite-only path.

**Step 2: Run test to verify it fails**

Run: `bun test tests/pt-cli-inspect.test.ts`

Expected: FAIL because the `inspect` domain does not exist yet.

**Step 3: Write minimal implementation**

Add the `inspect` command group and have it query `PTController.snapshot()`, `getSystemContext()`, and the twin query layer for neighbors, free ports, and drift. Keep `topology-show` as a thin deprecation wrapper that forwards to `inspect topology` and prints a warning.

**Step 4: Run test to verify it passes**

Run: `bun test tests/pt-cli-inspect.test.ts tests/pt-cli.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/pt-cli/src/commands/topology-show.ts apps/pt-cli/src/commands/topology/index.ts apps/pt-cli/src/commands/inspect/topology.ts apps/pt-cli/src/commands/inspect/neighbors.ts apps/pt-cli/src/commands/inspect/free-ports.ts apps/pt-cli/src/commands/inspect/drift.ts apps/pt-cli/src/application/context-inspector.ts packages/pt-control/src/query/twin-query-engine.ts packages/pt-control/src/vdom/twin-adapter.ts packages/pt-control/src/controller/index.ts tests/pt-cli-inspect.test.ts
git commit -m "feat(pt-cli): add inspect-first topology queries"
```

**Checkpoint:** At this point, rerun `bun test tests/pt-cli.test.ts tests/pt-cli-inspect.test.ts packages/pt-control/src/controller/context-service.test.ts` and review the CLI help text before moving to planner work.

---

## Phase 2: Spatial planning and connectivity decisions

### Task 4: Add layout, port, and link planners

**TDD scenario:** New feature — full TDD cycle.

**Files:**
- Create: `packages/pt-control/src/application/services/layout-planner-service.ts`
- Create: `packages/pt-control/src/application/services/port-planner-service.ts`
- Create: `packages/pt-control/src/application/services/link-feasibility-service.ts`
- Modify: `packages/pt-control/src/application/services/topology-service.ts`
- Modify: `packages/pt-control/src/application/services/device-service.ts`
- Modify: `packages/pt-control/src/application/services/topology-query-service.ts`
- Modify: `packages/pt-control/src/application/services/device-query-service.ts`
- Modify: `packages/pt-control/src/contracts/placement-types.ts`
- Modify: `packages/pt-control/src/contracts/spatial-types.ts`
- Modify: `packages/pt-control/src/contracts/port-types.ts`
- Create: `apps/pt-cli/src/commands/layout/place.ts`
- Create: `apps/pt-cli/src/commands/layout/align.ts`
- Create: `apps/pt-cli/src/commands/layout/grid.ts`
- Create: `apps/pt-cli/src/commands/layout/zone.ts`
- Modify: `apps/pt-cli/src/commands/layout/index.ts`
- Modify: `apps/pt-cli/src/commands/link/index.ts`
- Modify: `apps/pt-cli/src/commands/link/add.ts`
- Create: `apps/pt-cli/src/commands/link/suggest.ts`
- Create: `apps/pt-cli/src/commands/link/verify.ts`
- Create: `packages/pt-control/src/application/services/layout-planner-service.test.ts`
- Create: `packages/pt-control/src/application/services/link-feasibility-service.test.ts`
- Create: `tests/pt-cli-layout-link.test.ts`

**Step 1: Write the failing test**

Add planner tests that expect the service to return a placement decision, a suggested free port, and a human-readable reason when a link is infeasible. Add a CLI test that exercises the new `layout` and `link suggest/verify` commands.

**Step 2: Run test to verify it fails**

Run: `bun test packages/pt-control/src/application/services/layout-planner-service.test.ts packages/pt-control/src/application/services/link-feasibility-service.test.ts tests/pt-cli-layout-link.test.ts`

Expected: FAIL because the planners and commands do not exist yet.

**Step 3: Write minimal implementation**

Implement the layout planner first, then the port planner, then the link feasibility checks. Use current coordinates, neighbor density, zone membership, and port availability to generate decisions. The CLI should parse intent and print planner output before executing any topology change.

**Step 4: Run test to verify it passes**

Run: `bun test packages/pt-control/src/application/services/layout-planner-service.test.ts packages/pt-control/src/application/services/link-feasibility-service.test.ts tests/pt-cli-layout-link.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/pt-control/src/application/services/layout-planner-service.ts packages/pt-control/src/application/services/port-planner-service.ts packages/pt-control/src/application/services/link-feasibility-service.ts packages/pt-control/src/application/services/topology-service.ts packages/pt-control/src/application/services/device-service.ts packages/pt-control/src/application/services/topology-query-service.ts packages/pt-control/src/application/services/device-query-service.ts packages/pt-control/src/contracts/placement-types.ts packages/pt-control/src/contracts/spatial-types.ts packages/pt-control/src/contracts/port-types.ts apps/pt-cli/src/commands/layout/place.ts apps/pt-cli/src/commands/layout/align.ts apps/pt-cli/src/commands/layout/grid.ts apps/pt-cli/src/commands/layout/zone.ts apps/pt-cli/src/commands/layout/index.ts apps/pt-cli/src/commands/link/index.ts apps/pt-cli/src/commands/link/add.ts apps/pt-cli/src/commands/link/suggest.ts apps/pt-cli/src/commands/link/verify.ts packages/pt-control/src/application/services/layout-planner-service.test.ts packages/pt-control/src/application/services/link-feasibility-service.test.ts tests/pt-cli-layout-link.test.ts
git commit -m "feat(pt-control): add spatial and link planners"
```

---

### Task 5: Normalize host and DHCP handling

**TDD scenario:** Modifying tested code — run existing tests first.

**Files:**
- Modify: `apps/pt-cli/src/commands/host.ts`
- Modify: `apps/pt-cli/src/commands/config-host.ts`
- Modify: `apps/pt-cli/src/commands/dhcp-server.ts`
- Modify: `apps/pt-cli/src/commands/services.ts`
- Modify: `apps/pt-cli/src/application/verify-host-config.ts`
- Modify: `packages/pt-control/src/application/services/device-mutation-service.ts`
- Modify: `packages/pt-control/src/application/services/device-service.ts`
- Modify: `packages/pt-control/src/application/services/ios-semantic-service.ts`
- Modify: `packages/pt-control/src/application/services/ios-verification-service.ts`
- Modify: `packages/pt-control/src/controller/index.ts` if the CLI needs a new wrapper
- Modify: `packages/pt-control/src/application/services/device-service.test.ts`
- Create: `tests/pt-cli-host.test.ts`

**Step 1: Write the failing test**

Extend the host and DHCP tests so `pt host` and `pt service dhcp` behave like the canonical commands, while the old names remain aliases. Add one assertion that host verification returns a structured check list instead of a bare boolean.

**Step 2: Run test to verify it fails**

Run: `bun test tests/pt-cli-host.test.ts packages/pt-control/src/application/services/device-service.test.ts`

Expected: FAIL because the command surface and verification response are still split across multiple paths.

**Step 3: Write minimal implementation**

Collapse duplicate parsing into a single host/DHCP flow, keep the old command names as aliases, and make verification reuse the same underlying device inspection result in both the CLI and controller layers.

**Step 4: Run test to verify it passes**

Run: `bun test tests/pt-cli-host.test.ts packages/pt-control/src/application/services/device-service.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/pt-cli/src/commands/host.ts apps/pt-cli/src/commands/config-host.ts apps/pt-cli/src/commands/dhcp-server.ts apps/pt-cli/src/commands/services.ts apps/pt-cli/src/application/verify-host-config.ts packages/pt-control/src/application/services/device-mutation-service.ts packages/pt-control/src/application/services/device-service.ts packages/pt-control/src/application/services/ios-semantic-service.ts packages/pt-control/src/application/services/ios-verification-service.ts packages/pt-control/src/controller/index.ts packages/pt-control/src/application/services/device-service.test.ts tests/pt-cli-host.test.ts
git commit -m "feat(pt-cli): unify host and DHCP workflows"
```

---

### Task 6: Wire IOS execution evidence through the stack

**TDD scenario:** New feature — full TDD cycle.

**Files:**
- Modify: `packages/pt-runtime/src/pt/terminal/terminal-engine.ts`
- Modify: `packages/pt-runtime/src/pt/terminal/terminal-session.ts`
- Modify: `packages/pt-runtime/src/pt/terminal/prompt-parser.ts`
- Modify: `packages/pt-control/src/controller/ios-service.ts`
- Modify: `packages/pt-control/src/application/services/ios-service.ts`
- Modify: `packages/pt-control/src/application/services/ios-execution-service.ts`
- Modify: `packages/pt-control/src/application/services/ios-verification-service.ts`
- Create: `apps/pt-cli/src/commands/verify/ios.ts`
- Modify: `apps/pt-cli/src/commands/validate.ts`
- Modify: `apps/pt-cli/src/commands/runtime.ts`
- Modify: `packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts`
- Modify: `packages/pt-control/src/controller/ios-service.test.ts`
- Modify: `packages/pt-control/src/application/services/ios-service.test.ts`
- Create: `tests/pt-cli-verify.test.ts`

**Step 1: Write the failing test**

Add a test that expects `execIosWithEvidence()` to return source, status, mode, prompt, paging, and awaiting-confirmation information, and add a CLI test for `pt verify ios` that prints pass/fail checks from the same evidence object.

**Step 2: Run test to verify it fails**

Run: `bun test packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts packages/pt-control/src/controller/ios-service.test.ts packages/pt-control/src/application/services/ios-service.test.ts tests/pt-cli-verify.test.ts`

Expected: FAIL because the evidence chain is not fully threaded yet.

**Step 3: Write minimal implementation**

Thread the evidence produced by `TerminalEngine.executeCommand()` through the controller and service layers, and make `verify ios` consume that evidence instead of reconstructing state from separate heuristics.

**Step 4: Run test to verify it passes**

Run: `bun test packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts packages/pt-control/src/controller/ios-service.test.ts packages/pt-control/src/application/services/ios-service.test.ts tests/pt-cli-verify.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/pt-runtime/src/pt/terminal/terminal-engine.ts packages/pt-runtime/src/pt/terminal/terminal-session.ts packages/pt-runtime/src/pt/terminal/prompt-parser.ts packages/pt-control/src/controller/ios-service.ts packages/pt-control/src/application/services/ios-service.ts packages/pt-control/src/application/services/ios-execution-service.ts packages/pt-control/src/application/services/ios-verification-service.ts apps/pt-cli/src/commands/verify/ios.ts apps/pt-cli/src/commands/validate.ts apps/pt-cli/src/commands/runtime.ts packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts packages/pt-control/src/controller/ios-service.test.ts packages/pt-control/src/application/services/ios-service.test.ts tests/pt-cli-verify.test.ts
git commit -m "feat(pt-control): propagate IOS execution evidence"
```

**Checkpoint:** Run `bun test packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts packages/pt-control/src/controller/ios-service.test.ts packages/pt-control/src/application/services/ios-service.test.ts tests/pt-cli-verify.test.ts` and confirm the evidence shape is stable before touching the bridge/runtime contract.

---

## Phase 3: Durable runtime and explicit agent workflow

### Task 7: Harden the bridge/runtime contract

**TDD scenario:** Modifying tested code — run existing tests first.

**Files:**
- Modify: `packages/file-bridge/src/file-bridge-v2.ts`
- Modify: `packages/file-bridge/src/v2/command-processor.ts`
- Modify: `packages/file-bridge/src/v2/crash-recovery.ts`
- Modify: `packages/file-bridge/src/shared/protocol.ts`
- Modify: `packages/pt-runtime/src/build/render-main.ts`
- Modify: `packages/pt-runtime/src/build/render-runtime.ts`
- Modify: `packages/pt-runtime/src/runtime-validator.ts`
- Modify: `packages/pt-runtime/src/index.ts`
- Create: `packages/file-bridge/src/v2/command-processor.test.ts`
- Modify: `packages/file-bridge/src/shared-result-watcher.test.ts`
- Modify: `packages/pt-runtime/src/__tests__/runtime-validator.test.ts`

**Step 1: Write the failing test**

Add a regression test that enqueues two commands, restarts the consumer, and confirms that the result file, backpressure, and recovery logic still resolve the correct command. Add one validation test that fails if generated PT runtime code references forbidden APIs or relies on the legacy single-file command contract.

**Step 2: Run test to verify it fails**

Run: `bun test packages/file-bridge/src/v2/command-processor.test.ts packages/file-bridge/src/shared-result-watcher.test.ts packages/pt-runtime/src/__tests__/runtime-validator.test.ts`

Expected: FAIL while the old assumptions still exist.

**Step 3: Write minimal implementation**

Keep `commands/`, `in-flight/`, and `results/` as the only supported bridge contract. Update the renderers and runtime validator so generated `main.js` and `runtime.js` are PT-safe, deterministic, and fail fast when they drift from the expected contract.

**Step 4: Run test to verify it passes**

Run: `bun test packages/file-bridge/src/v2/command-processor.test.ts packages/file-bridge/src/shared-result-watcher.test.ts packages/pt-runtime/src/__tests__/runtime-validator.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/file-bridge/src/file-bridge-v2.ts packages/file-bridge/src/v2/command-processor.ts packages/file-bridge/src/v2/crash-recovery.ts packages/file-bridge/src/shared/protocol.ts packages/pt-runtime/src/build/render-main.ts packages/pt-runtime/src/build/render-runtime.ts packages/pt-runtime/src/runtime-validator.ts packages/pt-runtime/src/index.ts packages/file-bridge/src/v2/command-processor.test.ts packages/file-bridge/src/shared-result-watcher.test.ts packages/pt-runtime/src/__tests__/runtime-validator.test.ts
git commit -m "chore(runtime): harden bridge and generated runtime contract"
```

---

### Task 8: Add explicit agent mode commands

**TDD scenario:** New feature — full TDD cycle.

**Files:**
- Modify: `apps/pt-cli/src/commands/agent/index.ts`
- Create: `apps/pt-cli/src/commands/agent/context.ts`
- Create: `apps/pt-cli/src/commands/agent/plan.ts`
- Create: `apps/pt-cli/src/commands/agent/apply.ts`
- Create: `apps/pt-cli/src/commands/agent/verify.ts`
- Modify: `packages/pt-control/src/agent/agent-context-service.ts`
- Modify: `packages/pt-control/src/agent/context-renderer.ts`
- Modify: `packages/pt-control/src/agent/context-profiles.ts`
- Modify: `packages/pt-control/src/agent/queries.ts`
- Create: `tests/pt-cli-agent.test.ts`

**Step 1: Write the failing test**

Add tests for `pt agent context --task`, `pt agent plan --goal`, and `pt agent verify`. The test should assert that the context is trimmed to the selected subgraph, includes candidate ports and risks, and renders a stable prompt-friendly summary.

**Step 2: Run test to verify it fails**

Run: `bun test tests/pt-cli-agent.test.ts`

Expected: FAIL because agent mode is not exposed as a first-class command set yet.

**Step 3: Write minimal implementation**

Implement the agent command group on top of `AgentContextService`. Keep the renderer deterministic, cache-aware, and focused on the current task scope, and make `plan`/`apply`/`verify` reuse the same context and selection state.

**Step 4: Run test to verify it passes**

Run: `bun test tests/pt-cli-agent.test.ts`

Expected: PASS. Smoke test with `bun run apps/pt-cli/src/index.ts agent context --task "connect R1 and S1"`.

**Step 5: Commit**

```bash
git add apps/pt-cli/src/commands/agent/index.ts apps/pt-cli/src/commands/agent/context.ts apps/pt-cli/src/commands/agent/plan.ts apps/pt-cli/src/commands/agent/apply.ts apps/pt-cli/src/commands/agent/verify.ts packages/pt-control/src/agent/agent-context-service.ts packages/pt-control/src/agent/context-renderer.ts packages/pt-control/src/agent/context-profiles.ts packages/pt-control/src/agent/queries.ts tests/pt-cli-agent.test.ts
git commit -m "feat(pt-cli): add explicit agent workflow commands"
```

---

## Completion criteria

The work is done when:

- `bun run apps/pt-cli/src/index.ts --help` shows domain-first commands.
- `pt inspect` becomes the canonical inspection path.
- Layout and link planning produce helpful decisions before mutation.
- Host/DHCP workflows share one verification path.
- IOS execution returns real evidence, not just optimistic success.
- The bridge/runtime contract is durable and validated.
- `pt agent` can build a task-scoped context without pulling the whole lab.
