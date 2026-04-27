import { describe, expect, test, vi } from "bun:test";
import { handleTerminalPlanRun } from "../../handlers/terminal-plan-run.js";

describe("handleTerminalPlanRun", () => {
  test("crea un job diferido para un plan válido", () => {
    const createJob = vi.fn().mockReturnValue("ticket-123");
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

    expect(createJob).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      deferred: true,
      ticket: "ticket-123",
    });
    expect((result as any).job.device).toBe("R1");
    expect((result as any).job.plan).toHaveLength(1);
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
    const createJob = vi.fn().mockReturnValue("ticket-empty");
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

    expect(createJob).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: true,
      deferred: true,
      ticket: "ticket-empty",
    });
  });
});
