import { describe, expect, test, vi } from "bun:test";

import { renderCommandResult } from "../render-command-result.js";

describe("renderCommandResult", () => {
  test("no imprime next steps cuando la salida es json", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => code as never) as never);

    renderCommandResult({
      result: {
        schemaVersion: "1.0",
        ok: true,
        action: "device.move",
        data: { name: "SW Core" },
      },
      flags: {
        json: true,
        output: "json",
        quiet: false,
      } as never,
      nextSteps: ["bun run pt device get SW Core"],
    });

    expect(logSpy.mock.calls.some((call) => String(call[0]).includes("Siguientes pasos"))).toBe(false);
    expect(exitSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
