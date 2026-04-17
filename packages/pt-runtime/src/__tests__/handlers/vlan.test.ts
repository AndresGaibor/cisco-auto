import { expect, test, describe } from "bun:test";
import { handleEnsureVlans, handleConfigVlanInterfaces } from "../../handlers/vlan";
import type { PtDeps } from "../../pt-api/pt-deps.js";

function createDeps(vlanManager: Record<string, any>): PtDeps {
  const device = {
    getName: () => "SW1",
    getProcess: () => vlanManager,
  } as any;

  return {
    ipc: {} as never,
    privileged: null,
    global: null,
    getLW: () => ({}) as never,
    getNet: () => ({ getDevice: () => device }) as never,
    getFM: () => ({}) as never,
    dprint: () => {},
    DEV_DIR: "/tmp",
    getDeviceByName: () => device,
    getCommandLine: () => null,
    listDeviceNames: () => ["SW1"],
    now: () => 0,
  };
}

describe("VLAN handlers", () => {
  test("ensureVlans crea VLANs ausentes", () => {
    const vlanManager = {
      getVlanCount: () => 0,
      getVlanAt: () => null,
      addVlan: (id: number, name: string) => name === `VLAN${id}`,
    };

    const result = handleEnsureVlans(
      { type: "ensureVlans", device: "SW1", vlans: [{ id: 10 }] },
      createDeps(vlanManager),
    );

    expect(result.ok).toBe(true);
    expect((result as any).vlans[0]).toEqual({ id: 10, name: "VLAN10", created: true });
  });

  test("configVlanInterfaces configura una SVI existente", () => {
    const svi = {
      setIpSubnetMask: (ip: string, mask: string) => {
        if (ip !== "10.0.10.1" || mask !== "255.255.255.0") throw new Error("bad");
      },
    };
    const vlanManager = {
      getVlanCount: () => 1,
      getVlanAt: () => ({ id: 10, name: "VLAN10" }),
      addVlan: () => true,
      getVlanInt: () => svi,
      addVlanInt: () => true,
    };

    const result = handleConfigVlanInterfaces(
      {
        type: "configVlanInterfaces",
        device: "SW1",
        interfaces: [{ interface: "Vlan10", vlanId: 10, ip: "10.0.10.1", mask: "255.255.255.0" }],
      },
      createDeps(vlanManager),
    );

    expect(result.ok).toBe(true);
    expect((result as any).interfaces[0].success ?? true).toBe(true);
  });
});
