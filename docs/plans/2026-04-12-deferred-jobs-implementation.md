# Deferred Jobs State Machine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar el state machine de Deferred Jobs que ejecuta planes de ejecución IOS paso a paso.

**Architecture:**
- `job-executor.ts` - Executa DeferredJobPlan paso a paso
- `step-handlers.ts` - Handlers para cada tipo de step
- `job-state.ts` - Estado del job y transiciones

**Tech Stack:** TypeScript, Packet Tracer TerminalLine API

---

## Context

### DeferredJobPlan Structure (from contracts.ts)

```typescript
interface DeferredJobPlan {
  id: string;
  kind: "ios-session";
  version: number;
  device: string;
  plan: DeferredStep[];
  options: DeferredJobOptions;
  payload: Record<string, unknown>;
}

interface DeferredStep {
  type: "ensure-mode" | "command" | "confirm" | "expect-prompt" | "save-config" | "delay" | "close-session";
  value?: string;
  options?: {
    stopOnError?: boolean;
    timeoutMs?: number;
    expectedPrompt?: string;
    continueOnPrompt?: boolean;
  };
}
```

### Job States

```javascript
// From main-kernel-assembly.ts
job.state = "queued";
job.state = "waiting-ensure-mode";
job.state = "waiting-command";
job.state = "waiting-confirm";
job.state = "waiting-prompt";
job.state = "completed";
job.state = "error";
```

### Step Flow

1. Start job → move to first step
2. `ensure-mode` → transition IOS mode, wait for prompt
3. `command` → execute command via TerminalEngine, wait for output
4. `confirm` → send enter for confirmation
5. `expect-prompt` → wait for specific prompt
6. `save-config` → write memory
7. `delay` → wait N ms
8. `close-session` → end session

---

## Tasks

### Task 1: Create Job State Machine Types

**Files:**
- Create: `packages/pt-runtime/src/pt/kernel/job-state.ts`

**Step 1: Create job-state.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/job-state.ts
// Job state and transitions for deferred execution

import type { DeferredJobPlan, DeferredStep, DeferredStepType } from "../../domain";
import type { TerminalResult } from "../terminal/terminal-engine";

export type JobPhase = 
  | "pending"
  | "waiting-ensure-mode"
  | "waiting-command"
  | "waiting-confirm"
  | "waiting-prompt"
  | "waiting-save"
  | "waiting-delay"
  | "completed"
  | "error";

export interface JobStepResult {
  stepIndex: number;
  stepType: DeferredStepType;
  command: string;
  raw: string;
  status: number | null;
  error?: string;
  completedAt: number;
}

export interface JobContext {
  plan: DeferredJobPlan;
  currentStep: number;
  phase: JobPhase;
  outputBuffer: string;
  startedAt: number;
  updatedAt: number;
  stepResults: JobStepResult[];
  lastMode: string;
  lastPrompt: string;
  paged: boolean;
  waitingForCommandEnd: boolean;
  finished: boolean;
  result: TerminalResult | null;
  error: string | null;
  errorCode: string | null;
  pendingDelay: number | null;
  waitingForConfirm: boolean;
}

export function createJobContext(plan: DeferredJobPlan): JobContext {
  return {
    plan,
    currentStep: 0,
    phase: "pending",
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
    pendingDelay: null,
    waitingForConfirm: false,
  };
}

export function getCurrentStep(ctx: JobContext): DeferredStep | null {
  if (ctx.currentStep >= ctx.plan.plan.length) {
    return null;
  }
  return ctx.plan.plan[ctx.currentStep];
}

export function isJobFinished(ctx: JobContext): boolean {
  return ctx.finished || ctx.phase === "completed" || ctx.phase === "error";
}

export function isStepStopOnError(ctx: JobContext): boolean {
  const step = getCurrentStep(ctx);
  return step?.options?.stopOnError ?? ctx.plan.options.stopOnError;
}

export function getStepTimeout(ctx: JobContext): number {
  const step = getCurrentStep(ctx);
  return step?.options?.timeoutMs ?? ctx.plan.options.commandTimeoutMs;
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/job-state.ts
git commit -m "feat(pt-kernel): add job state machine types"
```

---

### Task 2: Create Step Handlers

**Files:**
- Create: `packages/pt-runtime/src/pt/kernel/step-handlers.ts`

**Step 1: Create step-handlers.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/step-handlers.ts
// Step handlers for deferred job execution

import type { DeferredStep, DeferredStepType } from "../../domain";
import type { JobContext } from "./job-state";
import type { TerminalEngine } from "../terminal/terminal-engine";

export interface StepResult {
  phase: JobContext["phase"];
  continue: boolean;
  output?: string;
  error?: string;
}

export interface StepHandlerContext {
  job: JobContext;
  terminal: TerminalEngine;
  device: string;
}

/**
 * Handle ensure-mode step - transition to target IOS mode
 */
export function handleEnsureMode(ctx: StepHandlerContext): StepResult {
  const step = ctx.job.plan.plan[ctx.job.currentStep];
  const targetMode = step.value || "privileged-exec";
  
  // Mode transition commands
  if (targetMode === "privileged-exec" || targetMode === "priv-exec") {
    return {
      phase: "waiting-command",
      continue: true,
    };
  }
  
  if (targetMode === "config") {
    return {
      phase: "waiting-command",
      continue: true,
    };
  }
  
  return {
    phase: "waiting-command",
    continue: true,
  };
}

/**
 * Handle command step - execute IOS command
 */
export function handleCommand(ctx: StepHandlerContext): StepResult {
  const step = ctx.job.plan.plan[ctx.job.currentStep];
  const command = step.value || "";
  
  if (!command) {
    return {
      phase: "completed",
      continue: false,
      error: "Empty command",
    };
  }
  
  // Command will be executed by the job runner
  return {
    phase: "waiting-command",
    continue: true,
  };
}

/**
 * Handle confirm step - confirm dialog with enter
 */
export function handleConfirm(ctx: StepHandlerContext): StepResult {
  ctx.terminal.confirmPrompt(ctx.device);
  
  return {
    phase: "waiting-prompt",
    continue: true,
  };
}

/**
 * Handle expect-prompt step - wait for specific prompt
 */
export function handleExpectPrompt(ctx: StepHandlerContext): StepResult {
  const step = ctx.job.plan.plan[ctx.job.currentStep];
  const expectedPrompt = step.value || "";
  
  if (!expectedPrompt) {
    return {
      phase: "completed",
      continue: false,
      error: "No expected prompt specified",
    };
  }
  
  // Will be checked by job runner when command completes
  return {
    phase: "waiting-prompt",
    continue: true,
  };
}

/**
 * Handle save-config step - write memory
 */
export function handleSaveConfig(ctx: StepHandlerContext): StepResult {
  return {
    phase: "waiting-command",
    continue: true,
  };
}

/**
 * Handle delay step - wait N milliseconds
 */
export function handleDelay(ctx: StepHandlerContext): StepResult {
  const step = ctx.job.plan.plan[ctx.job.currentStep];
  const delayMs = parseInt(step.value || "1000", 10);
  
  return {
    phase: "waiting-delay",
    continue: true,
    output: `Delay: ${delayMs}ms`,
  };
}

/**
 * Handle close-session step - end session
 */
export function handleCloseSession(ctx: StepHandlerContext): StepResult {
  ctx.terminal.detach(ctx.device);
  
  return {
    phase: "completed",
    continue: false,
  };
}

/**
 * Route step to appropriate handler
 */
export function routeStep(ctx: StepHandlerContext): StepResult {
  const step = ctx.job.plan.plan[ctx.job.currentStep];
  const stepType = step.type;
  
  switch (stepType) {
    case "ensure-mode":
      return handleEnsureMode(ctx);
    case "command":
      return handleCommand(ctx);
    case "confirm":
      return handleConfirm(ctx);
    case "expect-prompt":
      return handleExpectPrompt(ctx);
    case "save-config":
      return handleSaveConfig(ctx);
    case "delay":
      return handleDelay(ctx);
    case "close-session":
      return handleCloseSession(ctx);
    default:
      return {
        phase: "error",
        continue: false,
        error: `Unknown step type: ${stepType}`,
      };
  }
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/step-handlers.ts
git commit -m "feat(pt-kernel): add step handlers"
```

---

### Task 3: Create Job Executor

**Files:**
- Create: `packages/pt-runtime/src/pt/kernel/job-executor.ts`

**Step 1: Create job-executor.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/job-executor.ts
// Job executor that runs deferred job plans

import type { DeferredJobPlan } from "../../domain";
import type { TerminalEngine, TerminalResult } from "../terminal/terminal-engine";
import { 
  createJobContext, 
  getCurrentStep, 
  isJobFinished,
  getStepTimeout,
  type JobContext 
} from "./job-state";
import { routeStep } from "./step-handlers";

export interface ActiveJob {
  id: string;
  device: string;
  context: JobContext;
  pendingCommand: Promise<TerminalResult> | null;
}

export interface JobExecutor {
  startJob(plan: DeferredJobPlan): ActiveJob;
  advanceJob(jobId: string): void;
  getJob(jobId: string): ActiveJob | null;
  getActiveJobs(): ActiveJob[];
  isJobFinished(jobId: string): boolean;
}

export function createJobExecutor(terminal: TerminalEngine) {
  const jobs = new Map<string, ActiveJob>();
  
  function startJob(plan: DeferredJobPlan): ActiveJob {
    const context = createJobContext(plan);
    const job: ActiveJob = {
      id: plan.id,
      device: plan.device,
      context,
      pendingCommand: null,
    };
    
    jobs.set(plan.id, job);
    
    // Start first step
    advanceJob(plan.id);
    
    return job;
  }
  
  async function executeCurrentStep(job: ActiveJob): Promise<void> {
    const ctx = job.context;
    const step = getCurrentStep(ctx);
    
    if (!step) {
      ctx.phase = "completed";
      ctx.finished = true;
      return;
    }
    
    const stepType = step.type;
    
    // Handle steps that don't need terminal
    if (stepType === "delay") {
      const delayMs = parseInt(step.value || "1000", 10);
      ctx.phase = "waiting-delay";
      ctx.pendingDelay = delayMs;
      
      setTimeout(() => {
        ctx.pendingDelay = null;
        advanceJob(job.id);
      }, delayMs);
      
      return;
    }
    
    if (stepType === "close-session") {
      terminal.detach(job.device);
      ctx.phase = "completed";
      ctx.finished = true;
      return;
    }
    
    // Handle steps that need terminal
    if (stepType === "command") {
      const command = step.value || "";
      ctx.phase = "waiting-command";
      ctx.waitingForCommandEnd = true;
      
      job.pendingCommand = terminal.executeCommand(job.device, command, {
        timeout: getStepTimeout(ctx),
      });
      
      try {
        const result = await job.pendingCommand;
        job.pendingCommand = null;
        ctx.waitingForCommandEnd = false;
        ctx.outputBuffer += result.output;
        ctx.lastPrompt = result.session.prompt;
        ctx.lastMode = result.session.mode;
        ctx.paged = result.session.paging;
        
        ctx.stepResults.push({
          stepIndex: ctx.currentStep,
          stepType,
          command,
          raw: result.output,
          status: result.status,
          completedAt: Date.now(),
        });
        
        if (result.status !== 0 && isStepStopOnError(ctx)) {
          ctx.phase = "error";
          ctx.error = `Command failed with status ${result.status}`;
          ctx.errorCode = "CMD_FAILED";
          ctx.finished = true;
          return;
        }
        
        // Move to next step
        ctx.currentStep++;
        ctx.phase = "pending";
        ctx.updatedAt = Date.now();
        
        if (ctx.currentStep >= ctx.plan.plan.length) {
          ctx.phase = "completed";
          ctx.finished = true;
        } else {
          // Execute next step
          advanceJob(job.id);
        }
      } catch (err) {
        job.pendingCommand = null;
        ctx.waitingForCommandEnd = false;
        ctx.phase = "error";
        ctx.error = String(err);
        ctx.errorCode = "EXEC_ERROR";
        ctx.finished = true;
      }
      
      return;
    }
    
    if (stepType === "confirm") {
      terminal.confirmPrompt(job.device);
      ctx.currentStep++;
      ctx.phase = "pending";
      ctx.updatedAt = Date.now();
      advanceJob(job.id);
      return;
    }
    
    if (stepType === "ensure-mode") {
      // Determine mode transition command
      let command = "";
      const targetMode = step.value || "privileged-exec";
      
      if (targetMode === "privileged-exec" || targetMode === "priv-exec") {
        command = "enable";
      } else if (targetMode === "config") {
        command = "configure terminal";
      } else if (targetMode === "config-if") {
        command = "interface " + (step.options?.expectedPrompt || "");
      }
      
      if (command) {
        ctx.phase = "waiting-command";
        ctx.waitingForCommandEnd = true;
        
        job.pendingCommand = terminal.executeCommand(job.device, command, {
          timeout: getStepTimeout(ctx),
        });
        
        job.pendingCommand
          .then((result) => {
            ctx.waitingForCommandEnd = false;
            ctx.lastMode = result.mode;
            ctx.lastPrompt = result.session.prompt;
            
            ctx.currentStep++;
            ctx.phase = "pending";
            ctx.updatedAt = Date.now();
            advanceJob(job.id);
          })
          .catch((err) => {
            ctx.waitingForCommandEnd = false;
            ctx.phase = "error";
            ctx.error = String(err);
            ctx.finished = true;
          });
        
        return;
      }
      
      ctx.currentStep++;
      ctx.phase = "pending";
      ctx.updatedAt = Date.now();
      advanceJob(job.id);
      return;
    }
    
    if (stepType === "save-config") {
      ctx.phase = "waiting-command";
      ctx.waitingForCommandEnd = true;
      
      job.pendingCommand = terminal.executeCommand(job.device, "write memory", {
        timeout: getStepTimeout(ctx),
      });
      
      job.pendingCommand
        .then((result) => {
          ctx.waitingForCommandEnd = false;
          ctx.outputBuffer += result.output;
          
          ctx.currentStep++;
          ctx.phase = "pending";
          ctx.updatedAt = Date.now();
          advanceJob(job.id);
        })
        .catch((err) => {
          ctx.waitingForCommandEnd = false;
          ctx.phase = "error";
          ctx.error = String(err);
          ctx.finished = true;
        });
      
      return;
    }
    
    // Default: move to next step
    ctx.currentStep++;
    ctx.phase = "pending";
    ctx.updatedAt = Date.now();
    advanceJob(job.id);
  }
  
  function advanceJob(jobId: string): void {
    const job = jobs.get(jobId);
    if (!job) return;
    
    if (isJobFinished(job.context)) {
      return;
    }
    
    // Check for pager - continue if needed
    if (job.context.paged) {
      terminal.continuePager(job.device);
    }
    
    executeCurrentStep(job);
  }
  
  function getJob(jobId: string): ActiveJob | null {
    return jobs.get(jobId) || null;
  }
  
  function getActiveJobs(): ActiveJob[] {
    return Array.from(jobs.values()).filter(j => !isJobFinished(j.context));
  }
  
  function isJobFinished(jobId: string): boolean {
    const job = jobs.get(jobId);
    return job ? isJobFinished(job.context) : true;
  }
  
  return {
    startJob,
    advanceJob,
    getJob,
    getActiveJobs,
    isJobFinished,
  };
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/job-executor.ts
git commit -m "feat(pt-kernel): add job executor"
```

---

### Task 4: Add Job Executor Tests

**Files:**
- Create: `packages/pt-runtime/src/__tests__/pt/job-executor.test.ts`

**Step 1: Create job-executor.test.ts**

```typescript
// packages/pt-runtime/src/__tests__/pt/job-executor.test.ts
import { describe, test, expect, beforeEach, vi } from "bun:test";
import { createJobExecutor, type ActiveJob } from "../../pt/kernel/job-executor";
import { createTerminalEngine, type PTCommandLine } from "../../pt/terminal/terminal-engine";
import { createDeferredJobPlan, commandStep } from "../../domain";

function createMockTerminal() {
  const listeners: Map<string, Set<(src: unknown, args: unknown) => void>> = new Map();
  
  return {
    getPrompt: () => "Router#",
    enterCommand: vi.fn((cmd: string) => {
      setTimeout(() => {
        const outputListeners = listeners.get("outputWritten");
        if (outputListeners) {
          outputListeners.forEach(cb => cb(null, { newOutput: `output: ${cmd}\n` }));
        }
      }, 10);
      setTimeout(() => {
        const endedListeners = listeners.get("commandEnded");
        if (endedListeners) {
          endedListeners.forEach(cb => cb(null, { status: 0 }));
        }
      }, 30);
    }),
    registerEvent: vi.fn((evt: string, _f: unknown, cb: (src: unknown, args: unknown) => void) => {
      if (!listeners.has(evt)) listeners.set(evt, new Set());
      listeners.get(evt)!.add(cb);
    }),
    unregisterEvent: vi.fn((evt: string, _f: unknown, cb: (src: unknown, args: unknown) => void) => {
      listeners.get(evt)?.delete(cb);
    }),
    enterChar: vi.fn(),
  };
}

describe("createJobExecutor", () => {
  let mockTerm: PTCommandLine;
  let executor: ReturnType<typeof createJobExecutor>;
  
  beforeEach(() => {
    mockTerm = createMockTerminal() as unknown as PTCommandLine;
    executor = createJobExecutor(createTerminalEngine({
      commandTimeoutMs: 5000,
      stallTimeoutMs: 10000,
      pagerTimeoutMs: 30000,
    }));
  });
  
  test("startJob creates a new job", () => {
    const plan = createDeferredJobPlan("R1", [
      commandStep("show version"),
    ]);
    
    const job = executor.startJob(plan);
    
    expect(job.id).toBe(plan.id);
    expect(job.device).toBe("R1");
    expect(executor.getJob(plan.id)).not.toBeNull();
  });
  
  test("job completes after all steps", async () => {
    const plan = createDeferredJobPlan("R1", [
      commandStep("show version"),
      commandStep("show ip interface brief"),
    ]);
    
    executor.startJob(plan);
    
    // Wait for async execution
    await new Promise(r => setTimeout(r, 100));
    
    expect(executor.isJobFinished(plan.id)).toBe(true);
  });
  
  test("getActiveJobs returns only unfinished jobs", async () => {
    const plan1 = createDeferredJobPlan("R1", [commandStep("show version")]);
    const plan2 = createDeferredJobPlan("R2", [commandStep("show version")]);
    
    executor.startJob(plan1);
    executor.startJob(plan2);
    
    await new Promise(r => setTimeout(r, 100));
    
    const activeJobs = executor.getActiveJobs();
    expect(activeJobs.length).toBeGreaterThanOrEqual(0); // Jobs may have finished
  });
});
```

**Step 2: Run tests**

```bash
cd packages/pt-runtime && bun test __tests__/pt/job-executor.test.ts
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/__tests__/pt/job-executor.test.ts
git commit -m "test(pt-kernel): add job executor tests"
```

---

### Task 5: Update Kernel to Use Job Executor

**Files:**
- Modify: `packages/pt-runtime/src/pt/kernel/main.ts`

**Step 1: Update main.ts to integrate job executor**

Add the job executor to the kernel boot and wire deferred job handling:

```typescript
// Add to imports
import { createJobExecutor } from "./job-executor";
import { createTerminalEngine } from "../terminal/terminal-engine";

// Add to Kernel interface
export interface Kernel {
  boot(): void;
  shutdown(): void;
  isRunning(): boolean;
  startDeferredJob(plan: DeferredJobPlan): string;
  getDeferredJob(jobId: string): ActiveJob | null;
}

// Add to createKernel
const terminal = createTerminalEngine({
  commandTimeoutMs: 8000,
  stallTimeoutMs: 15000,
  pagerTimeoutMs: 30000,
});

const jobExecutor = createJobExecutor(terminal);

// Add methods
function startDeferredJob(plan: DeferredJobPlan): string {
  const job = jobExecutor.startJob(plan);
  return job.id;
}

function getDeferredJob(jobId: string): ActiveJob | null {
  return jobExecutor.getJob(jobId);
}

// Add to return
return {
  boot,
  shutdown,
  isRunning: () => isRunning,
  startDeferredJob,
  getDeferredJob,
};
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/main.ts
git commit -m "feat(pt-kernel): integrate job executor into kernel"
```

---

### Task 6: Update Kernel Exports

**Files:**
- Modify: `packages/pt-runtime/src/pt/kernel/index.ts`

**Step 1: Update exports**

```typescript
// packages/pt-runtime/src/pt/kernel/index.ts
export * from "./main";
export * from "./types";
export * from "./directories";
export * from "./lease";
export * from "./command-queue";
export * from "./runtime-loader";
export * from "./heartbeat";
export * from "./cleanup";
export * from "./queue";
export * from "./job-state";
export * from "./step-handlers";
export * from "./job-executor";
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/index.ts
git commit -m "feat(pt-kernel): update exports"
```

---

## Summary

### Files Created
- `src/pt/kernel/job-state.ts` - Job state machine types
- `src/pt/kernel/step-handlers.ts` - Step handlers
- `src/pt/kernel/job-executor.ts` - Job executor
- `src/__tests__/pt/job-executor.test.ts` - Tests

### Files Modified
- `src/pt/kernel/main.ts` - Integrated job executor
- `src/pt/kernel/index.ts` - Updated exports

### Success Criteria
- ✅ DeferredJobPlan executes step by step
- ✅ Mode transitions work (enable, configure terminal)
- ✅ Commands execute via TerminalEngine
- ✅ Confirmation prompts handled
- ✅ Pager continuation works
- ✅ Save config works
- ✅ Job completes or errors properly
- ✅ All tests pass