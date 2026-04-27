import { describe, expect, test, vi } from "bun:test";
import { registerStableRuntimeHandlers } from "../../handlers/registration/stable-handlers.js";
import { runtimeDispatcher } from "../../handlers/dispatcher.js";

describe("terminal.plan.run + __pollDeferred", () => {
  test("el ticket devuelto por terminal.plan.run se puede consultar con __pollDeferred", () => {
    registerStableRuntimeHandlers();

    const jobs = new Map<string, any>();

    const api = {
      dprint: vi.fn(),
      now: () => 1700000000000,
      createJob: vi.fn((plan: any) => {
        jobs.set(plan.id, {
          id: plan.id,
          finished: false,
          state: "waiting-command",
          currentStep: 0,
          plan,
          outputBuffer: "",
          error: null,
          errorCode: null,
          result: null,
        });

        return plan.id;
      }),
      getJobState: vi.fn((ticket: string) => jobs.get(ticket) ?? null),
    } as any;

    const submit = runtimeDispatcher(
      {
        type: "terminal.plan.run",
        plan: {
          id: "plan-1",
          device: "R1",
          steps: [{ kind: "command", command: "show version" }],
          timeouts: {
            commandTimeoutMs: 30000,
            stallTimeoutMs: 15000,
          },
        },
      },
      api,
    );

    expect(submit).toMatchObject({
      ok: true,
      deferred: true,
      ticket: "plan-1",
    });
    expect(api.createJob).toHaveBeenCalledTimes(1);

    const poll = runtimeDispatcher(
      {
        type: "__pollDeferred",
        ticket: "plan-1",
      },
      api,
    );

    expect(api.getJobState).toHaveBeenCalledWith("plan-1");
    expect(poll).toMatchObject({
      done: false,
      state: "waiting-command",
      currentStep: 0,
      totalSteps: 1,
    });
  });
});
