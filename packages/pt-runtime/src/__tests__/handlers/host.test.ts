import { expect, test, describe } from "bun:test";
import { handleInspectHost } from "../../handlers/host";
import type { PtDeps } from "../../pt-api/pt-deps.js";

const deps: PtDeps = {
  ipc: {} as never,
  getLW: () => ({}) as never,
  getNet: () =>
    ({
      getDevice: () => ({
        getName: () => "PC1",
        getModel: () => "pc",
        getType: () => 8,
        getPower: () => true,
        getPortCount: () => 1,
        getPortAt: () => ({
          getName: () => "FastEthernet0",
          getIpAddress: () => "10.0.0.10",
          getSubnetMask: () => "255.255.255.0",
          getDefaultGateway: () => "10.0.0.1",
          getDnsServerIp: () => "8.8.8.8",
          isPortUp: () => true,
          isProtocolUp: () => true,
        }),
        getPort: () => null,
        getDhcpFlag: () => false,
      }),
    }) as never,
  getFM: () => ({}) as never,
  dprint: () => {},
  DEV_DIR: "/tmp",
  getDeviceByName: () => null,
  getCommandLine: () => null,
  listDeviceNames: () => ["PC1"],
  now: () => 0,
};

describe("host handlers", () => {
  test("inspectHost devuelve un resumen de puertos", () => {
    const result = handleInspectHost({ type: "inspectHost", device: "PC1" }, deps);
    expect(result.ok).toBe(true);
    expect((result as any).device).toBe("PC1");
  });

  test("inspectHost no falla si el puerto no expone gateway", () => {
    const localDeps: PtDeps = {
      ...deps,
      getNet: () =>
        ({
          getDevice: () => ({
            getName: () => "PC1",
            getModel: () => "pc",
            getType: () => 8,
            getPower: () => true,
            getPortCount: () => 1,
            getPortAt: () => ({
              getName: () => "FastEthernet0",
              getIpAddress: () => "10.0.0.10",
              getSubnetMask: () => "255.255.255.0",
              getDnsServerIp: () => "8.8.8.8",
              isPortUp: () => true,
              isProtocolUp: () => true,
            }),
            getPort: () => null,
            getDhcpFlag: () => false,
          }),
        }) as never,
    };

    const result = handleInspectHost({ type: "inspectHost", device: "PC1" }, localDeps);

    expect(result.ok).toBe(true);
    expect((result as any).ports[0].gateway).toBeUndefined();
  });

  test("inspectHost no expone campos IPv6", () => {
    const localDeps: PtDeps = {
      ...deps,
      getNet: () =>
        ({
          getDevice: () => ({
            getName: () => "PC1",
            getModel: () => "pc",
            getType: () => 8,
            getPower: () => true,
            getPortCount: () => 1,
            getPortAt: () => ({
              getName: () => "FastEthernet0",
              getIpAddress: () => "10.0.0.10",
              getSubnetMask: () => "255.255.255.0",
              getDefaultGateway: () => "10.0.0.1",
              getDnsServerIp: () => "8.8.8.8",
              isPortUp: () => true,
              isProtocolUp: () => true,
            }),
            getPort: () => null,
            getDhcpFlag: () => false,
          }),
        }) as never,
    };

    const result = handleInspectHost({ type: "inspectHost", device: "PC1" }, localDeps);

    expect(result.ok).toBe(true);
    expect((result as any).ports[0].ipv6Address).toBeUndefined();
    expect((result as any).ports[0].ipv6Enabled).toBeUndefined();
  });

  test("inspectHost no falla si el puerto no expone getIpAddress", () => {
    const localDeps: PtDeps = {
      ...deps,
      getNet: () =>
        ({
          getDevice: () => ({
            getName: () => "PC1",
            getModel: () => "pc",
            getType: () => 8,
            getPower: () => true,
            getPortCount: () => 1,
            getPortAt: () => ({
              getName: () => "FastEthernet0",
              getSubnetMask: () => "255.255.255.0",
              getDefaultGateway: () => "10.0.0.1",
              getDnsServerIp: () => "8.8.8.8",
              isPortUp: () => true,
              isProtocolUp: () => true,
            }),
            getPort: () => null,
            getDhcpFlag: () => false,
          }),
        }) as never,
    };

    const result = handleInspectHost({ type: "inspectHost", device: "PC1" }, localDeps);

    expect(result.ok).toBe(true);
    expect((result as any).ports[0].ip).toBeUndefined();
  });
});
