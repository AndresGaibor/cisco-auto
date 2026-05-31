import { describe, expect, test, vi } from "bun:test";
import { handleTerminalPlanRun } from "../../handlers/terminal-plan-run.js";

describe("handleTerminalPlanRun", () => {
  test("crea y registra un job diferido para un plan válido", () => {
    const createJob = vi.fn().mockReturnValue("plan-1");
    const api = {
      now: () => 1700000000000,
      createJob,
    } as any;

    const result = handleTerminalPlanRun(
      {
        type: "terminal.plan.run",
        plan: {
          id: "plan-1",
          device: "R1",
          targetMode: "privileged-exec",
          steps: [
            { kind: "command", command: "show version" },
          ],
          timeouts: {
            commandTimeoutMs: 30000,
            stallTimeoutMs: 15000,
          },
          policies: {
            autoBreakWizard: true,
            autoAdvancePager: true,
            maxPagerAdvances: 80,
            maxConfirmations: 0,
            abortOnPromptMismatch: false,
            abortOnModeMismatch: true,
          },
          metadata: { source: "test" },
        },
      },
      api,
    );

    expect(result).toMatchObject({
      ok: true,
      deferred: true,
      ticket: "plan-1",
    });
    expect(createJob).toHaveBeenCalledTimes(1);
    expect(createJob.mock.calls[0]?.[0]).toMatchObject({
      id: "plan-1",
      device: "R1",
      kind: "ios-session",
    });
    expect((result as any).job.device).toBe("R1");
    expect((result as any).job.plan).toHaveLength(1);
  });

  test("preserva sessionKind host en planes de host", () => {
    const createJob = vi.fn().mockReturnValue("plan-host");
    const api = {
      now: () => 1700000000000,
      createJob,
    } as any;

    const result = handleTerminalPlanRun(
      {
        type: "terminal.plan.run",
        plan: {
          id: "plan-host",
          device: "PC1",
          targetMode: "host-prompt",
          steps: [
            { kind: "command", command: "ipconfig" },
          ],
          metadata: { deviceKind: "host" },
        },
      },
      api,
    );

    expect(result).toMatchObject({
      ok: true,
      deferred: true,
      ticket: "plan-host",
    });
    expect((createJob.mock.calls[0]?.[0] as any).plan[0]).toMatchObject({
      metadata: { sessionKind: "host" },
    });
  });

  test("rechaza terminal.plan.run si createJob no está disponible", () => {
    const api = {
      now: () => 1700000000000,
    } as any;

    const result = handleTerminalPlanRun(
      {
        type: "terminal.plan.run",
        plan: {
          id: "plan-1",
          device: "R1",
          steps: [{ kind: "command", command: "show version" }],
        },
      },
      api,
    );

    expect(result).toMatchObject({
      ok: false,
      code: "RUNTIME_API_MISSING_CREATE_JOB",
    });
  });

  test("rechaza un plan sin device", () => {
    const api = {
      now: () => 1700000000000,
      createJob: vi.fn(),
    } as any;

    const result = handleTerminalPlanRun(
      {
        type: "terminal.plan.run",
        plan: {
          id: "plan-1",
          device: "",
          steps: [{ kind: "command", command: "show version" }],
        },
      },
      api,
    );

    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_TERMINAL_PLAN",
    });
  });

  test("acepta un plan vacío como job válido", () => {
    const createJob = vi.fn().mockReturnValue("plan-empty");
    const api = {
      now: () => 1700000000000,
      createJob,
    } as any;

    const result = handleTerminalPlanRun(
      {
        type: "terminal.plan.run",
        plan: {
          id: "plan-empty",
          device: "R1",
          steps: [],
        },
      },
      api,
    );

    expect(result).toMatchObject({
      ok: true,
      deferred: true,
      ticket: "plan-empty",
    });
    expect(createJob).toHaveBeenCalledTimes(1);
  });

  test("terminal.plan.run devuelve inlineCompleted cuando el job completa inmediatamente", () => {
    const createJob = vi.fn().mockReturnValue("job-1");
    const advanceJob = vi.fn();
    const api = {
      now: () => 1700000000000,
      createJob,
      advanceJob,
      getJobState: vi.fn().mockReturnValue({
        id: "job-1",
        state: "completed",
        status: "completed",
        output: "SW1>show clock\nSW1>",
        raw: "SW1>show clock\nSW1>",
        finished: true,
        result: {
          ok: true,
          output: "SW1>show clock\nSW1>",
          status: 0,
        },
      }),
    } as any;

    const result = handleTerminalPlanRun(
      {
        type: "terminal.plan.run",
        waitForCompletion: true,
        inlineTimeoutMs: 1200,
        plan: {
          id: "inline",
          device: "SW1",
          steps: [{ kind: "command", command: "show clock" }],
        },
      },
      api,
    );

    expect(result.ok).toBe(true);
    expect((result as any).status).toBe("completed");
    expect((result as any).inlineCompleted).toBe(true);
    expect((result as any).output).toContain("show clock");
    expect(advanceJob).toHaveBeenCalledWith("job-1");
  });

  test("terminal.plan.run conserva flujo deferred cuando no completa inline", () => {
    const createJob = vi.fn().mockReturnValue("job-pending");
    const advanceJob = vi.fn();
    const api = {
      now: () => 1700000000000,
      createJob,
      advanceJob,
      getJobState: vi.fn().mockReturnValue({
        id: "job-pending",
        state: "waiting-command",
        status: "pending",
        finished: false,
        result: null,
      }),
    } as any;

    const result = handleTerminalPlanRun(
      {
        type: "terminal.plan.run",
        waitForCompletion: true,
        inlineTimeoutMs: 1200,
        plan: {
          id: "pending",
          device: "SW1",
          steps: [{ kind: "command", command: "show running-config" }],
        },
      },
      api,
    );

    expect(result.ok).toBe(true);
    expect((result as any).deferred).toBe(true);
    expect((result as any).ticket).toBe("job-pending");
    expect((result as any).inlineCompleted).not.toBe(true);
  });

  test("terminal.plan.run sin waitForCompletion no hace inline check", () => {
    const createJob = vi.fn().mockReturnValue("job-no-inline");
    const advanceJob = vi.fn();
    const getJobState = vi.fn();
    const api = {
      now: () => 1700000000000,
      createJob,
      advanceJob,
      getJobState,
    } as any;

    const result = handleTerminalPlanRun(
      {
        type: "terminal.plan.run",
        waitForCompletion: false,
        plan: {
          id: "no-inline",
          device: "SW1",
          steps: [{ kind: "command", command: "show clock" }],
        },
      },
      api,
    );

    expect(result).toMatchObject({
      ok: true,
      deferred: true,
      ticket: "job-no-inline",
    });
    expect(advanceJob).not.toHaveBeenCalled();
    expect(getJobState).not.toHaveBeenCalled();
  });

  test("terminal.plan.run hace bounded inline drain hasta completar", () => {
    const createJob = vi.fn().mockReturnValue("job-drain");
    const advanceJob = vi.fn();
    let callCount = 0;

    const api = {
      now: () => 1700000000000 + callCount,
      createJob,
      advanceJob,
      getJobState: vi.fn(() => {
        callCount += 1;
        if (callCount < 3) {
          return {
            id: "job-drain",
            state: "waiting-command",
            status: "pending",
            finished: false,
            result: null,
          };
        }
        return {
          id: "job-drain",
          state: "completed",
          status: "completed",
          finished: true,
          outputBuffer: "SW1>show clock\nSW1>",
          result: {
            ok: true,
            raw: "SW1>show clock\nSW1>",
            status: 0,
          },
          lastMode: "user-exec",
          lastPrompt: "SW1>",
        };
      }),
    } as any;

    const result = handleTerminalPlanRun(
      {
        type: "terminal.plan.run",
        waitForCompletion: true,
        inlineTimeoutMs: 1200,
        plan: {
          id: "drain",
          device: "SW1",
          steps: [{ kind: "command", command: "show clock" }],
        },
      },
      api,
    );

    expect(result.ok).toBe(true);
    expect((result as any).inlineCompleted).toBe(true);
    expect((result as any).status).toBe("completed");
    expect((result as any).output).toContain("show clock");
    expect(advanceJob).toHaveBeenCalledTimes(3);
  });

  test("terminal.plan.run conserva deferred si bounded inline drain no completa", () => {
    const createJob = vi.fn().mockReturnValue("job-still-pending");
    const advanceJob = vi.fn();

    const api = {
      now: () => 1700000000000,
      createJob,
      advanceJob,
      getJobState: vi.fn().mockReturnValue({
        id: "job-still-pending",
        state: "waiting-command",
        status: "pending",
        finished: false,
        result: null,
      }),
    } as any;

    const result = handleTerminalPlanRun(
      {
        type: "terminal.plan.run",
        waitForCompletion: true,
        inlineTimeoutMs: 1200,
        plan: {
          id: "pending",
          device: "SW1",
          steps: [{ kind: "command", command: "show running-config" }],
        },
      },
      api,
    );

    expect(result).toMatchObject({
      ok: true,
      deferred: true,
      ticket: "job-still-pending",
    });
    expect(advanceJob.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(advanceJob.mock.calls.length).toBeLessThanOrEqual(10);
  });

  test("terminal.plan.run devuelve fallo inline si el job termina en error", () => {
    const api = {
      now: () => 1700000000000,
      createJob: vi.fn().mockReturnValue("job-error"),
      advanceJob: vi.fn(),
      getJobState: vi.fn().mockReturnValue({
        id: "job-error",
        state: "error",
        status: "error",
        finished: true,
        error: "Invalid command",
        errorCode: "IOS_INVALID_INPUT",
        outputBuffer: "% Invalid input",
        result: {
          ok: false,
          raw: "% Invalid input",
          status: 1,
          error: "Invalid command",
          code: "IOS_INVALID_INPUT",
        },
        lastMode: "privileged-exec",
        lastPrompt: "SW1#",
      }),
    } as any;

    const result = handleTerminalPlanRun(
      {
        type: "terminal.plan.run",
        waitForCompletion: true,
        inlineTimeoutMs: 1200,
        plan: {
          id: "error",
          device: "SW1",
          steps: [{ kind: "command", command: "bad command" }],
        },
      },
      api,
    );

    expect(result.ok).toBe(false);
    expect((result as any).inlineCompleted).toBe(true);
    expect((result as any).status).toBe("failed");
    expect((result as any).code).toBe("IOS_INVALID_INPUT");
  });
});
