import { describe, expect, test } from "vitest";
import { handleDeferredPoll } from "../../handlers/ios/deferred-poll-handler.js";

describe("handleDeferredPoll", () => {
  test("incluye diagnóstico mientras el job está pending", () => {
    const result = handleDeferredPoll(
      { ticket: "job-1" } as any,
      {
        getJobState: () => ({
          done: false,
          state: "waiting-command",
          updatedAt: 1000,
          currentStep: 0,
          waitingForCommandEnd: true,
          outputBuffer: "show version\nCisco IOS Software\nSW1#",
          lastPrompt: "SW1#",
          lastMode: "privileged-exec",
        }),
      } as any,
    ) as any;

    expect(result.done).toBe(false);
    expect(result.outputLen).toBeGreaterThan(0);
    expect(result.lastPrompt).toBe("SW1#");
    expect(result.waitingForCommandEnd).toBe(true);
  });

  test("devuelve ok false si el job terminó con error", () => {
    const result = handleDeferredPoll(
      { ticket: "job-1" } as any,
      {
        getJobState: () => ({
          done: true,
          state: "error",
          errorCode: "COMMAND_END_TIMEOUT",
          error: "Command did not return to prompt",
          outputBuffer: "show version\npartial",
        }),
      } as any,
    ) as any;

    expect(result.ok).toBe(false);
    expect(result.code).toBe("COMMAND_END_TIMEOUT");
    expect(result.raw).toContain("partial");
  });
});
