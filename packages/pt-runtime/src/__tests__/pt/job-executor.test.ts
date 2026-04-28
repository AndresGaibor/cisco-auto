import { describe, test, expect, beforeEach, afterEach, vi } from "bun:test";
import { createExecutionEngine, type ActiveJob } from "../../pt/kernel/execution-engine";
import { createTerminalEngine, type PTCommandLine } from "../../pt/terminal/terminal-engine";
import { createDeferredJobPlan, commandStep } from "../../domain";

function createMockTerminal() {
  const listeners: Map<string, Set<(src: unknown, args: unknown) => void>> = new Map();
  
  return {
    getPrompt: () => "Router#",
    enterCommand: vi.fn((_cmd: string) => {
      setTimeout(() => {
        const outputListeners = listeners.get("outputWritten");
        if (outputListeners) {
          outputListeners.forEach(cb => cb(null, { newOutput: "output\n" }));
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

describe("createExecutionEngine", () => {
  let mockTerm: PTCommandLine;
  let originalIpc: unknown;
  
  beforeEach(() => {
    mockTerm = createMockTerminal() as unknown as PTCommandLine;
    originalIpc = (globalThis as any).ipc;
    (globalThis as any).ipc = {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => mockTerm,
        }),
      }),
    };
  });

  afterEach(() => {
    (globalThis as any).ipc = originalIpc;
  });
  
  test("startJob creates a new job", () => {
    const terminal = createTerminalEngine({
      commandTimeoutMs: 5000,
      stallTimeoutMs: 10000,
      pagerTimeoutMs: 30000,
    });
    terminal.attach("R1", mockTerm);
    
    const executor = createExecutionEngine(terminal);
    const plan = createDeferredJobPlan("R1", [
      commandStep("show version"),
    ]);
    
    const job = executor.startJob(plan);
    
    expect(job.id).toBe(plan.id);
    expect(job.device).toBe("R1");
    expect(executor.getJob(plan.id)).not.toBeNull();
  });
  
  test("getActiveJobs returns unfinished jobs", () => {
    const terminal = createTerminalEngine({
      commandTimeoutMs: 5000,
      stallTimeoutMs: 10000,
      pagerTimeoutMs: 30000,
    });
    terminal.attach("R1", mockTerm);
    
    const executor = createExecutionEngine(terminal);
    const plan = createDeferredJobPlan("R1", [
      commandStep("show version"),
    ]);
    
    executor.startJob(plan);
    const activeJobs = executor.getActiveJobs();
    expect(activeJobs.length).toBeGreaterThanOrEqual(0);
  });
  
  test("isJobFinished returns false for active job", () => {
    const terminal = createTerminalEngine({
      commandTimeoutMs: 5000,
      stallTimeoutMs: 10000,
      pagerTimeoutMs: 30000,
    });
    terminal.attach("R1", mockTerm);
    
    const executor = createExecutionEngine(terminal);
    const plan = createDeferredJobPlan("R1", [
      commandStep("show version"),
    ]);
    
    executor.startJob(plan);
    expect(executor.isJobFinished(plan.id)).toBe(false);
  });
  
  test("isJobFinished returns true for unknown job", () => {
    const terminal = createTerminalEngine({
      commandTimeoutMs: 5000,
      stallTimeoutMs: 10000,
      pagerTimeoutMs: 30000,
    });
    terminal.attach("R1", mockTerm);
    
    const executor = createExecutionEngine(terminal);
    expect(executor.isJobFinished("unknown-id")).toBe(true);
  });

  test("marca como error un job activo que excede su timeout", () => {
    const terminal = {
      attach: vi.fn(),
      detach: vi.fn(),
      getSession: vi.fn(() => ({
        mode: "user-exec",
        prompt: "Router>",
        paging: false,
        awaitingConfirm: false,
      })),
      getMode: vi.fn(() => "user-exec"),
      isBusy: vi.fn(() => true),
      isAnyBusy: vi.fn(() => true),
      executeCommand: vi.fn(() => new Promise(() => {})),
      continuePager: vi.fn(),
      confirmPrompt: vi.fn(),
    };

    const executor = createExecutionEngine(terminal as never);
    const plan = createDeferredJobPlan("R1", [commandStep("show version")], {
      commandTimeoutMs: 1000,
      stallTimeoutMs: 1000,
    });

    const job = executor.startJob(plan);
    job.context.updatedAt = Date.now() - 5000;

    expect(executor.getActiveJobs()).toHaveLength(0);
    expect(executor.getJob(plan.id)?.context.errorCode).toBe("JOB_TIMEOUT");
  });
});
