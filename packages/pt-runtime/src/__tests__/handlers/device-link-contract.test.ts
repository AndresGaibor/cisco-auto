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

const commonDeps = {
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
    const deps: any = {
      getLW: createMockLW(),
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
      linkType: "straight",
    }, deps);

    expect((result as any).ok).toBe(true);
    expect((result as any)).toHaveProperty("id");
    expect(typeof (result as any).id).toBe("string");
    expect((result as any).id).toContain("R1");
    expect((result as any).id).toContain("S1");
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
    const deps: any = {
      getLW: createMockLW(),
      getNet: createMockNet({
        "R1": createMockDevice("R1", "2911", DEVICE_TYPES.router, ["Serial0/0/0"]),
        "R2": createMockDevice("R2", "2911", DEVICE_TYPES.router, ["Serial0/0/0"]),
      }),
      ...commonDeps,
    };

    const result = handleAddLink({
      type: "addLink",
      device1: "R1",
      port1: "Serial0/0/0",
      device2: "R2",
      port2: "Serial0/0/0",
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
    const deps: any = {
      getLW: createMockLW(),
      getNet: createMockNet({}),
      ...commonDeps,
    };

    const result = handleRemoveDevice({ type: "removeDevice", name: "R1" }, deps);

    expect((result as any).ok).toBe(true);
    expect((result as any).name).toBe("R1");
  });
});

describe("handleRemoveLink contract", () => {
  test("retorna ok en éxito", () => {
    const deps: any = {
      getLW: createMockLW(),
      getNet: createMockNet({}),
      ...commonDeps,
    };

    const result = handleRemoveLink({ device: "R1", port: "GigabitEthernet0/0" }, deps);

    expect((result as any).ok).toBe(true);
  });
});
