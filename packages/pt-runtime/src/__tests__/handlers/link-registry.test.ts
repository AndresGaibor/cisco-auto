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

  test("handleAddLink calls createLink with swapped order when first is end device", () => {
    const pcPort = {
      getName: () => "Ethernet0",
      getPortCount: () => 1,
      getPortAt: () => null,
      getPort: () => pcPort,
    };
    const routerPort = {
      getName: () => "GigabitEthernet0/0",
      getPortCount: () => 1,
      getPortAt: () => null,
      getPort: () => routerPort,
    };
    const device = {
      getName: () => "PC1",
      skipBoot: () => {},
      getType: () => 8,
      getPortCount: () => 1,
      getPortAt: () => pcPort,
      getPort: () => pcPort,
    };
    const router = {
      getName: () => "R1",
      skipBoot: () => {},
      getType: () => 0,
      getPortCount: () => 1,
      getPortAt: () => routerPort,
      getPort: () => routerPort,
    };
    let callOrder: string[] = [];

    const lw = {
      createLink: (d1: string, p1: string, d2: string, p2: string, type: number) => {
        callOrder.push(`${d1}:${p1}-${d2}:${p2}`);
        return d1 === "R1";
      },
    };

    const fm = {
      fileExists: () => false,
      writePlainTextToFile: () => {},
    };

    const net = { getDevice: (n: string) => (n === "PC1" ? device : router) };

    const result = handleAddLink(
      {
        type: "addLink",
        device1: "PC1",
        port1: "Ethernet0",
        device2: "R1",
        port2: "Gi0/0",
        linkType: "auto",
      },
      createDeps(lw, net, fm),
    );
    expect(result.ok).toBe(true);
    expect(callOrder[0]).toContain("R1:GigabitEthernet0/0");
  });

  test("handleRemoveLink calls deleteLink", () => {
    let called = false;
    const lw = {
      deleteLink: () => {
        called = true;
      },
    };
    const fm = {
      fileExists: () => false,
    };

    const result = handleRemoveLink({ device: "R1", port: "Gi0/0" }, createDeps(lw, {}, fm));
    expect(result.ok).toBe(true);
    expect(called).toBe(true);
  });

  test("handleRemoveLink cleans up registry entry", () => {
    const lw = { deleteLink: () => true };
    const registryContent = {
      "R1:Gi0/0--SW1:Fa0/1": { device1: "R1", port1: "Gi0/0", device2: "SW1", port2: "Fa0/1" },
    };
    let savedRegistry: any = null;

    const fm = {
      fileExists: (path: string) => path.includes("link-registry.json"),
      getFileContents: () => JSON.stringify(registryContent),
      writePlainTextToFile: (_: string, content: string) => {
        savedRegistry = JSON.parse(content);
      },
    };

    const result = handleRemoveLink({ device: "R1", port: "Gi0/0" }, createDeps(lw, {}, fm));
    expect(result.ok).toBe(true);
    expect(savedRegistry).not.toBeNull();
    expect(savedRegistry["R1:Gi0/0--SW1:Fa0/1"]).toBeUndefined();
  });
});
