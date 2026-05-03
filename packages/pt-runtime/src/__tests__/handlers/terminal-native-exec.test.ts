import { describe, expect, test, vi } from "bun:test";

import { handleTerminalNativeExec } from "../../handlers/terminal-native-exec.js";

function makeApi(terminal: unknown, ticket = "ticket-1") {
  return {
    now: () => 1,
    createJob: vi.fn(() => ticket),
    ipc: {
      network: () => ({
        getDevice: () => ({
          getCommandLine: () => terminal,
        }),
      }),
    },
  } as any;
}

describe("terminal.native.exec", () => {
  test("crea un job diferido y conserva el receiver nativo", async () => {
    const terminal = {
      prompt: "SW1>",
      mode: "user",
      output: "SW1>",
      input: "",
      getPrompt: vi.fn(function (this: any) {
        return this.prompt;
      }),
      getMode: vi.fn(function (this: any) {
        return this.mode;
      }),
      getOutput: vi.fn(function (this: any) {
        return this.output;
      }),
      getAllOutput: vi.fn(function (this: any) {
        return this.output;
      }),
      getBuffer: vi.fn(function (this: any) {
        return this.output;
      }),
      getCommandInput: vi.fn(function (this: any) {
        return this.input;
      }),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
    };

    const api = makeApi(terminal, "ticket-1");

    const result = await handleTerminalNativeExec(
      {
        device: "SW1",
        command: "show running-config",
        timeoutMs: 2500,
        sampleDelayMs: 10,
      },
      api,
    );

    expect(result.ok).toBe(true);
    expect((result as any).deferred).toBe(true);
    expect((result as any).ticket).toBe("ticket-1");
    expect(api.createJob).toHaveBeenCalledTimes(1);
    expect(terminal.enterCommand).not.toHaveBeenCalled();
    expect((result as any).job.plan[0].kind).toBe("ensure-mode");
    expect((result as any).job.plan[1].command).toBe("show running-config");
  });

  test("registra un enable explicito como job diferido", async () => {
    const terminal = {
      getPrompt: vi.fn(() => "SW1>"),
      getMode: vi.fn(() => "user"),
      getOutput: vi.fn(() => "SW1>"),
      getAllOutput: vi.fn(() => "SW1>"),
      getBuffer: vi.fn(() => "SW1>"),
      getCommandInput: vi.fn(() => ""),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
    };

    const api = makeApi(terminal, "ticket-2");

    const result = await handleTerminalNativeExec(
      {
        device: "SW1",
        command: "enable",
        timeoutMs: 2500,
      },
      api,
    );

    expect(result.ok).toBe(true);
    expect((result as any).deferred).toBe(true);
    expect((result as any).job.plan).toHaveLength(1);
    expect((result as any).job.plan[0].kind).toBe("command");
    expect((result as any).job.plan[0].command).toBe("enable");
  });

  test("rechaza payload sin device o command", () => {
    const api = makeApi(null, "ticket-3");

    const result = handleTerminalNativeExec(
      {
        device: "SW1",
        command: "",
      },
      api,
    );

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("INVALID_TERMINAL_NATIVE_EXEC");
  });
});
