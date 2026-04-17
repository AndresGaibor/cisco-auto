import { expect, test, describe } from "bun:test";
import { handleInspect, handleSnapshot } from "../../handlers/inspect";
import type { HandlerDeps } from "../../utils/helpers";

function createDeps(net: any): HandlerDeps {
  return {
    ipc: {} as never,
    getLW: () => ({} as never),
    getNet: () => net,
    getFM: () => ({} as never),
    dprint: () => {},
    DEV_DIR: "/tmp",
    getDeviceByName: () => null,
    getCommandLine: () => null,
    listDeviceNames: () => [],
    now: () => 0,
  } as HandlerDeps;
}

describe("Inspect handlers", () => {
  test("handleInspect returns error for non-existent device", () => {
    const net = { getDevice: () => null };
    const result = handleInspect({ type: "inspect", device: "NONEXISTENT" }, createDeps(net));
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("DEVICE_NOT_FOUND");
  });

  test("handleInspect returns device info with ports", () => {
    const port = {
      getName: () => "FastEthernet0/0",
      getIpAddress: () => "10.0.0.1",
      getSubnetMask: () => "255.255.255.0",
      getMacAddress: () => "00:11:22:33:44:55",
      getDefaultGateway: () => "10.0.0.254",
      isDhcpClientOn: () => false,
    };
    const device = {
      getName: () => "R1",
      getModel: () => "2911",
      getType: () => 0,
      getPower: () => true,
      getPortCount: () => 1,
      getPortAt: () => port,
      getDhcpFlag: () => false,
    };
    const net = { getDevice: () => device };

    const result = handleInspect({ type: "inspect", device: "R1" }, createDeps(net));
    expect(result.ok).toBe(true);
    expect((result as any).name).toBe("R1");
    expect((result as any).model).toBe("2911");
    expect((result as any).power).toBe(true);
    expect((result as any).ports[0].name).toBe("FastEthernet0/0");
    expect((result as any).dhcp).toBe(false);
  });

  test("handleSnapshot returns empty topology", () => {
    const net = {
      getDeviceCount: () => 0,
      getDeviceAt: () => null,
    };
    const result = handleSnapshot({ type: "snapshot" }, createDeps(net));
    expect(result.ok).toBe(true);
    expect((result as any).version).toBe("1.0");
    expect((result as any).metadata.deviceCount).toBe(0);
    expect((result as any).metadata.linkCount).toBe(0);
  });

  test("handleSnapshot returns devices with ports", () => {
    const port = {
      getName: () => "GigabitEthernet0/0",
      getIpAddress: () => "192.168.1.1",
      getSubnetMask: () => "255.255.255.0",
    };
    const device = {
      getName: () => "SW1",
      getModel: () => "2960-24TT",
      getType: () => 1,
      getPower: () => true,
      getPortCount: () => 1,
      getPortAt: () => port,
    };
    const net = {
      getDeviceCount: () => 1,
      getDeviceAt: () => device,
    };

    const result = handleSnapshot({ type: "snapshot" }, createDeps(net));
    expect(result.ok).toBe(true);
    expect((result as any).metadata.deviceCount).toBe(1);
    expect((result as any).devices.SW1.name).toBe("SW1");
    expect((result as any).devices.SW1.ports[0].name).toBe("GigabitEthernet0/0");
  });

  test("handleHardwareCatalog returns requiresIpc stub", () => {
    const net = { getDeviceCount: () => 0 };
    // handleHardwareCatalog is a separate function
    const { handleHardwareCatalog } = require("../../handlers/inspect");
    const result = handleHardwareCatalog({ type: "hardwareCatalog", limit: 50 }, createDeps(net));
    expect(result.ok).toBe(true);
    expect((result as any).requiresIpc).toBe(true);
    expect((result as any).handler).toBe("hardwareCatalog");
  });
});
