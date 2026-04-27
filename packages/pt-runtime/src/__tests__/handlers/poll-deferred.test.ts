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
});
