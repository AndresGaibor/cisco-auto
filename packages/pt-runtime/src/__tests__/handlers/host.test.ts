import { expect, test, describe } from "bun:test";
import { handleInspectHost } from "../../handlers/host";
import type { PtDeps } from "../../pt-api/pt-deps.js";

const deps: PtDeps = {
  ipc: {} as never,
  getLW: () => ({} as never),
  getNet: () => ({
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
        getIpv6Address: () => "",
        getIpv6Enabled: () => false,
        getIpv6Mtu: () => 0,
        getMtu: () => 1500,
        getIpMtu: () => 1500,
        isPortUp: () => true,
        isProtocolUp: () => true,
        getInboundFirewallService: () => "",
        getInboundFirewallServiceStatus: () => "",
        getInboundIpv6FirewallService: () => "",
        getInboundIpv6FirewallServiceStatus: () => "",
      }),
      getPort: () => null,
      getDhcpFlag: () => false,
    }),
  } as never),
  getFM: () => ({} as never),
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
});
