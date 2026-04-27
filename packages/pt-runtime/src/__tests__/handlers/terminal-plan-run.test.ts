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
});
