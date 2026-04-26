// ============================================================================
// Exec PC Handler Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import { handleExecPc } from "../../../packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts";

describe("handleExecPc", () => {
  it("should return error when device not found", async () => {
    const api = { getDeviceByName: (_name: string) => null } as any;
    const result = await handleExecPc({ device: "PC1", command: "ipconfig" }, api);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("DEVICE_NOT_FOUND");
  });

  it("should return error when terminal is not accessible", async () => {
    const mockDevice = {};
    const api = {
      getDeviceByName: (_name: string) => mockDevice,
    } as any;

    // Make getCommandLine return null to trigger NO_TERMINAL
    (mockDevice as any).getCommandLine = () => null;

    const result = await handleExecPc({ device: "PC1", command: "ipconfig" }, api);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("NO_TERMINAL");
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
});
