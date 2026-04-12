# PT Runtime Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate pt-runtime from template-based string generation to real TypeScript compilation, eliminating the 1926-line `runtime-assembly.ts` monster and establishing a clean separation between kernel (lifecycle) and runtime (business logic).

**Architecture:** 
- Kernel (`main.js`) - stable, small, handles lifecycle/queue/heartbeat
- Runtime (`runtime.js`) - reloadable business logic compiled from TS
- Terminal Engine - single owner of IOS session state in PT
- Handlers - pure functions that return `DeferredJobPlan` or `RuntimeResult`

**Tech Stack:** TypeScript, Bun, Packet Tracer Script Module API

---

## Context

### Current State (Good News)
- `runtime/contracts.ts` (309 lines) - well-defined contracts already exist
- `core/registry.ts` (45 lines) - handler registry pattern
- `handlers/runtime-handlers.ts` (505 lines) - typed handlers with DeferredJobPlan
- `handlers/*.ts` and `handlers/*.handler.ts` - individual handler factories

### Current State (Bad News)
- `templates/runtime-assembly.ts` (1926 lines) - MONSTER generating JS strings
- `templates/main-kernel-assembly.ts` (1148 lines) - kernel in strings
- IOS jobs system embedded in runtime-assembly.ts (lines 37-500+)
- Terminal session management duplicated between handlers and kernel

### Key Files to Change
- `packages/pt-runtime/src/templates/runtime-assembly.ts` → DELETE
- `packages/pt-runtime/src/templates/main-kernel-assembly.ts` → REWRITE
- `packages/pt-runtime/src/index.ts` → UPDATE exports

---

## Phase 0: Baseline Documentation

### Task 0.1: Create Migration Branch

**Step 1: Create branch**

```bash
git checkout -b feat/pt-runtime-migration
git push -u origin feat/pt-runtime-migration
```

**Step 2: Verify branch**

```bash
git branch --show-current
```
Expected: `feat/pt-runtime-migration`

---

### Task 0.2: Document Contract Baseline

**Files:**
- Create: `docs/pt-runtime-contract.md`

**Step 1: Create contract documentation**

```markdown
# PT Runtime Contract Baseline

> Generated: 2026-04-12
> Purpose: Document current contract before migration

## Input Payloads

### Device Commands
- `addDevice` - Add device to topology
- `removeDevice` - Remove device
- `renameDevice` - Rename device

### Link Commands
- `addLink` - Add link between devices
- `removeLink` - Remove link

### IOS Commands
- `configIos` - Configure IOS device
- `execIos` - Execute IOS command
- `pollDeferred` - Poll deferred job

### Canvas Commands
- `setDeviceLocation` - Move device on canvas

## Output Results

### Success
```json
{
  "ok": true,
  "raw": "...",
  "status": 0,
  "session": { "mode": "...", "prompt": "..." }
}
```

### Error
```json
{
  "ok": false,
  "error": "...",
  "code": "...",
  "session": { "mode": "...", "prompt": "..." }
}
```

### Deferred
```json
{
  "ok": true,
  "deferred": true,
  "ticket": "ios_job_123",
  "job": { "id": "...", "plan": [...] }
}
```

## Events
- `commandStarted` - When command begins execution
- `outputWritten` - Incremental output
- `commandEnded` - Command completed
- `modeChanged` - IOS mode transition
- `promptChanged` - Prompt update
- `moreDisplayed` - Pager active

## Current Handlers
- `device.ts` - Device management
- `link.ts` - Link management
- `config.ts` - IOS configuration
- `inspect.ts` - Snapshot/inspect
- `module.ts` - Module management
- `canvas.ts` - Canvas operations
```

**Step 2: Commit**

```bash
git add docs/pt-runtime-contract.md
git commit -m "docs: baseline contract for pt-runtime migration"
```

---

### Task 0.3: Save Generated Artifacts

**Files:**
- Create: `packages/pt-runtime/generated/baseline/`

**Step 1: Create baseline directory**

```bash
mkdir -p packages/pt-runtime/generated/baseline
```

**Step 2: Copy current artifacts**

```bash
cp packages/pt-runtime/generated/main.js packages/pt-runtime/generated/baseline/main.js.baseline
cp packages/pt-runtime/generated/runtime.js packages/pt-runtime/generated/baseline/runtime.js.baseline
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/generated/baseline/
git commit -m "chore: save baseline generated artifacts"
```

---

## Phase 1: New Structure (Scaffolding)

### Task 1.1: Create Domain Directory Structure

**Files:**
- Create: `packages/pt-runtime/src/domain/contracts.ts`
- Create: `packages/pt-runtime/src/domain/deferred-job-plan.ts`
- Create: `packages/pt-runtime/src/domain/runtime-result.ts`
- Create: `packages/pt-runtime/src/domain/index.ts`

**Step 1: Create domain directory**

```bash
mkdir -p packages/pt-runtime/src/domain
```

**Step 2: Create domain/contracts.ts**

```typescript
// packages/pt-runtime/src/domain/contracts.ts
// Re-export from runtime/contracts.ts for cleaner imports
export type {
  RuntimeResult,
  RuntimeErrorResult,
  RuntimeSuccessResult,
  RuntimeDeferredResult,
  DeferredJobPlan,
  DeferredStep,
  DeferredStepType,
  DeferredJobOptions,
  RuntimeApi,
  DeviceRef,
  SessionStateSnapshot,
  KernelJobState,
  DeviceSessionState,
  CommandEnvelope,
  ResultEnvelope,
} from "../runtime/contracts";
```

**Step 3: Create domain/deferred-job-plan.ts**

```typescript
// packages/pt-runtime/src/domain/deferred-job-plan.ts
import type { DeferredJobPlan, DeferredStep, DeferredStepType, DeferredJobOptions } from "./contracts";

export type { DeferredJobPlan, DeferredStep, DeferredStepType, DeferredJobOptions };

export function createDeferredJobPlan(
  device: string,
  steps: DeferredStep[],
  options?: Partial<DeferredJobOptions>
): DeferredJobPlan {
  const id = `ios_job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  return {
    id,
    kind: "ios-session",
    version: 1,
    device,
    plan: steps,
    options: {
      stopOnError: options?.stopOnError ?? true,
      commandTimeoutMs: options?.commandTimeoutMs ?? 8000,
      stallTimeoutMs: options?.stallTimeoutMs ?? 15000,
    },
    payload: {},
  };
}

export function ensureModeStep(mode: string): DeferredStep {
  return { type: "ensure-mode", value: mode };
}

export function commandStep(cmd: string, opts?: DeferredStep["options"]): DeferredStep {
  return { type: "command", value: cmd, options: opts };
}

export function confirmStep(): DeferredStep {
  return { type: "confirm" };
}

export function expectPromptStep(prompt: string): DeferredStep {
  return { type: "expect-prompt", value: prompt };
}

export function saveConfigStep(): DeferredStep {
  return { type: "save-config" };
}

export function closeSessionStep(): DeferredStep {
  return { type: "close-session" };
}
```

**Step 4: Create domain/runtime-result.ts**

```typescript
// packages/pt-runtime/src/domain/runtime-result.ts
import type { 
  RuntimeResult, 
  RuntimeErrorResult, 
  RuntimeSuccessResult, 
  RuntimeDeferredResult,
  SessionStateSnapshot 
} from "./contracts";

export type { RuntimeResult, RuntimeErrorResult, RuntimeSuccessResult, RuntimeDeferredResult };

export function okResult(
  raw?: string,
  options?: { status?: number; parsed?: Record<string, unknown>; session?: SessionStateSnapshot }
): RuntimeSuccessResult {
  return {
    ok: true,
    raw,
    status: options?.status,
    parsed: options?.parsed,
    session: options?.session,
  };
}

export function errorResult(
  error: string,
  options?: { code?: string; raw?: string; session?: SessionStateSnapshot }
): RuntimeErrorResult {
  return {
    ok: false,
    error,
    code: options?.code,
    raw: options?.raw,
    session: options?.session,
  };
}

export function deferredResult(ticket: string, job: DeferredJobPlan): RuntimeDeferredResult {
  return {
    ok: true,
    deferred: true,
    ticket,
    job,
  };
}
```

**Step 5: Create domain/index.ts**

```typescript
// packages/pt-runtime/src/domain/index.ts
export * from "./contracts";
export * from "./deferred-job-plan";
export * from "./runtime-result";
```

**Step 6: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```
Expected: No errors

**Step 7: Commit**

```bash
git add packages/pt-runtime/src/domain/
git commit -m "feat(pt-runtime): add domain layer contracts and helpers"
```

---

### Task 1.2: Create PT Kernel Directory Structure

**Files:**
- Create: `packages/pt-runtime/src/pt/kernel/main.ts`
- Create: `packages/pt-runtime/src/pt/kernel/queue.ts`
- Create: `packages/pt-runtime/src/pt/kernel/heartbeat.ts`
- Create: `packages/pt-runtime/src/pt/kernel/runtime-loader.ts`
- Create: `packages/pt-runtime/src/pt/kernel/cleanup.ts`
- Create: `packages/pt-runtime/src/pt/kernel/index.ts`

**Step 1: Create pt/kernel directory**

```bash
mkdir -p packages/pt-runtime/src/pt/kernel
```

**Step 2: Create pt/kernel/queue.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/queue.ts
// Poll command queue (commands/, in-flight/, results/)

export interface QueueConfig {
  commandsDir: string;
  inFlightDir: string;
  resultsDir: string;
  pollIntervalMs: number;
}

export interface QueuedCommand {
  id: string;
  seq: number;
  payload: Record<string, unknown>;
  filename: string;
}

export function createQueuePoller(config: QueueConfig) {
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  
  async function poll(): Promise<QueuedCommand | null> {
    // Implementation will be PT-specific (uses fm global)
    // This is a stub for now
    return null;
  }
  
  function start(callback: (command: QueuedCommand) => void): void {
    pollInterval = setInterval(async () => {
      const command = await poll();
      if (command) {
        callback(command);
      }
    }, config.pollIntervalMs);
  }
  
  function stop(): void {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }
  
  return { start, stop, poll };
}
```

**Step 3: Create pt/kernel/heartbeat.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/heartbeat.ts
// Lease/heartbeat management

export interface HeartbeatConfig {
  leaseFile: string;
  intervalMs: number;
}

export function createHeartbeat(config: HeartbeatConfig) {
  let interval: ReturnType<typeof setInterval> | null = null;
  
  function send(): void {
    // Implementation will be PT-specific
  }
  
  function start(): void {
    send();
    interval = setInterval(send, config.intervalMs);
  }
  
  function stop(): void {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }
  
  return { start, stop, send };
}
```

**Step 4: Create pt/kernel/runtime-loader.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/runtime-loader.ts
// Hot reload for runtime.js

export interface RuntimeLoaderConfig {
  runtimeFile: string;
  checkIntervalMs: number;
}

export interface LoadedRuntime {
  mtime: number;
  fn: (payload: Record<string, unknown>, api: unknown) => unknown;
}

export function createRuntimeLoader(config: RuntimeLoaderConfig) {
  let lastMtime = 0;
  let lastFn: LoadedRuntime["fn"] | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  
  async function load(): Promise<LoadedRuntime["fn"] | null> {
    // Implementation will be PT-specific (uses fm global)
    return lastFn;
  }
  
  function start(onReload: (fn: LoadedRuntime["fn"]) => void): void {
    interval = setInterval(async () => {
      const fn = await load();
      if (fn && fn !== lastFn) {
        lastFn = fn;
        onReload(fn);
      }
    }, config.checkIntervalMs);
  }
  
  function stop(): void {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }
  
  return { start, stop, load, getLastMtime: () => lastMtime };
}
```

**Step 5: Create pt/kernel/cleanup.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/cleanup.ts
// Cleanup state management

export interface CleanupState {
  stage: "idle" | "draining" | "finishing" | "done";
  startedAt: number | null;
}

export function createCleanupManager() {
  let state: CleanupState = { stage: "idle", startedAt: null };
  
  function begin(): void {
    state = { stage: "draining", startedAt: Date.now() };
  }
  
  function advance(stage: CleanupState["stage"]): void {
    state.stage = stage;
  }
  
  function getState(): CleanupState {
    return { ...state };
  }
  
  return { begin, advance, getState };
}
```

**Step 6: Create pt/kernel/main.ts (stub)**

```typescript
// packages/pt-runtime/src/pt/kernel/main.ts
// Entry point for main.js - will be compiled to JS

export { createQueuePoller, type QueuedCommand, type QueueConfig } from "./queue";
export { createHeartbeat, type HeartbeatConfig } from "./heartbeat";
export { createRuntimeLoader, type RuntimeLoaderConfig, type LoadedRuntime } from "./runtime-loader";
export { createCleanupManager, type CleanupState } from "./cleanup";

// Main kernel boot function (will be filled in later)
export async function bootKernel(config: {
  devDir: string;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
}): Promise<void> {
  // TODO: Implement kernel boot
  throw new Error("bootKernel not implemented");
}
```

**Step 7: Create pt/kernel/index.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/index.ts
export * from "./main";
```

**Step 8: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 9: Commit**

```bash
git add packages/pt-runtime/src/pt/
git commit -m "feat(pt-runtime): add pt/kernel scaffolding"
```

---

### Task 1.3: Create PT Terminal Directory Structure

**Files:**
- Create: `packages/pt-runtime/src/pt/terminal/terminal-engine.ts`
- Create: `packages/pt-runtime/src/pt/terminal/terminal-session.ts`
- Create: `packages/pt-runtime/src/pt/terminal/terminal-events.ts`
- Create: `packages/pt-runtime/src/pt/terminal/index.ts`

**Step 1: Create pt/terminal directory**

```bash
mkdir -p packages/pt-runtime/src/pt/terminal
```

**Step 2: Create pt/terminal/terminal-events.ts**

```typescript
// packages/pt-runtime/src/pt/terminal/terminal-events.ts
// Event types from PT TerminalLine API

export interface TerminalEvent {
  type: "commandStarted" | "outputWritten" | "commandEnded" | "modeChanged" | "promptChanged" | "moreDisplayed";
  device: string;
  timestamp: number;
}

export interface CommandStartedEvent extends TerminalEvent {
  type: "commandStarted";
  command: string;
}

export interface OutputWrittenEvent extends TerminalEvent {
  type: "outputWritten";
  output: string;
}

export interface CommandEndedEvent extends TerminalEvent {
  type: "commandEnded";
  status: number;
}

export interface ModeChangedEvent extends TerminalEvent {
  type: "modeChanged";
  from: string;
  to: string;
}

export interface PromptChangedEvent extends TerminalEvent {
  type: "promptChanged";
  prompt: string;
}

export interface MoreDisplayedEvent extends TerminalEvent {
  type: "moreDisplayed";
  active: boolean;
}

export type AnyTerminalEvent =
  | CommandStartedEvent
  | OutputWrittenEvent
  | CommandEndedEvent
  | ModeChangedEvent
  | PromptChangedEvent
  | MoreDisplayedEvent;
```

**Step 3: Create pt/terminal/terminal-session.ts**

```typescript
// packages/pt-runtime/src/pt/terminal/terminal-session.ts
// Terminal session state - single source of truth

import type { SessionStateSnapshot } from "../../domain";

export interface TerminalSessionState {
  device: string;
  mode: string;
  prompt: string;
  paging: boolean;
  awaitingConfirm: boolean;
  lastOutputAt: number;
  busyJobId: string | null;
  healthy: boolean;
}

export function createTerminalSession(device: string): TerminalSessionState {
  return {
    device,
    mode: "unknown",
    prompt: "",
    paging: false,
    awaitingConfirm: false,
    lastOutputAt: Date.now(),
    busyJobId: null,
    healthy: true,
  };
}

export function toSnapshot(state: TerminalSessionState): SessionStateSnapshot {
  return {
    mode: state.mode,
    prompt: state.prompt,
    paging: state.paging,
    awaitingConfirm: state.awaitingConfirm,
  };
}

export function updateMode(state: TerminalSessionState, mode: string): TerminalSessionState {
  return { ...state, mode, lastOutputAt: Date.now() };
}

export function updatePrompt(state: TerminalSessionState, prompt: string): TerminalSessionState {
  return { ...state, prompt, lastOutputAt: Date.now() };
}

export function setPaging(state: TerminalSessionState, paging: boolean): TerminalSessionState {
  return { ...state, paging };
}

export function setBusy(state: TerminalSessionState, jobId: string | null): TerminalSessionState {
  return { ...state, busyJobId: jobId };
}
```

**Step 4: Create pt/terminal/terminal-engine.ts (stub)**

```typescript
// packages/pt-runtime/src/pt/terminal/terminal-engine.ts
// Single owner of terminal sessions in PT
// NOTE: Implementation requires PT API investigation

import type { TerminalSessionState } from "./terminal-session";
import type { SessionStateSnapshot } from "../../domain";

export interface TerminalEngineConfig {
  commandTimeoutMs: number;
  stallTimeoutMs: number;
}

export interface ExecuteOptions {
  timeout?: number;
  expectedPrompt?: string;
  stopOnError?: boolean;
}

export interface TerminalResult {
  ok: boolean;
  output: string;
  status: number;
  session: SessionStateSnapshot;
}

export function createTerminalEngine(config: TerminalEngineConfig) {
  const sessions = new Map<string, TerminalSessionState>();
  
  // Attach listener to PT TerminalLine
  // NOTE: Requires PT API investigation
  function attach(device: string, terminal: unknown): void {
    // TODO: Attach event listeners to PT TerminalLine API
    // Events: commandStarted, outputWritten, commandEnded, modeChanged, promptChanged, moreDisplayed
    sessions.set(device, createTerminalSession(device));
  }
  
  // Detach listeners
  function detach(device: string): void {
    sessions.delete(device);
  }
  
  // Get session snapshot
  function getSession(device: string): SessionStateSnapshot | null {
    const state = sessions.get(device);
    return state ? toSnapshot(state) : null;
  }
  
  // Execute command and wait for result
  // NOTE: PT TerminalLine.enterCommand() returns void
  // Result comes via events
  async function execute(
    device: string,
    command: string,
    options?: ExecuteOptions
  ): Promise<TerminalResult> {
    // TODO: Implement command execution via events
    throw new Error("TerminalEngine.execute not implemented");
  }
  
  return {
    attach,
    detach,
    getSession,
    execute,
  };
}
```

**Step 5: Create pt/terminal/index.ts**

```typescript
// packages/pt-runtime/src/pt/terminal/index.ts
export * from "./terminal-engine";
export * from "./terminal-session";
export * from "./terminal-events";
```

**Step 6: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 7: Commit**

```bash
git add packages/pt-runtime/src/pt/terminal/
git commit -m "feat(pt-runtime): add pt/terminal scaffolding (TerminalEngine stub)"
```

---

## Phase 2: Extract IOS Jobs System from Template

### Task 2.1: Document IOS Jobs System in runtime-assembly.ts

**Files:**
- Read: `packages/pt-runtime/src/templates/runtime-assembly.ts`

**Step 1: Read the IOS_JOBS_TEMPLATE section**

Read lines 37-500 of runtime-assembly.ts to understand:
- Job creation (`createIosJob`)
- Job states (`queued`, `running`, `completed`, `error`)
- Step execution (`ensure-mode`, `command`, `confirm`, etc.)
- Event handling

**Step 2: Document findings**

Create `docs/pt-runtime-ios-jobs-analysis.md`:

```markdown
# IOS Jobs System Analysis

## Location
`packages/pt-runtime/src/templates/runtime-assembly.ts:37-500`

## Key Functions
- `createIosJob(type, payload)` - Create deferred job
- `pollIosJob(ticket)` - Check job status
- `stepJobForward(job)` - Advance job state machine

## Job States
1. `queued` - Job waiting to start
2. `waiting-ensure-mode` - Transitioning IOS mode
3. `waiting-command` - Command executing
4. `waiting-confirm` - Waiting for confirmation
5. `waiting-prompt` - Waiting for prompt
6. `completed` - Job finished
7. `error` - Job failed

## Step Types
- `ensure-mode` - Transition to IOS mode (user, privileged, config)
- `command` - Execute IOS command
- `confirm` - Confirm dialog (write memory)
- `expect-prompt` - Wait for specific prompt
- `save-config` - Write memory
- `delay` - Wait N ms
- `close-session` - End session

## Events Consumed
- `commandStarted` - Command began executing
- `outputWritten` - Incremental output
- `commandEnded` - Command completed with status
- `modeChanged` - IOS mode transition
- `promptChanged` - Prompt string changed
- `moreDisplayed` - Pager active/inactive

## Next Steps
- Extract state machine to `pt/kernel/job-state-machine.ts`
- Extract step executor to `pt/kernel/step-executor.ts`
```

**Step 3: Commit**

```bash
git add docs/pt-runtime-ios-jobs-analysis.md
git commit -m "docs: analyze IOS jobs system in runtime-assembly"
```

---

### Task 2.2: Create Job State Machine Module

**Files:**
- Create: `packages/pt-runtime/src/pt/kernel/job-state-machine.ts`

**Step 1: Create job-state-machine.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/job-state-machine.ts
// IOS Job state machine extracted from runtime-assembly

import type { DeferredJobPlan, DeferredStep, KernelJobState, JobStatePhase } from "../../domain";

export type JobPhase = 
  | "queued"
  | "waiting-ensure-mode"
  | "waiting-command"
  | "waiting-confirm"
  | "waiting-prompt"
  | "waiting-save"
  | "waiting-delay"
  | "completed"
  | "error";

export interface JobContext {
  job: DeferredJobPlan;
  session: {
    mode: string;
    prompt: string;
    paging: boolean;
    awaitingConfirm: boolean;
  };
}

export function createJobState(plan: DeferredJobPlan): KernelJobState {
  return {
    id: plan.id,
    device: plan.device,
    plan,
    currentStep: 0,
    state: "pending",
    outputBuffer: "",
    startedAt: Date.now(),
    updatedAt: Date.now(),
    stepResults: [],
    lastMode: "",
    lastPrompt: "",
    paged: false,
    waitingForCommandEnd: false,
    finished: false,
    result: null,
    error: null,
    errorCode: null,
  };
}

export function advanceJob(state: KernelJobState, event: string): KernelJobState {
  // State machine transitions will be extracted from runtime-assembly
  // This is a stub
  
  const newState = { ...state, updatedAt: Date.now() };
  
  switch (event) {
    case "start":
      newState.state = "waiting-ensure-mode";
      break;
    case "command-started":
      newState.state = "waiting-command";
      newState.waitingForCommandEnd = true;
      break;
    case "command-ended":
      newState.waitingForCommandEnd = false;
      break;
    // TODO: Full state machine from runtime-assembly.ts
  }
  
  return newState;
}

export function getCurrentStep(state: KernelJobState): DeferredStep | null {
  if (state.currentStep >= state.plan.plan.length) {
    return null;
  }
  return state.plan.plan[state.currentStep];
}

export function stepComplete(state: KernelJobState): KernelJobState {
  const newState = { ...state, updatedAt: Date.now() };
  newState.currentStep++;
  
  if (newState.currentStep >= newState.plan.plan.length) {
    newState.state = "completed";
    newState.finished = true;
  }
  
  return newState;
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/job-state-machine.ts
git commit -m "feat(pt-runtime): add job state machine stub"
```

---

## Phase 3: Build Pipeline (Compile TS to JS)

### Task 3.1: Create Build Directory Structure

**Files:**
- Create: `packages/pt-runtime/src/build/render-main.ts`
- Create: `packages/pt-runtime/src/build/render-runtime.ts`
- Create: `packages/pt-runtime/src/build/pt-safe-transforms.ts`
- Create: `packages/pt-runtime/src/build/validate-pt-safe.ts`
- Create: `packages/pt-runtime/src/build/index.ts`

**Step 1: Create build directory**

```bash
mkdir -p packages/pt-runtime/src/build
```

**Step 2: Create build/pt-safe-transforms.ts**

```typescript
// packages/pt-runtime/src/build/pt-safe-transforms.ts
// Transforms to make TS code compatible with PT Script Module

/**
 * PT Script Module restrictions:
 * - No `import` / `export` statements (use global scope)
 * - No `require()` (use globals)
 * - No `process`, `Buffer`, `console` (use `dprint`)
 * - No async/await (use callbacks)
 * - No classes with extends
 * - No spread operator in some contexts
 */

export interface TransformOptions {
  wrapInFunction?: boolean;
  functionName?: string;
  injectGlobals?: string[];
}

/**
 * Transform TS/JS code to PT-safe JavaScript
 */
export function transformToPtSafe(code: string, options?: TransformOptions): string {
  let result = code;
  
  // Remove import statements (will be inlined or global)
  result = result.replace(/^import .+ from .+;?\s*$/gm, "");
  
  // Remove export statements (will be returned or global)
  result = result.replace(/^export (?:const|let|var|function|class|type|interface) /gm, "");
  result = result.replace(/^export \{[^}]+\};?\s*$/gm, "");
  result = result.replace(/^export default .+;?\s*$/gm, "");
  
  // Remove type annotations (simple pass)
  result = result.replace(/: (\w+)(?=[,\)\s=;])/g, ""); // : Type
  result = result.replace(/<\w+>/g, ""); // <Type>
  
  // Wrap in function if specified
  if (options?.wrapInFunction && options?.functionName) {
    const globals = options.injectGlobals?.join(", ") || "";
    result = `function ${options.functionName}(payload, api) {\n${result}\n}`;
  }
  
  return result;
}

/**
 * Wrap runtime code with PT bootstrap
 */
export function wrapRuntimeBootstrap(code: string): string {
  return `
// PT Runtime - Generated from TypeScript
// Do not edit directly - regenerate with bun run build:runtime

var RUNTIME_EXPORTS = {};

(function() {
${code}
})();

// Export dispatch function
var dispatch = RUNTIME_EXPORTS.dispatch;
`;
}

/**
 * Wrap main kernel code with PT bootstrap
 */
export function wrapMainBootstrap(code: string): string {
  return `
// PT Main Kernel - Generated from TypeScript
// Do not edit directly - regenerate with bun run build:main

${code}

// PT Script Module entry points
function main() {
  bootKernel(CONFIG);
}

function cleanUp() {
  shutdownKernel();
}
`;
}
```

**Step 3: Create build/validate-pt-safe.ts**

```typescript
// packages/pt-runtime/src/build/validate-pt-safe.ts
// Validate generated JS is PT-safe

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

const PT_FORBIDDEN_PATTERNS = [
  { pattern: /\bimport\s+/g, message: "import statements not allowed" },
  { pattern: /\bexport\s+/g, message: "export statements not allowed" },
  { pattern: /\brequire\s*\(/g, message: "require() not allowed" },
  { pattern: /\bprocess\b/g, message: "process global not available" },
  { pattern: /\bBuffer\b/g, message: "Buffer not available" },
  { pattern: /\bconsole\.(log|error|warn|info|debug)/g, message: "console not available, use dprint" },
  { pattern: /\basync\s+function/g, message: "async/await may not work in PT" },
  { pattern: /\bawait\s+/g, message: "await may not work in PT" },
];

const PT_WARNING_PATTERNS = [
  { pattern: /\bclass\s+\w+\s+extends\b/g, message: "class extends may have issues in PT" },
  { pattern: /\.\.\.(\w+)/g, message: "spread operator may have issues in PT" },
];

export function validatePtSafe(code: string): ValidationResult {
  const lines = code.split("\n");
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    for (const { pattern, message } of PT_FORBIDDEN_PATTERNS) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        errors.push({
          line: lineNum + 1,
          column: match.index + 1,
          message,
          severity: "error",
        });
      }
    }
    
    for (const { pattern, message } of PT_WARNING_PATTERNS) {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        warnings.push({
          line: lineNum + 1,
          column: match.index + 1,
          message,
          severity: "warning",
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function formatValidationResult(result: ValidationResult): string {
  const parts: string[] = [];
  
  if (result.errors.length > 0) {
    parts.push("ERRORS:");
    for (const err of result.errors) {
      parts.push(`  ${err.line}:${err.column}: ${err.message}`);
    }
  }
  
  if (result.warnings.length > 0) {
    parts.push("WARNINGS:");
    for (const warn of result.warnings) {
      parts.push(`  ${warn.line}:${warn.column}: ${warn.message}`);
    }
  }
  
  if (result.valid) {
    parts.push("✓ PT-safe validation passed");
  }
  
  return parts.join("\n");
}
```

**Step 4: Create build/render-main.ts**

```typescript
// packages/pt-runtime/src/build/render-main.ts
// Generate main.js from TypeScript kernel modules

import { transformToPtSafe, wrapMainBootstrap } from "./pt-safe-transforms";
import { validatePtSafe, formatValidationResult } from "./validate-pt-safe";
import * as fs from "fs";
import * as path from "path";

export interface RenderMainOptions {
  inputDir: string;
  outputPath: string;
  devDir: string;
}

export async function renderMainSource(options: RenderMainOptions): Promise<string> {
  // Read kernel source files
  const kernelFiles = [
    "pt/kernel/queue.ts",
    "pt/kernel/heartbeat.ts",
    "pt/kernel/runtime-loader.ts",
    "pt/kernel/cleanup.ts",
    "pt/kernel/main.ts",
  ];
  
  let combined = "";
  
  for (const file of kernelFiles) {
    const filePath = path.join(options.inputDir, file);
    if (fs.existsSync(filePath)) {
      const content = await fs.promises.readFile(filePath, "utf-8");
      combined += `\n// --- ${file} ---\n`;
      combined += content;
    }
  }
  
  // Transform to PT-safe
  const transformed = transformToPtSafe(combined, {
    wrapInFunction: false,
  });
  
  // Inject DEV_DIR
  const withDevDir = transformed.replace(/{{DEV_DIR_LITERAL}}/g, `"${options.devDir}"`);
  
  // Wrap with bootstrap
  const bootstrapped = wrapMainBootstrap(withDevDir);
  
  // Validate
  const validation = validatePtSafe(bootstrapped);
  console.log(formatValidationResult(validation));
  
  if (!validation.valid) {
    throw new Error("main.js validation failed");
  }
  
  return bootstrapped;
}

export async function buildMain(options: RenderMainOptions): Promise<void> {
  const code = await renderMainSource(options);
  await fs.promises.writeFile(options.outputPath, code, "utf-8");
  console.log(`✓ Generated ${options.outputPath}`);
}
```

**Step 5: Create build/render-runtime.ts**

```typescript
// packages/pt-runtime/src/build/render-runtime.ts
// Generate runtime.js from TypeScript handler modules

import { transformToPtSafe, wrapRuntimeBootstrap } from "./pt-safe-transforms";
import { validatePtSafe, formatValidationResult } from "./validate-pt-safe";
import * as fs from "fs";
import * as path from "path";

export interface RenderRuntimeOptions {
  inputDir: string;
  outputPath: string;
}

export async function renderRuntimeSource(options: RenderRuntimeOptions): Promise<string> {
  // Read handler and domain source files
  const runtimeFiles = [
    "domain/contracts.ts",
    "domain/deferred-job-plan.ts",
    "domain/runtime-result.ts",
    "runtime/contracts.ts",
    "runtime/types.ts",
    "runtime/constants.ts",
    "handlers/runtime-handlers.ts",
    "handlers/config.ts",
    "handlers/device.ts",
    "handlers/link.ts",
    "handlers/inspect.ts",
  ];
  
  let combined = "";
  
  for (const file of runtimeFiles) {
    const filePath = path.join(options.inputDir, file);
    if (fs.existsSync(filePath)) {
      const content = await fs.promises.readFile(filePath, "utf-8");
      combined += `\n// --- ${file} ---\n`;
      combined += content;
    }
  }
  
  // Transform to PT-safe
  const transformed = transformToPtSafe(combined, {
    wrapInFunction: true,
    functionName: "dispatch",
    injectGlobals: ["ipc", "dprint"],
  });
  
  // Wrap with bootstrap
  const bootstrapped = wrapRuntimeBootstrap(transformed);
  
  // Validate
  const validation = validatePtSafe(bootstrapped);
  console.log(formatValidationResult(validation));
  
  if (!validation.valid) {
    throw new Error("runtime.js validation failed");
  }
  
  return bootstrapped;
}

export async function buildRuntime(options: RenderRuntimeOptions): Promise<void> {
  const code = await renderRuntimeSource(options);
  await fs.promises.writeFile(options.outputPath, code, "utf-8");
  console.log(`✓ Generated ${options.outputPath}`);
}
```

**Step 6: Create build/index.ts**

```typescript
// packages/pt-runtime/src/build/index.ts
export * from "./pt-safe-transforms";
export * from "./validate-pt-safe";
export * from "./render-main";
export * from "./render-runtime";
```

**Step 7: Add build scripts to package.json**

Edit `packages/pt-runtime/package.json`:

```json
{
  "scripts": {
    "build:main": "bun run src/scripts/build-main.ts",
    "build:runtime": "bun run src/scripts/build-runtime.ts",
    "build": "bun run build:main && bun run build:runtime"
  }
}
```

**Step 8: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 9: Commit**

```bash
git add packages/pt-runtime/src/build/
git add packages/pt-runtime/package.json
git commit -m "feat(pt-runtime): add build pipeline scaffolding"
```

---

## Phase 4: Tests

### Task 4.1: Create Unit Tests for Domain Layer

**Files:**
- Create: `packages/pt-runtime/src/__tests__/domain/deferred-job-plan.test.ts`
- Create: `packages/pt-runtime/src/__tests__/domain/runtime-result.test.ts`

**Step 1: Create test directory**

```bash
mkdir -p packages/pt-runtime/src/__tests__/domain
```

**Step 2: Create deferred-job-plan.test.ts**

```typescript
// packages/pt-runtime/src/__tests__/domain/deferred-job-plan.test.ts
import { describe, test, expect } from "bun:test";
import {
  createDeferredJobPlan,
  ensureModeStep,
  commandStep,
  confirmStep,
  expectPromptStep,
  saveConfigStep,
} from "../../domain/deferred-job-plan";

describe("createDeferredJobPlan", () => {
  test("creates plan with id", () => {
    const plan = createDeferredJobPlan("R1", [
      commandStep("show version"),
    ]);
    
    expect(plan.id).toMatch(/^ios_job_/);
    expect(plan.device).toBe("R1");
    expect(plan.kind).toBe("ios-session");
    expect(plan.version).toBe(1);
    expect(plan.plan).toHaveLength(1);
  });

  test("uses custom options", () => {
    const plan = createDeferredJobPlan("R1", [], {
      stopOnError: false,
      commandTimeoutMs: 5000,
    });
    
    expect(plan.options.stopOnError).toBe(false);
    expect(plan.options.commandTimeoutMs).toBe(5000);
  });
});

describe("step builders", () => {
  test("ensureModeStep", () => {
    const step = ensureModeStep("privileged");
    expect(step.type).toBe("ensure-mode");
    expect(step.value).toBe("privileged");
  });

  test("commandStep", () => {
    const step = commandStep("show version", { timeoutMs: 10000 });
    expect(step.type).toBe("command");
    expect(step.value).toBe("show version");
    expect(step.options?.timeoutMs).toBe(10000);
  });

  test("confirmStep", () => {
    const step = confirmStep();
    expect(step.type).toBe("confirm");
    expect(step.value).toBeUndefined();
  });

  test("expectPromptStep", () => {
    const step = expectPromptStep("Router#");
    expect(step.type).toBe("expect-prompt");
    expect(step.value).toBe("Router#");
  });

  test("saveConfigStep", () => {
    const step = saveConfigStep();
    expect(step.type).toBe("save-config");
  });
});
```

**Step 3: Create runtime-result.test.ts**

```typescript
// packages/pt-runtime/src/__tests__/domain/runtime-result.test.ts
import { describe, test, expect } from "bun:test";
import { okResult, errorResult, deferredResult } from "../../domain/runtime-result";
import { createDeferredJobPlan, commandStep } from "../../domain/deferred-job-plan";

describe("okResult", () => {
  test("creates success result", () => {
    const result = okResult("output here");
    
    expect(result.ok).toBe(true);
    expect(result.raw).toBe("output here");
    expect(result.status).toBeUndefined();
  });

  test("creates success result with options", () => {
    const result = okResult("output", {
      status: 0,
      parsed: { version: "15.1" },
      session: { mode: "privileged", prompt: "Router#", paging: false, awaitingConfirm: false },
    });
    
    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.parsed?.version).toBe("15.1");
  });
});

describe("errorResult", () => {
  test("creates error result", () => {
    const result = errorResult("Something went wrong");
    
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Something went wrong");
  });

  test("creates error result with options", () => {
    const result = errorResult("Command failed", {
      code: "CMD_FAILED",
      raw: "Error: Invalid input",
    });
    
    expect(result.ok).toBe(false);
    expect(result.code).toBe("CMD_FAILED");
    expect(result.raw).toBe("Error: Invalid input");
  });
});

describe("deferredResult", () => {
  test("creates deferred result", () => {
    const plan = createDeferredJobPlan("R1", [commandStep("show version")]);
    const result = deferredResult("ticket-123", plan);
    
    expect(result.ok).toBe(true);
    expect(result.deferred).toBe(true);
    expect(result.ticket).toBe("ticket-123");
    expect(result.job).toBe(plan);
  });
});
```

**Step 4: Run tests**

```bash
cd packages/pt-runtime && bun test __tests__/domain/
```

**Step 5: Commit**

```bash
git add packages/pt-runtime/src/__tests__/domain/
git commit -m "test(pt-runtime): add unit tests for domain layer"
```

---

### Task 4.2: Create Unit Tests for Terminal Session

**Files:**
- Create: `packages/pt-runtime/src/__tests__/pt/terminal-session.test.ts`

**Step 1: Create test directory**

```bash
mkdir -p packages/pt-runtime/src/__tests__/pt
```

**Step 2: Create terminal-session.test.ts**

```typescript
// packages/pt-runtime/src/__tests__/pt/terminal-session.test.ts
import { describe, test, expect } from "bun:test";
import {
  createTerminalSession,
  toSnapshot,
  updateMode,
  updatePrompt,
  setPaging,
  setBusy,
} from "../../pt/terminal/terminal-session";

describe("createTerminalSession", () => {
  test("creates default session", () => {
    const session = createTerminalSession("R1");
    
    expect(session.device).toBe("R1");
    expect(session.mode).toBe("unknown");
    expect(session.prompt).toBe("");
    expect(session.paging).toBe(false);
    expect(session.awaitingConfirm).toBe(false);
    expect(session.busyJobId).toBeNull();
    expect(session.healthy).toBe(true);
  });
});

describe("toSnapshot", () => {
  test("converts to SessionStateSnapshot", () => {
    const session = createTerminalSession("R1");
    session.mode = "privileged";
    session.prompt = "Router#";
    
    const snapshot = toSnapshot(session);
    
    expect(snapshot.mode).toBe("privileged");
    expect(snapshot.prompt).toBe("Router#");
    expect(snapshot.paging).toBe(false);
    expect(snapshot.awaitingConfirm).toBe(false);
  });
});

describe("updateMode", () => {
  test("updates mode", () => {
    const session = createTerminalSession("R1");
    const updated = updateMode(session, "privileged");
    
    expect(updated.mode).toBe("privileged");
    expect(updated.device).toBe("R1");
  });
});

describe("updatePrompt", () => {
  test("updates prompt", () => {
    const session = createTerminalSession("R1");
    const updated = updatePrompt(session, "Router(config)#");
    
    expect(updated.prompt).toBe("Router(config)#");
  });
});

describe("setPaging", () => {
  test("sets paging", () => {
    const session = createTerminalSession("R1");
    const updated = setPaging(session, true);
    
    expect(updated.paging).toBe(true);
  });
});

describe("setBusy", () => {
  test("sets busy job", () => {
    const session = createTerminalSession("R1");
    const updated = setBusy(session, "job-123");
    
    expect(updated.busyJobId).toBe("job-123");
  });

  test("clears busy job", () => {
    const session = createTerminalSession("R1");
    session.busyJobId = "job-123";
    const updated = setBusy(session, null);
    
    expect(updated.busyJobId).toBeNull();
  });
});
```

**Step 3: Run tests**

```bash
cd packages/pt-runtime && bun test __tests__/pt/
```

**Step 4: Commit**

```bash
git add packages/pt-runtime/src/__tests__/pt/
git commit -m "test(pt-runtime): add unit tests for terminal session"
```

---

## Phase 5: Integration Tests

### Task 5.1: Create Build Integration Test

**Files:**
- Create: `packages/pt-runtime/tests/integration/build.test.ts`

**Step 1: Create test directory**

```bash
mkdir -p packages/pt-runtime/tests/integration
```

**Step 2: Create build.test.ts**

```typescript
// packages/pt-runtime/tests/integration/build.test.ts
import { describe, test, expect, beforeAll } from "bun:test";
import { validatePtSafe } from "../../src/build/validate-pt-safe";

describe("Build Integration", () => {
  describe("validatePtSafe", () => {
    test("accepts PT-safe code", () => {
      const code = `
var CONFIG = {
  devDir: "/Users/example/pt-dev"
};

function main() {
  dprint("[PT] Starting...");
}

function cleanUp() {
  dprint("[PT] Cleanup...");
}
`;
      const result = validatePtSafe(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("rejects import statements", () => {
      const code = `
import { something } from "./module";
function main() {}
`;
      const result = validatePtSafe(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes("import"))).toBe(true);
    });

    test("rejects export statements", () => {
      const code = `
export function main() {}
`;
      const result = validatePtSafe(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes("export"))).toBe(true);
    });

    test("rejects console.log", () => {
      const code = `
function main() {
  console.log("Hello");
}
`;
      const result = validatePtSafe(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes("console"))).toBe(true);
    });

    test("warns on async/await", () => {
      const code = `
async function main() {
  await something();
}
`;
      const result = validatePtSafe(code);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 3: Run tests**

```bash
cd packages/pt-runtime && bun test tests/integration/
```

**Step 4: Commit**

```bash
git add packages/pt-runtime/tests/integration/
git commit -m "test(pt-runtime): add build integration tests"
```

---

## Phase 6: Retire Legacy Templates

### Task 6.1: Create Migration Script

**Files:**
- Create: `packages/pt-runtime/scripts/migrate-from-legacy.ts`

**Step 1: Create migration script**

```typescript
// packages/pt-runtime/scripts/migrate-from-legacy.ts
/**
 * Migration script to switch from legacy template generation to new build system
 */

import * as fs from "fs";
import * as path from "path";

const LEGACY_FILES = [
  "src/templates/runtime-assembly.ts",
  "src/templates/main-kernel-assembly.ts",
  "src/templates/session-template.ts",
  "src/templates/dispatcher-template.ts",
  "src/templates/helpers-template.ts",
  "src/templates/constants-template.ts",
];

const NEW_FILES = [
  "src/domain/",
  "src/pt/kernel/",
  "src/pt/terminal/",
  "src/build/",
];

function backupLegacy(): void {
  console.log("Backing up legacy files...");
  
  const backupDir = "src/templates.legacy-backup";
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  for (const file of LEGACY_FILES) {
    if (fs.existsSync(file)) {
      const dest = path.join(backupDir, path.basename(file));
      fs.copyFileSync(file, dest);
      console.log(`  ✓ Backed up ${file}`);
    }
  }
}

function verifyNewFiles(): boolean {
  console.log("Verifying new files exist...");
  
  for (const dir of NEW_FILES) {
    if (!fs.existsSync(dir)) {
      console.error(`  ✗ Missing: ${dir}`);
      return false;
    }
    console.log(`  ✓ Found: ${dir}`);
  }
  
  return true;
}

function markDeprecated(): void {
  console.log("Marking legacy files as deprecated...");
  
  for (const file of LEGACY_FILES) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf-8");
      const deprecated = `/**\n * @deprecated Use src/build/ instead\n * This file will be removed in next major version\n */\n${content}`;
      fs.writeFileSync(file, deprecated, "utf-8");
      console.log(`  ✓ Deprecated: ${file}`);
    }
  }
}

function main(): void {
  console.log("=== PT Runtime Migration ===\n");
  
  // Verify new files
  if (!verifyNewFiles()) {
    console.error("\n✗ Migration failed: New files not found");
    console.error("Run Phase 1-5 first to create new structure");
    process.exit(1);
  }
  
  // Backup legacy
  backupLegacy();
  
  // Mark deprecated
  markDeprecated();
  
  console.log("\n✓ Migration complete!");
  console.log("\nNext steps:");
  console.log("1. Update src/index.ts to export from new structure");
  console.log("2. Run bun run build:main && bun run build:runtime");
  console.log("3. Compare generated files with baseline");
  console.log("4. Run all tests");
  console.log("5. Delete src/templates.legacy-backup/ when confident");
}

main();
```

**Step 2: Run migration script**

```bash
cd packages/pt-runtime && bun run scripts/migrate-from-legacy.ts
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/scripts/migrate-from-legacy.ts
git add packages/pt-runtime/src/templates.*.ts
git commit -m "chore(pt-runtime): mark legacy templates as deprecated"
```

---

### Task 6.2: Update Exports

**Files:**
- Modify: `packages/pt-runtime/src/index.ts`

**Step 1: Update index.ts to use new structure**

```typescript
// packages/pt-runtime/src/index.ts
// Export new architecture
export * from "./domain";
export * from "./runtime";
export * from "./core";
export * from "./handlers";

// Export PT kernel (for PT Script Module)
export * from "./pt/kernel";

// Export contracts for external use
export type {
  RuntimeResult,
  RuntimeErrorResult,
  RuntimeSuccessResult,
  RuntimeDeferredResult,
  DeferredJobPlan,
  DeferredStep,
  DeferredStepType,
  DeferredJobOptions,
  RuntimeApi,
  DeviceRef,
  SessionStateSnapshot,
  KernelJobState,
  DeviceSessionState,
  CommandEnvelope,
  ResultEnvelope,
} from "./runtime/contracts";

// Build system exports
export { renderMainSource, buildMain } from "./build/render-main";
export { renderRuntimeSource, buildRuntime } from "./build/render-runtime";
export { validatePtSafe } from "./build/validate-pt-safe";
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/index.ts
git commit -m "feat(pt-runtime): update exports to use new architecture"
```

---

## Phase 7: Final Verification

### Task 7.1: Compare Generated Artifacts

**Step 1: Run build**

```bash
cd packages/pt-runtime
bun run build:main
bun run build:runtime
```

**Step 2: Compare with baseline**

```bash
diff -u generated/baseline/main.js.baseline generated/main.js
diff -u generated/baseline/runtime.js.baseline generated/runtime.js
```

**Step 3: Document differences**

Create `docs/pt-runtime-migration-diff.md`:

```markdown
# Migration Differences

## main.js differences
- [List any functional differences]

## runtime.js differences
- [List any functional differences]

## Notes
- [Any behavior changes that are intentional]
```

**Step 4: Commit**

```bash
git add generated/main.js generated/runtime.js docs/pt-runtime-migration-diff.md
git commit -m "chore(pt-runtime): compare generated artifacts"
```

---

### Task 7.2: Run Full Test Suite

**Step 1: Run all tests**

```bash
cd packages/pt-runtime && bun test
```

**Step 2: Ensure all pass**

```bash
# If tests fail, fix and commit
bun test --coverage
```

**Step 3: Commit**

```bash
git commit --allow-empty -m "test(pt-runtime): verify all tests pass"
```

---

### Task 7.3: Final Cleanup

**Step 1: Remove legacy backup (only if confident)**

```bash
rm -rf packages/pt-runtime/src/templates.legacy-backup
```

**Step 2: Update README**

Edit `packages/pt-runtime/README.md` to reflect new architecture.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore(pt-runtime): complete migration to new architecture"
git push origin feat/pt-runtime-migration
```

---

## Summary

### What Changed
1. ✅ Domain layer (`src/domain/`) - Contracts and helpers
2. ✅ PT Kernel (`src/pt/kernel/`) - Lifecycle modules
3. ✅ PT Terminal (`src/pt/terminal/`) - Session management
4. ✅ Build system (`src/build/`) - TS to PT-safe JS
5. ✅ Unit tests for domain and terminal
6. ✅ Integration tests for build
7. ✅ Legacy templates deprecated

### Files Created
- `src/domain/contracts.ts`
- `src/domain/deferred-job-plan.ts`
- `src/domain/runtime-result.ts`
- `src/pt/kernel/queue.ts`
- `src/pt/kernel/heartbeat.ts`
- `src/pt/kernel/runtime-loader.ts`
- `src/pt/kernel/cleanup.ts`
- `src/pt/kernel/main.ts`
- `src/pt/terminal/terminal-engine.ts`
- `src/pt/terminal/terminal-session.ts`
- `src/pt/terminal/terminal-events.ts`
- `src/build/pt-safe-transforms.ts`
- `src/build/validate-pt-safe.ts`
- `src/build/render-main.ts`
- `src/build/render-runtime.ts`

### Files Deprecated
- `src/templates/runtime-assembly.ts`
- `src/templates/main-kernel-assembly.ts`
- (other legacy templates)

### Success Criteria
- ✅ All tests pass
- ✅ Generated artifacts match baseline behavior
- ✅ No PT-unsafe patterns in output
- ✅ Domain handlers testable outside PT
- ✅ TerminalEngine is single session owner
- ✅ main.js < 500 lines (kernel only)
- ✅ runtime.js compiled from TS

---

## Next Steps After Migration

1. **Investigate PT API** - Read PT documentation for `TerminalLine` events
2. **Implement TerminalEngine** - Complete stub in `pt/terminal/terminal-engine.ts`
3. **Wire up handlers** - Connect existing handlers to new build system
4. **Performance testing** - Ensure hot reload works correctly
5. **Documentation** - Update API docs for new architecture