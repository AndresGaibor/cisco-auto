import { expect, test, describe } from "bun:test";
import { handleAddLink, handleRemoveLink } from "../../handlers/link";
import type { HandlerDeps } from "../../utils/helpers";

function createDeps(lw: any, net: any, fm: any): HandlerDeps {
  return {
    ipc: {} as never,
    privileged: null,
    global: null,
    getLW: () => lw,
    getNet: () => net,
    getFM: () => fm,
    dprint: () => {},
    DEV_DIR: "/tmp",
    getDeviceByName: () => null,
    getCommandLine: () => null,
    listDeviceNames: () => [],
    now: () => 0,
  } as HandlerDeps;
}

describe("Link handlers (addLink/removeLink)", () => {
  test("handleAddLink returns error when device1 not found", () => {
    const net = {
      getDevice: (n: string) => (n === "R1" ? { getName: () => "R1", skipBoot: () => {} } : null),
    };
    const result = handleAddLink(
      { type: "addLink", device1: "NONEXISTENT", port1: "Gi0/0", device2: "R1", port2: "Gi0/0" },
      createDeps({}, net, {}),
    );
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("DEVICE_NOT_FOUND");
  });

  test("handleAddLink returns error when device2 not found", () => {
    const net = {
      getDevice: (n: string) => (n === "R1" ? { getName: () => "R1", skipBoot: () => {} } : null),
    };
    const result = handleAddLink(
      { type: "addLink", device1: "R1", port1: "Gi0/0", device2: "NONEXISTENT", port2: "Gi0/0" },
      createDeps({}, net, {}),
    );
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("DEVICE_NOT_FOUND");
  });

  test("handleAddLink calls createLink en orden directo", () => {
    const router: any = { getName: () => "R1", skipBoot: () => {}, getType: () => 0 };
    const pc: any = { getName: () => "PC1", skipBoot: () => {}, getType: () => 8 };
    let callOrder: string[] = [];

    let link: any = null;
    const routerPort: any = {
      getName: () => "GigabitEthernet0/0",
      getOwnerDevice: () => router,
      getLink: () => link,
    };
    const pcPort: any = {
      getName: () => "Ethernet0",
      getOwnerDevice: () => pc,
      getLink: () => link,
    };
    const lw = {
      createLink: (d1: string, p1: string, d2: string, p2: string, type: number) => {
        callOrder.push(`${d1}:${p1}-${d2}:${p2}`);
        link = {
          getObjectUuid: () => "uuid-1",
          getConnectionType: () => type,
          getPort1: () => routerPort,
          getPort2: () => pcPort,
        };
        return link;
      },
      deleteLink: () => true,
    };

    const fm = {
      fileExists: () => false,
      writePlainTextToFile: () => {},
    };

    const net = {
      getDeviceCount: () => 2,
      getDeviceAt: (index: number) => (index === 0 ? router : index === 1 ? pc : null),
      getDevice: (n: string) => (n === "PC1" ? pc : router),
    };
    router.getPortCount = () => 1;
    router.getPortAt = () => routerPort;
    router.getPort = () => routerPort;
    pc.getPortCount = () => 1;
    pc.getPortAt = () => pcPort;
    pc.getPort = () => pcPort;

    const result = handleAddLink(
      {
        type: "addLink",
        device1: "R1",
        port1: "GigabitEthernet0/0",
        device2: "PC1",
        port2: "Ethernet0",
        linkType: "auto",
      },
      createDeps(lw, net, fm),
    );
    expect(result.ok).toBe(true);
    expect(callOrder[0]).toContain("R1:GigabitEthernet0/0-PC1:Ethernet0");
  });

  test("handleRemoveLink calls deleteLink", () => {
    let called = false;
    let linkRef: any = null;
    const link = {
      getObjectUuid: () => "uuid-1",
      getConnectionType: () => 8100,
      getPort1: () => ({ getOwnerDevice: () => ({ getName: () => "R1" }), getName: () => "Gi0/0" }),
      getPort2: () => ({ getOwnerDevice: () => ({ getName: () => "S1" }), getName: () => "Fa0/1" }),
    };
    const lw = {
      deleteLink: () => {
        called = true;
        linkRef = null;
      },
    };
    const net = {
      getDeviceCount: () => 1,
      getDeviceAt: () => ({
        getName: () => "R1",
        getPortCount: () => 1,
        getPortAt: () => ({ getName: () => "Gi0/0", getLink: () => linkRef }),
      }),
      getDevice: () => ({ getPort: () => ({ getName: () => "Gi0/0", getLink: () => linkRef }) }),
    };
    linkRef = link;
    const fm = {
      fileExists: () => false,
    };

    const result = handleRemoveLink({ type: "removeLink", device: "R1", port: "Gi0/0" }, createDeps(lw, net, fm));
    expect(result.ok).toBe(true);
    expect(called).toBe(true);
  });

  test("handleRemoveLink funciona contra link live", () => {
    const port = {
      getName: () => "Gi0/0",
      getLink: () => null,
    };
    const lw = { deleteLink: () => true };
    const net = {
      getDeviceCount: () => 1,
      getDeviceAt: () => ({
        getName: () => "R1",
        getPortCount: () => 1,
        getPortAt: () => port,
      }),
      getDevice: () => ({ getPort: () => port }),
    };
    const fm = { fileExists: () => false };

    const result = handleRemoveLink({ type: "removeLink", device: "R1", port: "Gi0/0" }, createDeps(lw, net, fm));
    expect(result.ok).toBe(false);
    expect((result as any).code).toBe("LINK_NOT_FOUND");
  });
});
