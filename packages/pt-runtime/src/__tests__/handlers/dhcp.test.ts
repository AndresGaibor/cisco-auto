import { expect, test, describe } from "bun:test";
import { handleConfigDhcpServer, handleInspectDhcpServer } from "../../handlers/dhcp";
import type { PtDeps } from "../../pt-api/pt-deps.js";

function createDeps(mainProcess: any): PtDeps {
  const device = {
    getName: () => "R1",
    getProcess: (name: string) => (name === "DhcpServerMainProcess" ? mainProcess : null),
  } as any;

  return {
    ipc: {} as never,
    getLW: () => ({} as never),
    getNet: () => ({ getDevice: () => device } as never),
    getFM: () => ({} as never),
    dprint: () => {},
    DEV_DIR: "/tmp",
    getDeviceByName: () => device,
    getCommandLine: () => null,
    listDeviceNames: () => ["R1"],
    now: () => 0,
  };
}

describe("DHCP handlers", () => {
  test("configDhcpServer habilita y configura pools", () => {
    const pool = {
      setNetworkAddress: () => {},
      setNetworkMask: () => {},
      setDefaultRouter: () => {},
      setDnsServerIp: () => {},
      setStartIp: () => {},
      setEndIp: () => {},
      setMaxUsers: () => {},
      getDhcpPoolName: () => "POOL1",
    };

    const server = {
      setEnable: (enabled: boolean) => { if (!enabled) throw new Error("disabled"); },
      addPool: () => true,
      getPoolByName: () => pool,
      getPoolCount: () => 1,
      getPoolAt: () => pool,
      getExcludedAddressCount: () => 0,
      getExcludedAddressAt: () => null,
      getDhcpServerProcessByPortName: () => null,
      isEnabled: () => true,
      addExcludedAddress: () => {},
    };

    const result = handleConfigDhcpServer({ type: "configDhcpServer", device: "R1", enabled: true, pools: [{ name: "POOL1" }] }, createDeps(server));
    expect(result.ok).toBe(true);
    expect((result as any).enabled).toBe(true);
  });

  test("inspectDhcpServer devuelve pools y excludedAddresses", () => {
    const pool = {
      getDhcpPoolName: () => "POOL1",
      getNetworkAddress: () => "10.0.0.0",
      getSubnetMask: () => "255.255.255.0",
      getDefaultRouter: () => "10.0.0.1",
      getDnsServerIp: () => "8.8.8.8",
      getStartIp: () => "10.0.0.10",
      getEndIp: () => "10.0.0.20",
      getMaxUsers: () => 10,
      getLeaseCount: () => 0,
      getLeaseAt: () => null,
    };

    const server = {
      setEnable: () => {},
      addPool: () => true,
      getPoolByName: () => pool,
      getPoolCount: () => 1,
      getPoolAt: () => pool,
      getExcludedAddressCount: () => 0,
      getExcludedAddressAt: () => null,
      getDhcpServerProcessByPortName: () => null,
      isEnabled: () => true,
      addExcludedAddress: () => {},
    };

    const result = handleInspectDhcpServer({ type: "inspectDhcpServer", device: "R1" }, createDeps(server));
    expect(result.ok).toBe(true);
    expect((result as any).pools[0].name).toBe("POOL1");
  });
});
