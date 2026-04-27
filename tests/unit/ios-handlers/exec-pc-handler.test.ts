// ============================================================================
// Exec PC Handler Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import { handleExecPc } from "../../../packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts";

describe("handleExecPc", () => {
  it("should return error when device not found", async () => {
    const api = { getDeviceByName: (_name: string) => null } as any;
    const result = await handleExecPc({ type: "execPc", device: "PC1", command: "ipconfig" } as any, api);

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("DEVICE_NOT_FOUND");
  });

  it("should return error when terminal is not accessible", async () => {
    const mockDevice = {};
    const api = {
      getDeviceByName: (_name: string) => mockDevice,
    } as any;

    // Make getCommandLine return null to trigger NO_TERMINAL
    (mockDevice as any).getCommandLine = () => null;

    const result = await handleExecPc({ type: "execPc", device: "PC1", command: "ipconfig" } as any, api);

    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("NO_TERMINAL");
  });

  it("should detect long-running commands (ping, tracert, trace)", async () => {
    const isLongRunningCommand = (cmd: string) =>
      cmd.trim().toLowerCase().startsWith("ping") ||
      cmd.trim().toLowerCase().startsWith("tracert") ||
      cmd.trim().toLowerCase().startsWith("trace");

    expect(isLongRunningCommand("ping 192.168.1.1")).toBe(true);
    expect(isLongRunningCommand("tracert 10.0.0.1")).toBe(true);
    expect(isLongRunningCommand("trace 8.8.8.8")).toBe(true);
    expect(isLongRunningCommand("ipconfig")).toBe(false);
    expect(isLongRunningCommand("arp -a")).toBe(false);
  });

  it("should stay as a direct host executor for now", async () => {
    const listeners = new Map<string, (...args: any[]) => void>();
    const cli = {
      getPrompt: () => "C:\\>",
      enterCommand: (command: string) => {
        queueMicrotask(() => {
          listeners.get("outputWritten")?.(null, { newOutput: `Cisco Packet Tracer PC Command Line 1.0\n\nC:\\>\n${command}` });
          listeners.get("commandEnded")?.(null, { status: 0 });
        });
      },
      getOutput: () => "Cisco Packet Tracer PC Command Line 1.0\n\nC:\\>",
      registerEvent: (event: string, _ctx: null, handler: (...args: any[]) => void) => {
        listeners.set(event, handler);
      },
      unregisterEvent: () => {},
    } as any;

    const api = {
      getDeviceByName: () => ({
        getCommandLine: () => cli,
        getModel: () => "PC-PT",
      }),
      dprint: () => {},
    } as any;

    const result = await handleExecPc({ type: "execPc", device: "PC1", command: "ipconfig" } as any, api);

    expect(result.ok).toBe(true);
    expect((result as any).deferred).toBeUndefined();
  });
});
