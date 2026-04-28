import { describe, expect, test, vi } from "bun:test";

import { printCmdResult, toCmdCliResult } from "./render.js";

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
