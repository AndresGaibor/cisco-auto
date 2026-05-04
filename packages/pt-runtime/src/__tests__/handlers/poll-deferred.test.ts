import { describe, expect, test, vi } from "bun:test";
import { handlePollDeferred } from "../../handlers/poll-deferred.js";

describe("__pollDeferred", () => {
  test("responde el estado del job diferido registrado", () => {
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

    const result = handlePollDeferred({ ticket: "ticket-1" }, api as any);

    expect(api.getJobState).toHaveBeenCalledWith("ticket-1");
    expect(result).toMatchObject({
      done: false,
      state: "running",
      currentStep: 1,
      totalSteps: 1,
    });
  });

  test("incluye evidencia de depuración y pasos", () => {
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

    const result = handlePollDeferred({ ticket: "ticket-1" }, api as any);

    expect(result).toMatchObject({
      done: false,
      debug: ["trace-1"],
      stepResults: expect.any(Array),
    });
  });

  test("preserva el resultado fallido completo al finalizar", () => {
    const raw = [
      "SW-SRV-DIST(config-if-range)#channel-group 7 mode active",
      "                                             ^",
      "% Invalid input detected at '^' marker.",
      "",
      "[cleanup]",
      "end",
      "SW-SRV-DIST#",
    ].join("\n");

    const api = {
      dprint: vi.fn(),
      getJobState: vi.fn().mockReturnValue({
        finished: true,
        state: "error",
        error: raw,
        errorCode: "IOS_INVALID_INPUT",
        outputBuffer: "end\nSW-SRV-DIST#",
        result: {
          ok: false,
          raw,
          rawOutput: raw,
          output: raw,
          status: 1,
          error: "SW-SRV-DIST(config-if-range)#channel-group 7 mode active\n                                             ^\n% Invalid input detected at '^' marker.",
          code: "IOS_INVALID_INPUT",
          session: {
            mode: "privileged-exec",
            prompt: "SW-SRV-DIST#",
            paging: false,
            awaitingConfirm: false,
          },
        },
        lastPrompt: "SW-SRV-DIST#",
        lastMode: "privileged-exec",
      }),
    } as any;

    const result = handlePollDeferred({ ticket: "ticket-2" }, api as any);

    expect(result).toMatchObject({
      done: true,
      ok: false,
      code: "IOS_INVALID_INPUT",
      errorCode: "IOS_INVALID_INPUT",
    });
    expect(String((result as any).raw || "")).toContain("% Invalid input detected");
    expect(String((result as any).output || "")).toContain("% Invalid input detected");
  });

  test("devuelve recommendedPollAfterMs segun estado pending", () => {
    const api = {
      dprint: vi.fn(),
      getJobState: vi.fn().mockReturnValue({
        finished: false,
        state: "waiting-command",
        currentStep: 1,
        plan: { plan: [{ type: "command" }] },
        outputBuffer: "",
        error: null,
        errorCode: null,
      }),
    } as any;

    const result = handlePollDeferred({ ticket: "ticket-1" }, api as any);

    expect(result).toMatchObject({
      done: false,
      state: "waiting-command",
      recommendedPollAfterMs: 250,
    });
  });

  test("devuelve 150ms para state=pending", () => {
    const api = {
      dprint: vi.fn(),
      getJobState: vi.fn().mockReturnValue({
        finished: false,
        state: "pending",
        currentStep: 0,
        plan: { plan: [{ type: "command" }] },
        outputBuffer: "",
        error: null,
        errorCode: null,
      }),
    } as any;

    const result = handlePollDeferred({ ticket: "ticket-1" }, api as any);

    expect(result).toMatchObject({
      done: false,
      state: "pending",
      recommendedPollAfterMs: 150,
    });
  });

  test("devuelve 100ms para waiting-delay", () => {
    const api = {
      dprint: vi.fn(),
      getJobState: vi.fn().mockReturnValue({
        finished: false,
        state: "waiting-delay",
        currentStep: 0,
        plan: { plan: [{ type: "delay", value: "1000" }] },
        outputBuffer: "",
        error: null,
        errorCode: null,
      }),
    } as any;

    const result = handlePollDeferred({ ticket: "ticket-1" }, api as any);

    expect(result).toMatchObject({
      done: false,
      state: "waiting-delay",
      recommendedPollAfterMs: 100,
    });
  });

  test("no devuelve recommendedPollAfterMs cuando job esta completed", () => {
    const api = {
      dprint: vi.fn(),
      getJobState: vi.fn().mockReturnValue({
        finished: true,
        state: "completed",
        currentStep: 2,
        plan: { plan: [{ type: "command" }, { type: "command" }] },
        outputBuffer: "output",
        error: null,
        errorCode: null,
        result: { ok: true, output: "output", status: 0 },
        lastPrompt: "Router#",
        lastMode: "privileged-exec",
      }),
    } as any;

    const result = handlePollDeferred({ ticket: "ticket-1" }, api as any);

    expect(result).toMatchObject({
      done: true,
      ok: true,
    });
    expect((result as any).recommendedPollAfterMs).toBeUndefined();
  });

  test("pending sin recommendedPollAfterMs conocido usa undefined", () => {
    const api = {
      dprint: vi.fn(),
      getJobState: vi.fn().mockReturnValue({
        finished: false,
        state: "unknown-state" as any,
        currentStep: 0,
        plan: { plan: [{ type: "command" }] },
        outputBuffer: "",
        error: null,
        errorCode: null,
      }),
    } as any;

    const result = handlePollDeferred({ ticket: "ticket-1" }, api as any);

    expect(result).toMatchObject({
      done: false,
      state: "unknown-state",
      recommendedPollAfterMs: undefined,
    });
  });
});
