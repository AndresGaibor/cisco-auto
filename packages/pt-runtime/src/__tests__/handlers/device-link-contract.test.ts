import { describe, test, expect } from "bun:test";
import { handleAddDevice, handleListDevices, handleRemoveDevice } from "../../handlers/device";
import { handleAddLink, handleRemoveLink } from "../../handlers/link";
import type { HandlerDeps } from "../../utils/helpers";
import { DEVICE_TYPES } from "../../utils/constants.js";

function createMockDevice(name: string, model: string, type: number = DEVICE_TYPES.router, ports: string[] = []): unknown {
  return {
    getName: () => name,
    getModel: () => model,
    getType: () => type,
    getPower: () => true,
    setPower: () => {},
    setName: () => {},
    skipBoot: () => {},
    getCommandLine: () => null,
    getPortCount: () => ports.length,
    getPortAt: (i: number) => ports[i] ? { getName: () => ports[i] } : null,
    addModule: () => false,
    removeModule: () => false,
  };
}

function createMockNet(devices: Record<string, unknown>): HandlerDeps["getNet"] {
  return () => ({
    getDeviceCount: () => Object.keys(devices).length,
    getDeviceAt: (i: number) => {
      const keys = Object.keys(devices);
      return i < keys.length ? (devices[keys[i]] as any) ?? null : null;
    },
    getDevice: (name: string) => (devices[name] as any) ?? null,
  }) as any;
}

function createMockLW(): HandlerDeps["getLW"] {
  let addedDevices: string[] = [];
  return () => ({
    addDevice: (type: number, model: string, x: number, y: number) => {
      const name = model + "_" + addedDevices.length;
      addedDevices.push(name);
      return name;
    },
    removeDevice: (name: string) => {
      addedDevices = addedDevices.filter(n => n !== name);
    },
    createLink: () => true,
    deleteLink: () => {},
  }) as any;
}

function createLiveLinkDeps(opts?: { connected?: boolean }) {
  let link: any = null;

  const device1: any = {};
  const device2: any = {};

  const port1: any = {
    getName: () => "GigabitEthernet0/0",
    getLightStatus: () => 2,
    isPortUp: () => true,
    isProtocolUp: () => true,
    getRemotePortName: () => "FastEthernet0/1",
    getOwnerDevice: () => device1,
    getLink: () => link,
  };

  const port2: any = {
    getName: () => "FastEthernet0/1",
    getLightStatus: () => 2,
    isPortUp: () => true,
    isProtocolUp: () => true,
    getRemotePortName: () => "GigabitEthernet0/0",
    getOwnerDevice: () => device2,
    getLink: () => link,
  };

  device1.getName = () => "R1";
  device1.getModel = () => "2911";
  device1.getType = () => DEVICE_TYPES.router;
  device1.getPower = () => true;
  device1.skipBoot = () => {};
  device1.getPortCount = () => 1;
  device1.getPortAt = (i: number) => (i === 0 ? port1 : null);
  device1.getPort = (name: string) => (String(name).toLowerCase() === "gigabitethernet0/0" ? port1 : null);

  device2.getName = () => "S1";
  device2.getModel = () => "2960";
  device2.getType = () => DEVICE_TYPES.switch;
  device2.getPower = () => true;
  device2.skipBoot = () => {};
  device2.getPortCount = () => 1;
  device2.getPortAt = (i: number) => (i === 0 ? port2 : null);
  device2.getPort = (name: string) => (String(name).toLowerCase() === "fastethernet0/1" ? port2 : null);

  const liveLink = {
    getObjectUuid: () => "uuid-1",
    getConnectionType: () => 8100,
    getPort1: () => port1,
    getPort2: () => port2,
  };

  if (opts?.connected !== false) {
    link = liveLink;
  }

  const net = {
    getDeviceCount: () => 2,
    getDeviceAt: (i: number) => (i === 0 ? device1 : i === 1 ? device2 : null),
    getDevice: (name: string) => {
      if (name === "R1") return device1;
      if (name === "S1") return device2;
      return null;
    },
  };

  const lw = {
    createLink: () => {
      link = liveLink;
      return liveLink;
    },
    deleteLink: () => {
      link = null;
      return true;
    },
  };

  return {
    deps: {
      getLW: () => lw as any,
      getNet: () => net as any,
      ...commonDeps,
    },
    liveLink,
  };
}

const commonDeps: any = {
  getFM: () => ({ 
    fileExists: () => false, 
    writePlainTextToFile: () => {}, 
    getFileContents: () => "{}" 
  } as any),
  DEV_DIR: "/tmp",
  dprint: () => {},
};

describe("handleAddDevice contract", () => {
  test("retorna HandlerResult con ok booleano y sin campo autoName", () => {
    const result = handleAddDevice({ type: "addDevice", name: "R1", model: "2911", deviceType: 0 }, {
      getLW: createMockLW(),
      getNet: createMockNet({
        "2911_0": createMockDevice("2911_0", "2911", DEVICE_TYPES.router),
      }),
      ...commonDeps,
    } as any);

    expect((result as any).ok).toBe(true);
    expect(typeof (result as any).ok).toBe("boolean");
    expect((result as any)).not.toHaveProperty("autoName");
  });

  test("el tipo de retorno no depende de deviceType para ser string", () => {
    const stringResult = handleAddDevice({ type: "addDevice", name: "R1", model: "2911", deviceType: 0 }, {
      getLW: createMockLW(),
      getNet: createMockNet({
        "2911_0": createMockDevice("2911_0", "2911", DEVICE_TYPES.router),
      }),
      ...commonDeps,
    } as any);

    expect(typeof (stringResult as any).type).toBe("string");
  });
});

describe("handleAddLink contract", () => {
  test("retorna LinkState-compatible payload con id, device1, port1, device2, port2, cableType", () => {
    const { deps } = createLiveLinkDeps({ connected: false });

    const result = handleAddLink({
      type: "addLink",
      device1: "R1",
      port1: "GigabitEthernet0/0",
      device2: "S1",
      port2: "FastEthernet0/1",
      linkType: "straight",
    }, deps);

    expect((result as any).ok).toBe(true);
    expect((result as any)).toHaveProperty("id");
    expect(typeof (result as any).id).toBe("string");
    expect((result as any).id).toBe("uuid-1");
    expect((result as any)).toHaveProperty("device1");
    expect((result as any).device1).toBe("R1");
    expect((result as any)).toHaveProperty("port1");
    expect((result as any).port1).toBe("GigabitEthernet0/0");
    expect((result as any)).toHaveProperty("device2");
    expect((result as any).device2).toBe("S1");
    expect((result as any)).toHaveProperty("port2");
    expect((result as any).port2).toBe("FastEthernet0/1");
    expect((result as any)).toHaveProperty("cableType");
    expect((result as any).cableType).toBe("straight");
  });

  test("usa 'auto' cuando linkType no se especifica", () => {
    const { deps } = createLiveLinkDeps({ connected: false });

    const result = handleAddLink({
      type: "addLink",
      device1: "R1",
      port1: "GigabitEthernet0/0",
      device2: "S1",
      port2: "FastEthernet0/1",
    }, deps);

    expect((result as any).ok).toBe(true);
    expect((result as any).cableType).toBe("auto");
  });

  test("retorna error cuando createLink falla", () => {
    const deps: any = {
      getLW: () => ({
        addDevice: () => null,
        removeDevice: () => {},
        createLink: () => false,
        deleteLink: () => {},
      } as any),
      getNet: createMockNet({
        "R1": createMockDevice("R1", "2911", DEVICE_TYPES.router, ["GigabitEthernet0/0"]),
        "S1": createMockDevice("S1", "2960", DEVICE_TYPES.switch, ["FastEthernet0/1"]),
      }),
      ...commonDeps,
    };

    const result = handleAddLink({
      type: "addLink",
      device1: "R1",
      port1: "GigabitEthernet0/0",
      device2: "S1",
      port2: "FastEthernet0/1",
    }, deps);

    expect((result as any).ok).toBe(false);
    expect((result as any).error).toBeDefined();
  });
});

describe("handleListDevices contract", () => {
  test("retorna array de devices con type como string", () => {
    const deps: any = {
      getLW: createMockLW(),
      getNet: createMockNet({
        "Router1": createMockDevice("Router1", "2911", DEVICE_TYPES.router),
        "Switch1": createMockDevice("Switch1", "2960", DEVICE_TYPES.switch),
        "PC1": createMockDevice("PC1", "PC1", DEVICE_TYPES.pc),
      }),
      ...commonDeps,
    };

    const result = handleListDevices({ type: "listDevices" }, deps) as { ok: boolean; devices: { name: string; model: string; type: string; power: boolean }[]; count: number };

    expect((result as any).ok).toBe(true);
    expect((result as any)).toHaveProperty("devices");
    expect(Array.isArray((result as any).devices)).toBe(true);
    expect((result as any).devices.length).toBe(3);

    for (const device of (result as any).devices) {
      expect(typeof device.name).toBe("string");
      expect(typeof device.model).toBe("string");
      expect(typeof device.type).toBe("string");
      expect(["router", "switch", "pc", "server", "generic", "access_point", "cloud"]).toContain(device.type);
      expect(typeof device.power).toBe("boolean");
    }
  });

  test("cada device tiene type como string, no número", () => {
    const deps: any = {
      getLW: createMockLW(),
      getNet: createMockNet({
        "R1": createMockDevice("R1", "2911", 0),
        "S1": createMockDevice("S1", "2960", 1),
        "PC1": createMockDevice("PC1", "PC1", 3),
      }),
      ...commonDeps,
    };

    const result = handleListDevices({ type: "listDevices" }, deps) as { ok: boolean; devices: { type: string }[]; count: number };

    for (const device of (result as any).devices) {
      expect(typeof device.type).toBe("string");
      expect(typeof device.type === "number").toBe(false);
    }
  });
});

describe("handleRemoveDevice contract", () => {
  test("retorna ok y name en éxito", () => {
    const device = createMockDevice("R1", "2911", DEVICE_TYPES.router);
    let devices: Record<string, unknown> = { R1: device };
    const deps: any = {
      getLW: () => ({
        removeDevice: (name: string) => {
          delete devices[name];
        },
      } as any),
      getNet: () => ({
        getDeviceCount: () => Object.keys(devices).length,
        getDeviceAt: (i: number) => Object.values(devices)[i] ?? null,
        getDevice: (name: string) => (devices[name] as any) ?? null,
      } as any),
      ...commonDeps,
    };

    const result = handleRemoveDevice({ type: "removeDevice", name: "R1" }, deps);

    expect((result as any).ok).toBe(true);
    expect((result as any).name).toBe("R1");
  });
});

describe("handleRemoveLink contract", () => {
  test("retorna ok en éxito", () => {
    const { deps } = createLiveLinkDeps({ connected: true });

    const result = handleRemoveLink({ type: "removeLink", device: "R1", port: "GigabitEthernet0/0" }, deps);

    expect((result as any).ok).toBe(true);
  });
});
