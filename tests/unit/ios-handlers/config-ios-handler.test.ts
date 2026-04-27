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
    expect((result as any).code).toBe("DEVICE_NOT_FOUND");
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
    expect((result as any).code).toBe("NO_TERMINAL");
  });

  it("should correctly infer mode transitions from config commands", () => {
    // These are tested in ios-session-utils but sanity check here
    const { inferExpectedModeAfterCommand } = require("../../../packages/pt-runtime/src/handlers/ios/ios-session-utils.ts");

    expect(inferExpectedModeAfterCommand("interface GigabitEthernet0/0")).toBe("config-if");
    expect(inferExpectedModeAfterCommand("line console 0")).toBe("config-line");
    expect(inferExpectedModeAfterCommand("router ospf 1")).toBe("config-router");
  });

  it("should delegate config execution through terminal.plan.run", async () => {
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

    const result = await handleConfigIos(
      {
        type: "configIos",
        device: "R1",
        commands: ["interface GigabitEthernet0/0", "ip address 192.168.1.1 255.255.255.0"],
        save: true,
        stopOnError: true,
        ensurePrivileged: true,
        dismissInitialDialog: false,
        commandTimeoutMs: 4321,
        stallTimeoutMs: 8765,
      },
      api,
    );

    expect(result).toMatchObject({
      ok: true,
      deferred: true,
      ticket: "configIos:R1",
    });
    expect((result as any).job).toMatchObject({
      id: "",
      device: "R1",
      kind: "ios-session",
      version: 1,
      payload: { commands: ["interface GigabitEthernet0/0", "ip address 192.168.1.1 255.255.255.0"], save: true },
      options: { stopOnError: true, commandTimeoutMs: 4321, stallTimeoutMs: 8765 },
    });
    expect((result as any).job.plan).toEqual([
      { type: "ensure-mode", value: "privileged-exec", options: { stopOnError: true } },
      { type: "ensure-mode", value: "config", options: { stopOnError: true } },
      { type: "command", value: "interface GigabitEthernet0/0", options: { stopOnError: true, timeoutMs: 4321 } },
      { type: "command", value: "ip address 192.168.1.1 255.255.255.0", options: { stopOnError: true, timeoutMs: 4321 } },
      { type: "save-config", options: { stopOnError: false } },
    ]);
  });
});
