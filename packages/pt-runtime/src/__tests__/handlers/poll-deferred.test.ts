import { describe, expect, test, vi } from "bun:test";
import { registerStableRuntimeHandlers } from "../../handlers/registration/stable-handlers.js";
import { runtimeDispatcher } from "../../handlers/dispatcher.js";

describe("__pollDeferred", () => {
  test("responde el estado del job diferido registrado", () => {
    registerStableRuntimeHandlers();

    const api = {
      dprint: vi.fn(),
      getJobState: vi.fn().mockReturnValue({
        finished: false,
        state: "running",
        currentStep: 1,
        plan: { plan: [{ kind: "command" }] },
        outputBuffer: "",
        error: null,
        errorCode: null,
      }),
    } as any;

    const result = runtimeDispatcher({ type: "__pollDeferred", ticket: "ticket-1" }, api);

    expect(api.getJobState).toHaveBeenCalledWith("ticket-1");
    expect(result).toMatchObject({
      done: false,
      state: "running",
      currentStep: 1,
      totalSteps: 1,
    });
  });

  test("incluye evidencia de depuración y pasos", () => {
    registerStableRuntimeHandlers();

    const api = {
      dprint: vi.fn(),
      getJobState: vi.fn().mockReturnValue({
        finished: false,
        state: "waiting-command",
        currentStep: 0,
        plan: { plan: [{ type: "command", value: "show version" }] },
        outputBuffer: "show version\nRouter#",
        error: null,
        errorCode: null,
        updatedAt: Date.now(),
        startedAt: Date.now() - 1000,
        lastPrompt: "Router#",
        lastMode: "privileged-exec",
        waitingForCommandEnd: true,
        debug: ["trace-1"],
        stepResults: [{ stepIndex: 0, stepType: "command", command: "show version", raw: "show version", status: 0, completedAt: Date.now() }],
      }),
    } as any;

    const result = runtimeDispatcher({ type: "__pollDeferred", ticket: "ticket-1" }, api);

    expect(result).toMatchObject({
      done: false,
      debug: ["trace-1"],
      stepResults: expect.any(Array),
    });
  });
});
