# pt-cmd terminal plan implementation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Hacer que `pt cmd` use `TerminalPlan` de forma canónica sin romper compatibilidad con `execIos`, `configIos`, `execPc` y `__pollDeferred`.

**Architecture:** `pt-control` construye y envía planes terminales; `pt-runtime` ejecuta `terminal.plan.run` y mantiene wrappers legacy; `pt cmd` conserva la misma UX y resultados. El cambio es aditivo, reversible y centrado en compatibilidad.

**Tech Stack:** TypeScript, Bun, Commander, PT runtime contracts, runtime terminal adapter, PT handlers.

### Task 1: Baseline real

**Files:**
- Read: `packages/pt-runtime/src/core/runtime-builder.ts`
- Read: `packages/pt-control/scripts/build.ts`
- Read: `apps/pt-cli/src/commands/build.ts`
- Read: `apps/pt-cli/src/commands/cmd/index.ts`
- Read: `packages/pt-control/src/application/services/terminal-command-service.ts`
- Read: `packages/pt-control/src/adapters/runtime-terminal/adapter.ts`

**Step 1: Inspect build flow**
- Identify how `main.js`, `runtime.js`, and `catalog.js` are generated.

**Step 2: Inspect command flow**
- Trace how `pt cmd` resolves IOS vs host commands.

**Step 3: Identify legacy path**
- Confirm where `execIos`, `configIos`, `execPc`, and polling live.

**Step 4: Summarize**
- Return build flow, runtime entry points, and main risks.

### Task 2: Builder de planes en `pt-control`

**Files:**
- Create: `packages/pt-control/src/application/services/terminal-plan-builder.ts`
- Test: `packages/pt-control/src/application/services/terminal-plan-builder.test.ts`
- Read: `packages/pt-control/src/adapters/runtime-terminal/payload-builder.ts`
- Read: `packages/pt-control/src/ports/runtime-terminal-port.ts`

**Step 1: Write the failing tests**
- `splitCommandLines` removes comments and empty lines.
- IOS multi-line input preserves command order.
- Host input produces `host-prompt` plan.
- Empty input yields empty plan.

**Step 2: Implement minimal builder**
- Add `splitCommandLines`, `buildDefaultTerminalTimeouts`, `buildDefaultTerminalPolicies`, and `buildUniversalTerminalPlan`.

**Step 3: Run tests**
- Verify the new builder behaves correctly.

### Task 3: `TerminalCommandService` uses plan-run

**Files:**
- Modify: `packages/pt-control/src/application/services/terminal-command-service.ts`
- Test: `packages/pt-control/src/application/services/terminal-command-service.plan-run.test.ts`

**Step 1: Write failing tests**
- When `runTerminalPlan` exists, IOS and host use it first.
- When it does not exist, fallback stays on `execIos` / `execHost`.

**Step 2: Add plan-run helper**
- Build a `TerminalPlan` and call `runtimeTerminal.runTerminalPlan` if available.

**Step 3: Keep fallback**
- Preserve legacy behavior when runtime terminal is absent.

**Step 4: Run tests**
- Confirm the service still returns the same result shape.

### Task 4: Handler `terminal.plan.run` en `pt-runtime`

**Files:**
- Create: `packages/pt-runtime/src/handlers/terminal-plan-run.ts`
- Modify: `packages/pt-runtime/src/handlers/registration/stable-handlers.ts`
- Read: `packages/pt-runtime/src/runtime/contracts.ts`

**Step 1: Write the failing test**
- `terminal.plan.run` should create a deferred job and return a ticket.

**Step 2: Implement handler**
- Convert `TerminalPlan` into `DeferredJobPlan`.
- Call `RuntimeApi.createJob`.

**Step 3: Register handler**
- Add `terminal.plan.run` to stable handlers.

**Step 4: Run tests**
- Verify the handler is registered and returns deferred results.

### Task 5: Wrappers legacy

**Files:**
- Modify: `packages/pt-runtime/src/handlers/ios/exec-ios-handler.ts`
- Modify: `packages/pt-runtime/src/handlers/ios/config-ios-handler.ts`
- Modify: `packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts`
- Modify: `packages/pt-runtime/src/handlers/ios/deferred-poll-handler.ts`

**Step 1: Write compatibility tests**
- Legacy handlers still return the same shape.

**Step 2: Refactor to wrappers**
- Build equivalent plans and delegate to `terminal.plan.run`.

**Step 3: Keep polling working**
- Preserve `__pollDeferred` behavior.

**Step 4: Run tests**
- Confirm no regression in legacy entry points.

### Task 6: Adapter terminal y polling

**Files:**
- Modify: `packages/pt-control/src/adapters/runtime-terminal/adapter.ts`
- Modify: `packages/pt-control/src/adapters/runtime-terminal/terminal-session.ts`
- Read: `packages/pt-control/src/adapters/runtime-terminal/response-parser.ts`

**Step 1: Write failing tests**
- Plan-run success.
- Deferred job polling.
- Legacy fallback.

**Step 2: Update adapter**
- Try `terminal.plan.run` first.
- Poll deferred jobs with `__pollDeferred`.

**Step 3: Preserve evidence**
- Keep `output`, `status`, `events`, `warnings`, `promptBefore`, `promptAfter`, `modeBefore`, `modeAfter`.

**Step 4: Run tests**
- Confirm adapter still normalizes results.

### Task 7: CLI compat y smoke tests

**Files:**
- Modify: `apps/pt-cli/src/commands/cmd/index.ts`
- Create: `apps/pt-cli/src/__tests__/commands/cmd-compat.test.ts`

**Step 1: Write failing tests**
- Help includes `--config`, `--save`, `--file`, `--stdin`, `--mode`, `--allow-confirm`, `--allow-destructive`.
- Help includes critical examples.

**Step 2: Fix regressions only if needed**
- Keep CLI UX unchanged.

**Step 3: Run smoke tests**
- Validate IOS exec, config, and host commands.

### Task 8: Revisión final

**Files:**
- Read: all files changed above

**Step 1: Review spec compliance**
- Confirm plan-run path is used where expected.

**Step 2: Review code quality**
- Look for duplication, dead paths, or broken fallback.

**Step 3: Decide readiness**
- Report ready / not ready with risks.

## Execution order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8
