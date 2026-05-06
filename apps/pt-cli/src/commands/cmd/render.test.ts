import { describe, expect, test, vi } from "bun:test";

import { printCmdResult, mergeCmdEvidenceTimings, toCmdCliResult, type CmdCliResult } from "./render.js";

describe("toCmdCliResult", () => {
  test("copia timings desde evidence", () => {
    const result = toCmdCliResult({
      ok: true,
      action: "ios.exec",
      device: "R1",
      deviceKind: "ios",
      command: "show version",
      output: "output",
      rawOutput: "raw output",
      status: 0,
      warnings: [],
      evidence: {
        timings: {
          sentAt: 1,
          resultSeenAt: 2,
          receivedAt: 3,
          waitMs: 2,
          queueLatencyMs: 4,
          execLatencyMs: 5,
        },
      },
    } as never);

    expect(result.timings).toEqual({
      sentAt: 1,
      resultSeenAt: 2,
      receivedAt: 3,
      waitMs: 2,
      queueLatencyMs: 4,
      execLatencyMs: 5,
    });
    expect(result.rawOutput).toBe("raw output");
  });

  test("deja output limpio para errores IOS y rawOutput completo", () => {
    const result = toCmdCliResult({
      ok: false,
      action: "ios.exec",
      device: "SW-SRV-DIST",
      deviceKind: "ios",
      command: "interface range f0/21 - 22\nchannel-group 7 mode active",
      output: [
        "channel-group 7 mode active",
        "                                           ^",
        "% Invalid input detected at '^' marker.",
        "",
        "[cleanup]",
        "end",
      ].join("\n"),
      rawOutput: [
        "channel-group 7 mode active",
        "                                           ^",
        "% Invalid input detected at '^' marker.",
        "",
        "[cleanup]",
        "end",
        "SW-SRV-DIST#",
        "%SYS-5-CONFIG_I: Configured from console by console",
      ].join("\n"),
      status: 1,
      warnings: [],
      error: {
        code: "IOS_INVALID_INPUT",
        message: "channel-group 7 mode active\n                                           ^\n% Invalid input detected at '^' marker.",
      },
    } as never);

    expect(result.ok).toBe(false);
    expect(result.output).toContain("channel-group 7 mode active");
    expect(result.output).toContain("% Invalid input detected");
    expect(result.rawOutput).toContain("[cleanup]");
    expect(result.rawOutput).toContain("%SYS-5-CONFIG_I");
  });
});

describe("printCmdResult", () => {
  test("imprime resumen de timings en modo texto", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true as never);

    printCmdResult(
      {
        schemaVersion: "1.0",
        ok: true,
        action: "cmd.exec",
        device: "R1",
        deviceKind: "ios",
        command: "show version",
        output: "output",
        status: 0,
        warnings: [],
        nextSteps: [],
        timings: {
          sentAt: 10,
          resultSeenAt: 20,
          receivedAt: 25,
          waitMs: 15,
          queueLatencyMs: 4,
          execLatencyMs: 11,
        },
      },
      { json: false, raw: false, quiet: false },
    );

    const output = stdoutSpy.mock.calls.flat().join(" ");
    expect(output).toContain("Timings:");
    expect(output).toContain("total 15ms");
    expect(output).toContain("queue 4ms");
    expect(output).toContain("exec 11ms");

    stdoutSpy.mockRestore();
  });

  test("omite resumen de timings cuando no hay duración plana", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true as never);

    printCmdResult(
      {
        schemaVersion: "1.0",
        ok: true,
        action: "cmd.exec",
        device: "PC1",
        deviceKind: "host",
        command: "ping 192.168.65.1",
        output: "Reply from 192.168.65.1",
        status: 0,
        warnings: [],
        nextSteps: [],
        timings: {
          adapter: {
            terminalPlanRunMs: 5600,
          },
        } as never,
      },
      { json: false, raw: false, quiet: false },
    );

    const output = stdoutSpy.mock.calls.flat().join(" ");
    expect(output).not.toContain("Timings:");
    expect(output).not.toContain("NaN");

    stdoutSpy.mockRestore();
  });

  test("incluye timings en salida json", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true as never);

    printCmdResult(
      {
        schemaVersion: "1.0",
        ok: true,
        action: "cmd.exec",
        device: "R1",
        deviceKind: "ios",
        command: "show version",
        output: "output",
        status: 0,
        warnings: [],
        nextSteps: [],
        timings: {
          sentAt: 10,
          resultSeenAt: 20,
          receivedAt: 25,
          waitMs: 15,
        },
      },
      { json: true, raw: false, quiet: false },
    );

    const output = stdoutSpy.mock.calls.flat().join(" ");
    expect(output).toContain('"timings"');
    expect(output).toContain('"waitMs": 15');

    stdoutSpy.mockRestore();
  });

  test("prioriza rawOutput cuando se solicita salida cruda", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true as never);

    printCmdResult(
      {
        schemaVersion: "1.0",
        ok: true,
        action: "cmd.exec",
        device: "R1",
        deviceKind: "ios",
        command: "show version",
        output: "salida limpia",
        rawOutput: "salida cruda",
        status: 0,
        warnings: [],
        nextSteps: [],
      },
      { json: false, raw: true, quiet: false },
    );

    const output = stdoutSpy.mock.calls.flat().join(" ");
    expect(output).toContain("salida cruda");

    stdoutSpy.mockRestore();
  });
});

describe("mergeCmdEvidenceTimings", () => {
  test("preserva evidence de fallo deferred y agrega timings cli", () => {
    const result = {
      schemaVersion: "1.0",
      ok: false,
      action: "cmd.exec",
      device: "SW-SRV-DIST",
      deviceKind: "ios",
      command: "show version",
      output: "",
      rawOutput: "",
      status: 1,
      warnings: ["Job timed out while waiting for terminal command completion"],
      error: {
        code: "TERMINAL_DEFERRED_STALLED",
        message: "terminal.plan.run creó el ticket cmd-test, pero el job siguió pendiente.",
      },
      nextSteps: ["pt doctor"],
      evidence: {
        phase: "terminal-plan-poll",
        ticket: "cmd-test",
        pollValue: {
          state: "waiting-command",
          outputTail: "",
          waitingForCommandEnd: true,
        },
        timings: {
          adapter: {
            terminalPlanPollCount: 120,
            terminalPlanPollQueueLatencyMs: 1000,
          },
        },
      },
    } satisfies CmdCliResult;

    mergeCmdEvidenceTimings(result, {
      cli: {
        executeMs: 30000,
        runCommandTotalMs: 30100,
      },
    });

    expect(result.evidence).toMatchObject({
      phase: "terminal-plan-poll",
      ticket: "cmd-test",
      pollValue: {
        state: "waiting-command",
        waitingForCommandEnd: true,
      },
      timings: {
        adapter: {
          terminalPlanPollCount: 120,
          terminalPlanPollQueueLatencyMs: 1000,
        },
        cli: {
          executeMs: 30000,
          runCommandTotalMs: 30100,
        },
      },
    });
  });

  test("preserva timings bridge existentes al agregar timings cli", () => {
    const result = {
      schemaVersion: "1.0",
      ok: false,
      action: "cmd.exec",
      device: "SW-SRV-DIST",
      deviceKind: "ios",
      command: "show version",
      output: "",
      rawOutput: "",
      status: 1,
      warnings: [],
      nextSteps: ["pt doctor"],
      timings: {
        sentAt: 1,
        resultSeenAt: 2,
        receivedAt: 3,
        waitMs: 50,
        queueLatencyMs: 10,
        execLatencyMs: 20,
      },
      evidence: {
        timings: {
          adapter: {
            terminalPlanPollCount: 1,
          },
        },
      },
    } satisfies CmdCliResult;

    mergeCmdEvidenceTimings(result, {
      cli: {
        executeMs: 100,
      },
    });

    expect(result.evidence).toMatchObject({
      timings: {
        bridge: {
          waitMs: 50,
          queueLatencyMs: 10,
          execLatencyMs: 20,
        },
        adapter: {
          terminalPlanPollCount: 1,
        },
        cli: {
          executeMs: 100,
        },
      },
    });
  });

  test("acepta wrapped.meta completo y agrega timings cli", () => {
    const result = {
      schemaVersion: "1.0",
      ok: true,
      action: "cmd.exec",
      device: "SW-SRV-DIST",
      deviceKind: "ios",
      command: "show version",
      output: "Cisco IOS Software",
      rawOutput: "show version\nCisco IOS Software",
      status: 0,
      warnings: [],
      nextSteps: [],
      evidence: {
        timings: {
          adapter: {
            terminalPlanPollCount: 2,
          },
        },
      },
    } satisfies CmdCliResult;

    mergeCmdEvidenceTimings(result, {
      timings: {
        cli: {
          executeMs: 1234,
          runCommandTotalMs: 1300,
        },
      },
    });

    expect(result.evidence).toMatchObject({
      timings: {
        adapter: {
          terminalPlanPollCount: 2,
        },
        cli: {
          executeMs: 1234,
          runCommandTotalMs: 1300,
        },
      },
    });
  });
});
