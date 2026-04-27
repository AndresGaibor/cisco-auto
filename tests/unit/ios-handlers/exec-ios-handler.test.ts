// ============================================================================
// Exec IOS Handler Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import { handleExecIos } from "../../../packages/pt-runtime/src/handlers/ios/exec-ios-handler.ts";

describe("handleExecIos", () => {
  it("should return error when device not found", async () => {
    const api = { getDeviceByName: (_name: string) => null } as any;
    const result = await handleExecIos(
      { type: "execIos", device: "R1", command: "show ip int brief" },
      api,
    );

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("DEVICE_NOT_FOUND");
  });

  it("should return error when terminal is not accessible", async () => {
    const mockDevice = {};
    const api = {
      getDeviceByName: (_name: string) => mockDevice,
    } as any;

    // Make getCommandLine return null
    (mockDevice as any).getCommandLine = () => null;

    const result = await handleExecIos(
      { type: "execIos", device: "R1", command: "show ip int brief" },
      api,
    );

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("NO_TERMINAL");
  });

  it("should detect host devices (PC/Server) correctly", async () => {
    const isHostDevice = (model: string) =>
      model.toLowerCase().includes("pc") || model.toLowerCase().includes("server");

    expect(isHostDevice("PC1")).toBe(true);
    expect(isHostDevice("Server-PT")).toBe(true);
    expect(isHostDevice("PC")).toBe(true);
    expect(isHostDevice("2911")).toBe(false);
    expect(isHostDevice("Switch-PT")).toBe(false);
  });

  it("should delegate command execution through terminal.plan.run", async () => {
    const terminal = {
      getPrompt: () => "Router#",
      getOutput: () => "Router#",
    };

    const api = {
      getDeviceByName: (_name: string) => ({
        getModel: () => "2911",
        getCommandLine: () => terminal,
      }),
      dprint: () => {},
    } as any;

    const result = await handleExecIos(
      {
        type: "execIos",
        device: "R1",
        command: "show ip int brief",
        commandTimeoutMs: 1234,
        stallTimeoutMs: 5678,
      },
      api,
    );

    expect(result).toMatchObject({
      ok: true,
      deferred: true,
      ticket: "execIos:R1",
    });
    expect((result as any).job).toMatchObject({
      id: "",
      device: "R1",
      kind: "ios-session",
      version: 1,
      payload: { command: "show ip int brief" },
      options: { stopOnError: false, commandTimeoutMs: 1234, stallTimeoutMs: 5678 },
    });
    expect((result as any).job.plan).toEqual([
      {
        type: "command",
        value: "show ip int brief",
        options: { stopOnError: false, timeoutMs: 1234 },
      },
    ]);
  });
});
