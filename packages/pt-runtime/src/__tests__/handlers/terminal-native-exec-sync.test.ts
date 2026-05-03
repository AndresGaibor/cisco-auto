import { describe, expect, test } from "bun:test";
import { handleTerminalNativeExec } from "../../handlers/terminal-native-exec";

describe("handleTerminalNativeExec", () => {
  test("returns a deferred result synchronously instead of a Promise", () => {
    const jobs: unknown[] = [];

    const result = handleTerminalNativeExec(
      {
        type: "terminal.native.exec",
        device: "SW1",
        command: "show version",
        timeoutMs: 30000,
      },
      {
        now: () => 12345,
        createJob: (job: unknown) => {
          jobs.push(job);
          return "ticket-1";
        },
      } as any,
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        deferred: true,
        ticket: "ticket-1",
      }),
    );

    expect(typeof (result as any).then).toBe("undefined");
    expect(jobs).toHaveLength(1);
    expect((jobs[0] as any).kind).toBe("ios-session");
    expect((jobs[0] as any).device).toBe("SW1");
    expect((jobs[0] as any).plan[0].command).toBe("show version");
  });

  test("returns sync error when device or command is missing", () => {
    const result = handleTerminalNativeExec(
      {
        type: "terminal.native.exec",
        device: "SW1",
        command: "",
      },
      {
        now: () => 1,
        createJob: () => "ticket",
      } as any,
    );

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("INVALID_TERMINAL_NATIVE_EXEC");
    expect(typeof (result as any).then).toBe("undefined");
  });
});