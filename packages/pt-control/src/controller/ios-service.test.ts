import { describe, expect, test } from "bun:test";
import { ControllerIosService } from "./ios-service.js";

function createIosService() {
  return {
    configIos: async () => undefined,
    execIos: async () => ({ raw: "ok" }),
    show: async () => ({ raw: "ok" }),
    showIpInterfaceBrief: async () => ({ raw: "ok", interfaces: [] }),
    showVlan: async () => ({ raw: "ok", vlans: [] }),
    showIpRoute: async () => ({ raw: "ok", routes: [] }),
    showRunningConfig: async () => ({ raw: "ok" }),
    showCdpNeighbors: async () => ({ raw: "ok", neighbors: [] }),
    execInteractive: async () => ({ raw: "ok" }),
    showParsed: async () => ({ ok: true, raw: "ok" }),
    getConfidence: async () => "verified",
    configureDhcpPool: async () => undefined,
    configureOspfNetwork: async () => undefined,
    configureSshAccess: async () => undefined,
    configureAccessListStandard: async () => undefined,
    resolveCapabilities: async () => ({ model: "2911" }),
  } as any;
}

function createDeviceService() {
  return {
    configureDhcpServer: async () => undefined,
    inspectDhcpServer: async () => ({ ok: true, device: "R1", pools: [], poolCount: 0, excludedAddressCount: 0 }),
    inspect: async () => ({ name: "R1", model: "2911", type: "router", power: true, ports: [] }),
    hardwareInfo: async () => ({ ok: true }),
    hardwareCatalog: async () => ({ ok: true }),
    commandLog: async () => [],
  } as any;
}

describe("ControllerIosService", () => {
  test("delega a ios y device service", async () => {
    const service = new ControllerIosService(createIosService(), createDeviceService());

    await expect(service.configIos("R1", ["hostname R1"])).resolves.toBeUndefined();
    await expect(service.inspect("R1")).resolves.toMatchObject({ name: "R1" });
    await expect(service.commandLog("R1")).resolves.toEqual([]);
  });
});
