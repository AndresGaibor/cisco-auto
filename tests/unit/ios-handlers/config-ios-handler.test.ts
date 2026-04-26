// ============================================================================
// Config IOS Handler Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import { handleConfigIos } from "../../../packages/pt-runtime/src/handlers/ios/config-ios-handler.ts";

describe("handleConfigIos", () => {
  it("should return error when device not found", async () => {
    const api = { getDeviceByName: (_name: string) => null } as any;
    const result = await handleConfigIos(
      {
        type: "configIos",
        device: "R1",
        commands: ["interface GigabitEthernet0/0", "ip address 192.168.1.1 255.255.255.0"],
      },
      api,
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("DEVICE_NOT_FOUND");
  });

  it("should return error when terminal is not accessible", async () => {
    const mockDevice = {};
    const api = {
      getDeviceByName: (_name: string) => mockDevice,
    } as any;

    (mockDevice as any).getCommandLine = () => null;

    const result = await handleConfigIos(
      {
        type: "configIos",
        device: "R1",
        commands: ["interface GigabitEthernet0/0"],
      },
      api,
    );

    expect(result.ok).toBe(false);
    expect(result.code).toBe("NO_TERMINAL");
  });

  it("should correctly infer mode transitions from config commands", () => {
    // These are tested in ios-session-utils but sanity check here
    const { inferExpectedModeAfterCommand } = require("../../../packages/pt-runtime/src/handlers/ios/ios-session-utils.ts");

    expect(inferExpectedModeAfterCommand("interface GigabitEthernet0/0")).toBe("config-if");
    expect(inferExpectedModeAfterCommand("line console 0")).toBe("config-line");
    expect(inferExpectedModeAfterCommand("router ospf 1")).toBe("config-router");
  });
});
