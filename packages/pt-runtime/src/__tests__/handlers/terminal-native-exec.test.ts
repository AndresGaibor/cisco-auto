import { describe, expect, test, vi } from "bun:test";

import { handleTerminalNativeExec } from "../../handlers/terminal-native-exec.js";

describe("terminal.native.exec", () => {
  test("conserva el receiver nativo al leer prompt y modo", async () => {
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
      enterCommand: vi.fn(function (this: any, command: string) {
        if (command === "enable") {
          this.prompt = "SW1#";
          this.mode = "enable";
          this.output += "\nSW1#";
          return;
        }

        if (command === "show running-config") {
          this.output += "\nSW1#show running-config\nhostname SW1\nSW1#";
        }
      }),
      enterChar: vi.fn(),
    };

    const api = {
      ipc: {
        network: () => ({
          getDevice: () => ({
            getCommandLine: () => terminal,
          }),
        }),
      },
    } as any;

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
    expect(terminal.enterCommand).toHaveBeenCalledWith("enable");
    expect(terminal.enterCommand).toHaveBeenCalledWith("show running-config");
    expect(String((result as any).raw)).toContain("hostname SW1");
  });

  test("espera a que el prompt privilegiado aparezca antes de ejecutar", async () => {
    let prompt = "SW1>";
    let mode = "user";
    let output = "SW1>";

    const terminal = {
      getPrompt: vi.fn(() => prompt),
      getMode: vi.fn(() => mode),
      getOutput: vi.fn(() => output),
      getAllOutput: vi.fn(() => output),
      getBuffer: vi.fn(() => output),
      getCommandInput: vi.fn(() => ""),
      enterCommand: vi.fn((cmd) => {
        if (cmd === "enable") {
          setTimeout(() => {
            prompt = "SW1#";
            mode = "enable";
            output += "\nSW1#";
          }, 900);
          return;
        }

        if (cmd === "show running-config") {
          output += "\nSW1#show running-config\nhostname SW1\nSW1#";
        }
      }),
      enterChar: vi.fn(),
    };

    const api = {
      ipc: {
        network: () => ({
          getDevice: () => ({
            getCommandLine: () => terminal,
          }),
        }),
      },
    } as any;

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
    expect(terminal.enterCommand).toHaveBeenCalledWith("enable");
    expect(terminal.enterCommand).toHaveBeenCalledWith("show running-config");
    expect(String((result as any).raw)).toContain("hostname SW1");
  });

  test("ejecuta show running-config y devuelve salida estable", async () => {
    const terminal = {
      getPrompt: vi.fn(() => "SW1#"),
      getMode: vi.fn(() => "privileged-exec"),
      getOutput: vi.fn(() => "show running-config\nhostname SW1\nSW1#"),
      getAllOutput: vi.fn(() => "show running-config\nhostname SW1\nSW1#"),
      getBuffer: vi.fn(() => "show running-config\nhostname SW1\nSW1#"),
      getCommandInput: vi.fn(() => ""),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
    };

    const api = {
      ipc: {
        network: () => ({
          getDevice: () => ({
            getCommandLine: () => terminal,
          }),
        }),
      },
    } as any;

    const result = await handleTerminalNativeExec(
      {
        device: "SW1",
        command: "show running-config",
        timeoutMs: 2000,
      },
      api,
    );

    expect(result.ok).toBe(true);
    expect(result.raw).toContain("hostname SW1");
    expect(result.status).toBe(0);
  });

  test("despierta terminal en logout antes de ejecutar comando privilegiado", async () => {
    let prompt = "";
    let mode = "logout";
    let output = "";

    const terminal = {
      getPrompt: vi.fn(() => prompt),
      getMode: vi.fn(() => mode),
      getOutput: vi.fn(() => output),
      getAllOutput: vi.fn(() => output),
      getBuffer: vi.fn(() => output),
      getCommandInput: vi.fn(() => ""),
      enterCommand: vi.fn((cmd) => {
        if (cmd === "enable") {
          prompt = "SW1#";
          mode = "enable";
          output += "\nSW1#";
          return;
        }

        if (cmd === "show running-config") {
          output += "\nSW1#show running-config\nhostname SW1\nSW1#";
        }
      }),
      enterChar: vi.fn((charCode) => {
        if (charCode === 13) {
          prompt = "SW1>";
          mode = "user";
          output += "\nSW1>";
        }
      }),
    };

    const api = {
      ipc: {
        network: () => ({
          getDevice: () => ({
            getCommandLine: () => terminal,
          }),
        }),
      },
    } as any;

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
    expect(terminal.enterCommand).toHaveBeenCalledWith("enable");
    expect(terminal.enterCommand).toHaveBeenCalledWith("show running-config");
    expect(String((result as any).raw)).toContain("hostname SW1");
  });

  test("devuelve NATIVE_EXEC_IOS_ERROR cuando IOS rechaza el comando", async () => {
    const terminal = {
      getPrompt: vi.fn(() => "SW-SRV-DIST#"),
      getMode: vi.fn(() => "privileged-exec"),
      getOutput: vi.fn(() => "SW-SRV-DIST#"),
      getAllOutput: vi.fn(() => "SW-SRV-DIST#"),
      getBuffer: vi.fn(() => "SW-SRV-DIST#"),
      getCommandInput: vi.fn(() => ""),
      enterCommand: vi.fn((cmd) => {
        if (cmd === "show version2") {
          return;
        }

        throw new Error(`unexpected command ${cmd}`);
      }),
      enterChar: vi.fn(),
    };

    const api = {
      ipc: {
        network: () => ({
          getDevice: () => ({
            getCommandLine: () => terminal,
          }),
        }),
      },
    } as any;

    terminal.getOutput.mockImplementation(() =>
      "SW-SRV-DIST#show version2\n                         ^\n% Invalid input detected at '^' marker.",
    );
    terminal.getAllOutput.mockImplementation(() =>
      "SW-SRV-DIST#show version2\n                         ^\n% Invalid input detected at '^' marker.",
    );
    terminal.getBuffer.mockImplementation(() =>
      "SW-SRV-DIST#show version2\n                         ^\n% Invalid input detected at '^' marker.",
    );

    const result = await handleTerminalNativeExec(
      {
        device: "SW-SRV-DIST",
        command: "show version2",
        timeoutMs: 2500,
        sampleDelayMs: 10,
      },
      api,
    );

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("NATIVE_EXEC_IOS_ERROR");
    expect(String((result as any).raw)).toContain("% Invalid input detected");
    expect((result as any).status).toBe(1);
  });

  test("limpia el pager antes de enviar enable", async () => {
    let prompt = "SW-SRV-DIST>";
    let mode = "user";
    let output = "SW-SRV-DIST>show running-config\nline 1\n--More-- ";
    let pagerActive = true;

    const terminal = {
      getPrompt: vi.fn(() => prompt),
      getMode: vi.fn(() => mode),
      getOutput: vi.fn(() => output),
      getAllOutput: vi.fn(() => output),
      getBuffer: vi.fn(() => output),
      getCommandInput: vi.fn(() => ""),
      enterCommand: vi.fn((cmd) => {
        if (cmd === "enable") {
          if (pagerActive) {
            output += "\nSW-SRV-DIST>nable\nTranslating \"nable\"";
            prompt = "SW-SRV-DIST>";
            mode = "user";
            return;
          }

          output += "\nSW-SRV-DIST#";
          prompt = "SW-SRV-DIST#";
          mode = "enable";
          return;
        }

        if (cmd === "show running-config") {
          output += "\nSW-SRV-DIST#show running-config\nhostname SW-SRV-DIST\nSW-SRV-DIST#";
        }
      }),
      enterChar: vi.fn((charCode) => {
        if (charCode === 32) {
          pagerActive = false;
          output = output.replace(/--More--\s*$/, "");
        }
      }),
    };

    const api = {
      ipc: {
        network: () => ({
          getDevice: () => ({
            getCommandLine: () => terminal,
          }),
        }),
      },
    } as any;

    const result = await handleTerminalNativeExec(
      {
        device: "SW-SRV-DIST",
        command: "show running-config",
        timeoutMs: 2500,
        sampleDelayMs: 10,
        maxPagerAdvances: 10,
      },
      api,
    );

    expect(result.ok).toBe(true);
    expect(terminal.enterChar).toHaveBeenCalledWith(32, 0);
    expect(terminal.enterCommand).toHaveBeenCalledWith("enable");
    expect(terminal.enterCommand).toHaveBeenCalledWith("show running-config");
    expect(String((result as any).raw)).toContain("hostname SW-SRV-DIST");
  });

  test("falla rápido si IOS rechaza el comando", async () => {
    let prompt = "SW1>";
    let output = "SW1>show running-config\n          ^\n% Invalid input detected at '^' marker.\nSW1>";

    const terminal = {
      getPrompt: vi.fn(() => prompt),
      getMode: vi.fn(() => (prompt.endsWith("#") ? "privileged-exec" : "user-exec")),
      getOutput: vi.fn(() => output),
      getAllOutput: vi.fn(() => output),
      getBuffer: vi.fn(() => output),
      getCommandInput: vi.fn(() => ""),
      enterCommand: vi.fn((cmd) => {
        if (cmd === "enable") {
          prompt = "SW1#";
          return;
        }
        if (cmd === "show running-config") {
          // ya está en output
        }
      }),
      enterChar: vi.fn(),
    };

    const api = {
      ipc: {
        network: () => ({
          getDevice: () => ({
            getCommandLine: () => terminal,
          }),
        }),
      },
    } as any;

    const result = await handleTerminalNativeExec(
      {
        device: "SW1",
        command: "show running-config",
        timeoutMs: 500,
        sampleDelayMs: 10,
      },
      api,
    );

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("NATIVE_EXEC_IOS_ERROR");
    expect((result as any).status).toBe(1);
  });
});
