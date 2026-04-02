import { describe, test, expect } from "bun:test";
import { handleAddDevice, handleListDevices, handleRemoveDevice } from "../../handlers/device";
import { handleAddLink, handleRemoveLink } from "../../handlers/link";
import type { HandlerDeps } from "../../utils/helpers";
import { DEVICE_TYPES } from "../../utils/constants.js";

function createMockDevice(name: string, model: string, type: number = DEVICE_TYPES.router): unknown {
  return {
    getName: () => name,
    getModel: () => model,
    getType: () => type,
    getPower: () => true,
    setPower: () => {},
    setName: () => {},
    skipBoot: () => {},
    getCommandLine: () => null,
    getPortCount: () => 0,
    getPortAt: () => null,
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

describe("handleAddDevice contract", () => {
  test("retorna HandlerResult con ok booleano y sin campo autoName", () => {
    const result = handleAddDevice({ type: "addDevice", name: "R1", model: "2911" }, {
      getLW: createMockLW(),
      getNet: createMockNet({}),
      dprint: () => {},
    });

    expect(result).toHaveProperty("ok");
    expect(typeof result.ok).toBe("boolean");
    expect(result).not.toHaveProperty("autoName");
  });

  test("el tipo de retorno no depende de deviceType para ser string", () => {
    const stringResult = handleAddDevice({ type: "addDevice", name: "R1", model: "2911", deviceType: 0 }, {
      getLW: createMockLW(),
      getNet: createMockNet({}),
      dprint: () => {},
    });

    if (stringResult.ok) {
      expect(typeof stringResult.type).toBe("string");
      expect(stringResult).not.toHaveProperty("autoName");
    } else {
      expect(stringResult).toHaveProperty("error");
    }
  });
});

describe("handleAddLink contract", () => {
  test("retorna LinkState-compatible payload con id, device1, port1, device2, port2, cableType", () => {
    const deps: HandlerDeps = {
      getLW: createMockLW(),
      getNet: createMockNet({}),
      dprint: () => {},
    };

    const result = handleAddLink({
      type: "addLink",
      device1: "R1",
      port1: "GigabitEthernet0/0",
      device2: "S1",
      port2: "FastEthernet0/1",
      linkType: "straight",
    }, deps);

    expect(result.ok).toBe(true);
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("string");
    expect(result.id).toContain("R1");
    expect(result.id).toContain("S1");
    expect(result).toHaveProperty("device1");
    expect(result.device1).toBe("R1");
    expect(result).toHaveProperty("port1");
    expect(result.port1).toBe("GigabitEthernet0/0");
    expect(result).toHaveProperty("device2");
    expect(result.device2).toBe("S1");
    expect(result).toHaveProperty("port2");
    expect(result.port2).toBe("FastEthernet0/1");
    expect(result).toHaveProperty("cableType");
    expect(result.cableType).toBe("straight");
  });

  test("usa 'auto' cuando linkType no se especifica", () => {
    const deps: HandlerDeps = {
      getLW: createMockLW(),
      getNet: createMockNet({}),
      dprint: () => {},
    };

    const result = handleAddLink({
      type: "addLink",
      device1: "R1",
      port1: "Serial0/0/0",
      device2: "R2",
      port2: "Serial0/0/0",
    }, deps);

    expect(result.cableType).toBe("auto");
  });

  test("retorna error cuando createLink falla", () => {
    const deps: HandlerDeps = {
      getLW: () => ({
        addDevice: () => null,
        removeDevice: () => {},
        createLink: () => false,
        deleteLink: () => {},
      } as any),
      getNet: createMockNet({}),
      dprint: () => {},
    };

    const result = handleAddLink({
      type: "addLink",
      device1: "R1",
      port1: "GigabitEthernet0/0",
      device2: "S1",
      port2: "FastEthernet0/1",
    }, deps);

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("handleListDevices contract", () => {
  test("retorna array de devices con type como string", () => {
    const deps: HandlerDeps = {
      getLW: createMockLW(),
      getNet: createMockNet({
        "Router1": createMockDevice("Router1", "2911", DEVICE_TYPES.router),
        "Switch1": createMockDevice("Switch1", "2960", DEVICE_TYPES.switch),
        "PC1": createMockDevice("PC1", "PC1", DEVICE_TYPES.pc),
      }),
      dprint: () => {},
    };

    const result = handleListDevices({ type: "listDevices" }, deps) as { ok: boolean; devices: { name: string; model: string; type: string; power: boolean }[]; count: number };

    expect(result.ok).toBe(true);
    expect(result).toHaveProperty("devices");
    expect(Array.isArray(result.devices)).toBe(true);
    expect(result.devices.length).toBe(3);

    for (const device of result.devices) {
      expect(typeof device.name).toBe("string");
      expect(typeof device.model).toBe("string");
      expect(typeof device.type).toBe("string");
      expect(["router", "switch", "pc", "server", "generic", "access_point", "cloud"]).toContain(device.type);
      expect(typeof device.power).toBe("boolean");
    }
  });

  test("cada device tiene type como string, no número", () => {
    const deps: HandlerDeps = {
      getLW: createMockLW(),
      getNet: createMockNet({
        "R1": createMockDevice("R1", "2911", 0),
        "S1": createMockDevice("S1", "2960", 1),
        "PC1": createMockDevice("PC1", "PC1", 3),
      }),
      dprint: () => {},
    };

    const result = handleListDevices({ type: "listDevices" }, deps) as { ok: boolean; devices: { type: string }[]; count: number };

    for (const device of result.devices) {
      expect(typeof device.type).toBe("string");
      expect(typeof device.type === "number").toBe(false);
    }
  });
});

describe("handleRemoveDevice contract", () => {
  test("retorna ok y name en éxito", () => {
    const deps: HandlerDeps = {
      getLW: createMockLW(),
      getNet: createMockNet({}),
      dprint: () => {},
    };

    const result = handleRemoveDevice({ type: "removeDevice", name: "R1" }, deps);

    expect(result.ok).toBe(true);
    expect(result.name).toBe("R1");
  });
});

describe("handleRemoveLink contract", () => {
  test("retorna ok en éxito", () => {
    const deps: HandlerDeps = {
      getLW: createMockLW(),
      getNet: createMockNet({}),
      dprint: () => {},
    };

    const result = handleRemoveLink({ type: "removeLink", device: "R1", port: "GigabitEthernet0/0" }, deps);

    expect(result.ok).toBe(true);
  });
});
