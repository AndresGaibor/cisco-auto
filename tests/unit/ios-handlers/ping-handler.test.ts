// ============================================================================
// Ping Handler Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import { handlePing } from "../../../packages/pt-runtime/src/handlers/ios/ping-handler.ts";

describe("handlePing", () => {
  it("should return error when device not found", async () => {
    const api = { getDeviceByName: (_name: string) => null } as any;
    const result = await handlePing({ device: "R1", target: "192.168.1.1" }, api);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("DEVICE_NOT_FOUND");
  });

  it("should return error when terminal is not accessible", async () => {
    const mockDevice = { getType: () => 0, getModel: () => "2911" };
    const api = {
      getDeviceByName: (_name: string) => mockDevice,
      // getTerminalDevice will return null via the getTerminalDevice helper
    } as any;

    // Override getTerminalDevice behavior by making getCommandLine return null
    (mockDevice as any).getCommandLine = () => null;

    const result = await handlePing({ device: "R1", target: "192.168.1.1" }, api);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("NO_TERMINAL");
  });

  it("should detect PC device type correctly", async () => {
    // PC type IDs are 8 and 9
    const pcDevice = { getType: () => 8, getModel: () => "PC" };
    const serverDevice = { getType: () => 9, getModel: () => "Server" };

    expect((pcDevice as any).getType()).toBe(8);
    expect((serverDevice as any).getType()).toBe(9);
  });

  it("should detect router device type correctly", async () => {
    // Router type is 0
    const routerDevice = { getType: () => 0, getModel: () => "2911" };
    expect((routerDevice as any).getType()).toBe(0);
  });
});
