// packages/pt-runtime/src/handlers/__tests__/payload-schemas.test.ts

import { describe, expect, test } from "bun:test";
import {
  AddDevicePayloadSchema,
  ConfigHostPayloadSchema,
  ConfigIosPayloadSchema,
  ExecIosPayloadSchema,
  ListLinksPayloadSchema,
  MoveDevicePayloadSchema,
  RemoveDevicePayloadSchema,
  RenameDevicePayloadSchema,
  SetDefaultGatewayPayloadSchema,
  SetDeviceIpPayloadSchema,
  PayloadSchemas,
  validatePayload,
} from "../payload-schemas.js";

describe("validatePayload - addLink", () => {
  test("acepta payload addLink válido", () => {
    const result = validatePayload("addLink", {
      type: "addLink",
      device1: "R1",
      port1: "Gi0/0",
      device2: "S1",
      port2: "Fa0/1",
    });
    expect(result.ok).toBe(true);
  });

  test("rechaza device1 vacío con mensaje que contiene 'device1'", () => {
    const result = validatePayload("addLink", {
      type: "addLink",
      device1: "",
      port1: "Gi0/0",
      device2: "S1",
      port2: "Fa0/1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_PAYLOAD");
      expect(result.error).toContain("device1");
    }
  });

  test("rechaza input null", () => {
    const result = validatePayload("addLink", null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_PAYLOAD");
    }
  });
});

describe("validatePayload - removeLink", () => {
  test("acepta payload removeLink válido", () => {
    const result = validatePayload("removeLink", {
      type: "removeLink",
      device: "R1",
      port: "Gi0/0",
    });
    expect(result.ok).toBe(true);
  });
});

describe("validatePayload - configHost", () => {
  test("acepta payload configHost con IP estática", () => {
    const result = validatePayload("configHost", {
      type: "configHost",
      device: "PC1",
      ip: "192.168.1.10",
      mask: "255.255.255.0",
      dhcp: false,
    });
    expect(result.ok).toBe(true);
  });

  test("rechaza dhcp con valor no booleano", () => {
    const result = validatePayload("configHost", {
      type: "configHost",
      device: "PC1",
      dhcp: "yes",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_PAYLOAD");
    }
  });
});

describe("validatePayload - execIos", () => {
  test("rechaza command vacío", () => {
    const result = validatePayload("execIos", {
      type: "execIos",
      device: "R1",
      command: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_PAYLOAD");
    }
  });

  test("acepta payload execIos con timeout", () => {
    const result = validatePayload("execIos", {
      type: "execIos",
      device: "R1",
      command: "show ip int brief",
      timeout: 5000,
    });
    expect(result.ok).toBe(true);
  });
});

describe("validatePayload - configIos", () => {
  test("rechaza commands vacío", () => {
    const result = validatePayload("configIos", {
      type: "configIos",
      device: "R1",
      commands: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_PAYLOAD");
    }
  });

  test("acepta payload configIos con save:true", () => {
    const result = validatePayload("configIos", {
      type: "configIos",
      device: "R1",
      commands: ["int Gi0/0", "ip address 1.1.1.1 255.255.255.0"],
      save: true,
    });
    expect(result.ok).toBe(true);
  });
});

describe("PayloadSchemas - estructura", () => {
  const expectedKeys = [
    "addDevice", "addLink", "configHost", "configIos",
    "execIos", "listLinks", "moveDevice", "removeDevice",
    "removeLink", "renameDevice", "setDefaultGateway", "setDeviceIp",
    "verifyLink",
  ];

  test("tiene exactamente 13 keys", () => {
    expect(Object.keys(PayloadSchemas).sort()).toEqual(expectedKeys);
  });

  test("todos los schemas tienen description no vacía", () => {
    for (const key of Object.keys(PayloadSchemas) as Array<keyof typeof PayloadSchemas>) {
      const description = PayloadSchemas[key].description;
      expect(typeof description).toBe("string");
      expect(description?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("validatePayload - addDevice", () => {
  test("acepta payload mínimo (solo type)", () => {
    const r = validatePayload("addDevice", { type: "addDevice" });
    expect(r.ok).toBe(true);
  });

  test("rechaza x no numérico", () => {
    const r = validatePayload("addDevice", { type: "addDevice", x: "abc" });
    expect(r.ok).toBe(false);
  });

  test("rechaza deviceType negativo", () => {
    const r = validatePayload("addDevice", { type: "addDevice", deviceType: -1 });
    expect(r.ok).toBe(false);
  });
});

describe("validatePayload - removeDevice", () => {
  test("acepta payload válido", () => {
    expect(validatePayload("removeDevice", { type: "removeDevice", name: "R1" }).ok).toBe(true);
  });

  test("rechaza name vacío", () => {
    expect(validatePayload("removeDevice", { type: "removeDevice", name: "" }).ok).toBe(false);
  });
});

describe("validatePayload - renameDevice", () => {
  test("acepta payload válido", () => {
    const r = validatePayload("renameDevice", { type: "renameDevice", oldName: "R1", newName: "R2" });
    expect(r.ok).toBe(true);
  });

  test("rechaza oldName vacío", () => {
    expect(validatePayload("renameDevice", { type: "renameDevice", oldName: "", newName: "R2" }).ok).toBe(false);
  });
});

describe("validatePayload - moveDevice", () => {
  test("acepta payload válido", () => {
    expect(validatePayload("moveDevice", { type: "moveDevice", name: "R1", x: 100, y: 200 }).ok).toBe(true);
  });

  test("rechaza x NaN", () => {
    expect(validatePayload("moveDevice", { type: "moveDevice", name: "R1", x: NaN, y: 200 }).ok).toBe(false);
  });
});

describe("validatePayload - setDeviceIp", () => {
  test("acepta payload válido", () => {
    const r = validatePayload("setDeviceIp", { device: "PC1", port: "Fa0", ip: "10.0.0.1", mask: "255.0.0.0" });
    expect(r.ok).toBe(true);
  });

  test("rechaza puerto vacío", () => {
    expect(validatePayload("setDeviceIp", { device: "PC1", port: "", ip: "10.0.0.1", mask: "255.0.0.0" }).ok).toBe(false);
  });
});

describe("validatePayload - setDefaultGateway", () => {
  test("acepta payload válido", () => {
    expect(validatePayload("setDefaultGateway", { device: "PC1", gw: "10.0.0.254" }).ok).toBe(true);
  });

  test("rechaza gw vacío", () => {
    expect(validatePayload("setDefaultGateway", { device: "PC1", gw: "" }).ok).toBe(false);
  });
});

describe("validatePayload - listLinks", () => {
  test("acepta payload vacío (todo opcional)", () => {
    expect(validatePayload("listLinks", {}).ok).toBe(true);
  });

  test("acepta con filtro device", () => {
    expect(validatePayload("listLinks", { device: "R1" }).ok).toBe(true);
  });
});

describe("imports sanity check", () => {
  test("schemas se importan correctamente", () => {
    expect(AddDevicePayloadSchema).toBeDefined();
    expect(ConfigHostPayloadSchema).toBeDefined();
    expect(ConfigIosPayloadSchema).toBeDefined();
    expect(ExecIosPayloadSchema).toBeDefined();
    expect(ListLinksPayloadSchema).toBeDefined();
    expect(MoveDevicePayloadSchema).toBeDefined();
    expect(RemoveDevicePayloadSchema).toBeDefined();
    expect(RenameDevicePayloadSchema).toBeDefined();
    expect(SetDefaultGatewayPayloadSchema).toBeDefined();
    expect(SetDeviceIpPayloadSchema).toBeDefined();
  });
});
