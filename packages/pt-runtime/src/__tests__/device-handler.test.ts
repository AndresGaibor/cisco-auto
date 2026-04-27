import { describe, expect, test, vi } from "bun:test";
import { handleListDevices } from "../handlers/device";
import type { HandlerDeps } from "../utils/helpers";

class MockPort {
  constructor(
    public name: string,
    public ip = "0.0.0.0",
    public mask = "0.0.0.0",
    public mac = "00:00:00:00:00:00",
  ) {}
  getName() {
    return this.name;
  }
  getIpAddress() {
    return this.ip;
  }
  getSubnetMask() {
    return this.mask;
  }
  getMacAddress() {
    return this.mac;
  }
  isPortUp() {
    return true;
  }
  isProtocolUp() {
    return true;
  }
}

class MockDevice {
  public ports: MockPort[];
  constructor(
    public name: string,
    public model: string,
    public type: number,
    public power = true,
    ports: MockPort[] = [],
  ) {
    this.ports = ports;
  }
  getName() {
    return this.name;
  }
  getModel() {
    return this.model;
  }
  getType() {
    return this.type;
  }
  getPower() {
    return this.power;
  }
  getPortCount() {
    return this.ports.length;
  }
  getPortAt(i: number) {
    return this.ports[i] || null;
  }
  getPort(name: string) {
    return this.ports.find((p) => p.getName() === name) || null;
  }
}

class MockLink {
  constructor(
    public port1: MockPort,
    public port2: MockPort,
  ) {}
  getPort1() {
    return this.port1;
  }
  getPort2() {
    return this.port2;
  }
}

class MockNetwork {
  constructor(
    public devices: MockDevice[],
    private links: MockLink[] = [],
  ) {}
  getDeviceCount() {
    return this.devices.length;
  }
  getDeviceAt(i: number) {
    return this.devices[i] || null;
  }
  getDevice(name: string) {
    return this.devices.find((d) => d.getName() === name) || null;
  }
  getLinkCount() {
    return this.links.length;
  }
  getLinkAt(i: number) {
    return this.links[i] || null;
  }
}

function createDeps(
  net: MockNetwork,
  fm: Record<string, unknown> = {},
  options: { uuidByObject?: WeakMap<object, string> } = {},
): HandlerDeps {
  const { uuidByObject } = options;
  return {
    getNet: () => net as any,
    getFM: () => fm as any,
    getLW: () => ({}),
    getDeviceByName: (name: string) => net.getDevice(name) as any,
    listDeviceNames: () => net.devices.map((d) => d.name),
    ipc: {
      getObjectUuid: (obj: unknown) => {
        if (!uuidByObject || !obj || typeof obj !== "object") return null;
        return uuidByObject.get(obj as object) ?? null;
      },
      getObjectByUuid: () => null,
    } as any,
    DEV_DIR: "/tmp/test-pt",
    dprint: vi.fn(),
    now: () => Date.now(),
    getCommandLine: vi.fn(),
  } as unknown as HandlerDeps;
}

describe("handleListDevices", () => {
  describe("link resolution", () => {
    test("resolves PT link with unique ownership", () => {
      const pc1 = new MockDevice("PC1", "PC-PT", 8, true, [new MockPort("FastEthernet0")]);
      const pc2 = new MockDevice("PC2", "PC-PT", 8, true, [new MockPort("FastEthernet1")]);
      const sw = new MockDevice("SW1", "2960-24TT", 1, true, [
        new MockPort("FastEthernet0/1"),
        new MockPort("FastEthernet0/2"),
      ]);

      const link1 = new MockLink(pc1.ports[0], sw.ports[0]);
      const link2 = new MockLink(pc2.ports[0], sw.ports[1]);

      const net = new MockNetwork([pc1, pc2, sw], [link1, link2]);
      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      expect(result.ok).toBe(true);
      expect(result.connectionsByDevice).toBeDefined();

      const pc1Conns = result.connectionsByDevice["PC1"] || [];
      const pc2Conns = result.connectionsByDevice["PC2"] || [];
      const swConns = result.connectionsByDevice["SW1"] || [];

      expect(pc1Conns.length).toBeGreaterThanOrEqual(1);
      expect(pc2Conns.length).toBeGreaterThanOrEqual(1);
      expect(swConns.length).toBe(2);

      const pc1Link = pc1Conns.find((c: any) => c.remoteDevice === "SW1");
      expect(pc1Link).toBeDefined();
      expect(pc1Link.confidence).toBe("exact");
    });

    test("resolves by mac even when port names collide", () => {
      const dev1 = new MockDevice("DEV1", "Generic", 0, true, [
        new MockPort("FastEthernet0", "0.0.0.0", "0.0.0.0", "aa:aa:aa:aa:aa:01"),
      ]);
      const dev2 = new MockDevice("DEV2", "Generic", 0, true, [
        new MockPort("FastEthernet0", "0.0.0.0", "0.0.0.0", "aa:aa:aa:aa:aa:02"),
      ]);

      const link = new MockLink(dev1.ports[0], dev2.ports[0]);

      const net = new MockNetwork([dev1, dev2], [link]);
      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      const allConns = Object.values(result.connectionsByDevice).flat();
      expect(allConns.every((c: any) => c.confidence === "exact")).toBe(true);
      expect(result.unresolvedLinks).toHaveLength(0);
    });

    test("preserves resolved connections in device ports", () => {
      const dev1 = new MockDevice("DEV1", "Generic", 0, true, [new MockPort("FastEthernet0")]);
      const dev2 = new MockDevice("DEV2", "Generic", 0, true, [new MockPort("FastEthernet1")]);
      const link = new MockLink(dev1.ports[0], dev2.ports[0]);
      const net = new MockNetwork([dev1, dev2], [link]);
      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      const dev1Port = result.devices.find((d: any) => d.name === "DEV1")?.ports?.[0];
      expect(dev1Port?.connection).toBeDefined();
      expect(dev1Port?.connection?.remoteDevice).toBe("DEV2");
    });

    test("keeps name-resolved links in connectionsByDevice", () => {
      const dev1 = new MockDevice("DEV1", "Generic", 0, true, [new MockPort("FastEthernet0")]);
      const dev2 = new MockDevice("DEV2", "Generic", 0, true, [new MockPort("FastEthernet1")]);
      const link = new MockLink(dev1.ports[0], dev2.ports[0]);
      const net = new MockNetwork([dev1, dev2], [link]);
      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      const conns = result.connectionsByDevice["DEV1"] || [];
      expect(conns.length).toBeGreaterThan(0);
      expect(conns[0]?.remoteDevice).toBe("DEV2");
    });

    test("uses UUIDs to resolve same port names without ambiguity", () => {
      const dev1 = new MockDevice("DEV1", "Generic", 0, true, [
        new MockPort("FastEthernet0", "0.0.0.0", "0.0.0.0", "aa:aa:aa:aa:aa:01"),
      ]);
      const dev2 = new MockDevice("DEV2", "Generic", 0, true, [
        new MockPort("FastEthernet0", "0.0.0.0", "0.0.0.0", "aa:aa:aa:aa:aa:02"),
      ]);

      const link = new MockLink(dev1.ports[0], dev2.ports[0]);

      const net = new MockNetwork([dev1, dev2], [link]);
      const uuidByObject = new WeakMap<object, string>([
        [dev1.ports[0], "uuid-dev1-port0"],
        [dev2.ports[0], "uuid-dev2-port0"],
      ]);
      const deps = createDeps(net, {}, { uuidByObject });

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      const dev1Conn = result.connectionsByDevice["DEV1"]?.[0];
      expect(dev1Conn?.confidence).toBe("exact");
      expect(dev1Conn?.remoteDevice).toBe("DEV2");
      expect(result.unresolvedLinks.length).toBe(0);
    });

    test("prefers object UUID over ipc fallback", () => {
      class UuidPort extends MockPort {
        getObjectUuid() {
          return `uuid-${this.name}`;
        }
      }

      const dev1 = new MockDevice("DEV1", "Generic", 0, true, [
        new UuidPort("FastEthernet0", "0.0.0.0", "0.0.0.0", "aa:aa:aa:aa:aa:01"),
      ]);
      const dev2 = new MockDevice("DEV2", "Generic", 0, true, [
        new UuidPort("FastEthernet1", "0.0.0.0", "0.0.0.0", "aa:aa:aa:aa:aa:02"),
      ]);
      const link = new MockLink(dev1.ports[0], dev2.ports[0]);
      const net = new MockNetwork([dev1, dev2], [link]);

      const deps = {
        ...createDeps(net),
        ipc: {
          getObjectUuid: () => {
            throw new Error("ipc fallback should not be used");
          },
          getObjectByUuid: () => null,
        },
      } as any;

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      const dev1Conn = result.connectionsByDevice["DEV1"]?.[0];
      expect(dev1Conn?.confidence).toBe("exact");
      expect(result.unresolvedLinks.length).toBe(0);
    });

    test("usa solo links live de PT", () => {
      const pc1 = new MockDevice("PC1", "PC-PT", 8, true, [new MockPort("FastEthernet0")]);
      const sw = new MockDevice("SW1", "2960-24TT", 1, true, [new MockPort("FastEthernet0/1")]);

      const link = new MockLink(pc1.ports[0], sw.ports[0]);

      const net = new MockNetwork([pc1, sw], [link]);

      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      expect(result.ok).toBe(true);
      const allConns = Object.values(result.connectionsByDevice).flat();
      expect(allConns.length).toBeGreaterThan(0);
    });

    test("omite enlaces cuando no existe link live", () => {
      const pc1 = new MockDevice("PC1", "PC-PT", 8, true, [new MockPort("FastEthernet0")]);
      const sw = new MockDevice("SW1", "2960-24TT", 1, true, [new MockPort("FastEthernet0/1")]);

      const net = new MockNetwork([pc1, sw], []);

      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      const allConns = Object.values(result.connectionsByDevice).flat();
      expect(allConns).toHaveLength(0);
    });

    test("omits unresolved links from the visible list", () => {
      const dev1 = new MockDevice("DEV1", "Generic", 0, true, [new MockPort("Serial0/0")]);
      const dev2 = new MockDevice("DEV2", "Generic", 0, true, [new MockPort("Serial0/0")]);

      const link = new MockLink(dev1.ports[0], dev2.ports[0]);

      const net = new MockNetwork([dev1, dev2], [link]);
      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      const allConns = Object.values(result.connectionsByDevice).flat();
      expect(result.unresolvedLinks).toHaveLength(0);
      expect(allConns.every((c: any) => c.confidence === "exact")).toBe(true);
    });
  });

  describe("connectionsByDevice derivation", () => {
    test("builds symmetric connectionsByDevice from links[]", () => {
      const pc1 = new MockDevice("PC1", "PC-PT", 8, true, [new MockPort("FastEthernet0")]);
      const sw = new MockDevice("SW1", "2960-24TT", 1, true, [new MockPort("FastEthernet0/1")]);

      const link = new MockLink(pc1.ports[0], sw.ports[0]);

      const net = new MockNetwork([pc1, sw], [link]);
      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      expect(result.connectionsByDevice).toBeDefined();

      const pc1Conns = result.connectionsByDevice["PC1"] || [];
      const swConns = result.connectionsByDevice["SW1"] || [];

      expect(pc1Conns.length).toBe(swConns.length);

      const pc1Peer = pc1Conns[0];
      expect(pc1Peer.remoteDevice).toBe("SW1");

      const swPeer = swConns[0];
      expect(swPeer.remoteDevice).toBe("PC1");
    });

    test("counts links correctly", () => {
      const pc1 = new MockDevice("PC1", "PC-PT", 8, true, [new MockPort("FastEthernet0")]);
      const pc2 = new MockDevice("PC2", "PC-PT", 8, true, [new MockPort("FastEthernet1")]);
      const sw = new MockDevice("SW1", "2960-24TT", 1, true, [
        new MockPort("FastEthernet0/1"),
        new MockPort("FastEthernet0/2"),
      ]);

      const link1 = new MockLink(pc1.ports[0], sw.ports[0]);
      const link2 = new MockLink(pc2.ports[0], sw.ports[1]);

      const net = new MockNetwork([pc1, pc2, sw], [link1, link2]);
      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      const allConns = Object.values(result.connectionsByDevice).flat();
      expect(allConns.length).toBe(4);
    });
  });

  describe("linkStats (now via connectionsByDevice + ptLinkDebug)", () => {
    test("provides ptLinkDebug with link counts", () => {
      const pc1 = new MockDevice("PC1", "PC-PT", 8, true, [new MockPort("FastEthernet0")]);
      const sw = new MockDevice("SW1", "2960-24TT", 1, true, [new MockPort("FastEthernet0/1")]);

      const link = new MockLink(pc1.ports[0], sw.ports[0]);

      const net = new MockNetwork([pc1, sw], [link]);
      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      expect(result.ptLinkDebug).toBeDefined();
      expect(typeof result.ptLinkDebug.getLinkCountResult).toBe("number");
      expect(typeof result.ptLinkDebug.getLinkAtExists).toBe("boolean");
      expect(typeof result.ptLinkDebug.ptLinksFound).toBe("number");
      expect(typeof result.ptLinkDebug.registryEntries).toBe("number");

      const allConns = Object.values(result.connectionsByDevice).flat();
      const exactCount = allConns.filter((c: any) => c.confidence === "exact").length;
      const registryCount = allConns.filter((c: any) => c.confidence === "registry").length;
      const ambiguousCount = allConns.filter((c: any) => c.confidence === "ambiguous").length;

      expect(exactCount).toBeGreaterThan(0);
      expect(registryCount).toBe(0);
      expect(ambiguousCount).toBe(0);
    });
  });

  describe("device listing", () => {
    test("returns all devices with correct properties", () => {
      const router = new MockDevice("R1", "1941", 0, true, []);
      const switchDevice = new MockDevice("SW1", "2960-24TT", 1, true, []);

      const net = new MockNetwork([router, switchDevice], []);
      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      expect(result.ok).toBe(true);
      expect(result.devices).toHaveLength(2);
      expect(result.count).toBe(2);

      const deviceNames = result.devices.map((d: any) => d.name);
      expect(deviceNames).toContain("R1");
      expect(deviceNames).toContain("SW1");
    });

    test("returns empty when no devices", () => {
      const net = new MockNetwork([], []);
      const deps = createDeps(net);

      const result = handleListDevices({ type: "listDevices" }, deps) as any;

      expect(result.ok).toBe(true);
      expect(result.devices).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });
});
