// packages/pt-runtime/src/handlers/__tests__/payload-schemas.test.ts

import { describe, expect, test } from "bun:test";
import {
  ConfigHostPayloadSchema,
  ConfigIosPayloadSchema,
  ExecIosPayloadSchema,
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
  test("tiene exactamente 6 keys: addLink, removeLink, configHost, execIos, configIos, verifyLink", () => {
    expect(Object.keys(PayloadSchemas).sort()).toEqual(
      ["addLink", "configHost", "configIos", "execIos", "removeLink", "verifyLink"],
    );
  });

  test("los 5 schemas tienen description no vacía", () => {
    const all = [
      PayloadSchemas.addLink,
      PayloadSchemas.removeLink,
      PayloadSchemas.configHost,
      PayloadSchemas.execIos,
      PayloadSchemas.configIos,
    ];
    for (const schema of all) {
      const description = schema.description;
      expect(typeof description).toBe("string");
      expect(description?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("imports sanity check", () => {
  test("schemas se importan correctamente", () => {
    expect(ConfigHostPayloadSchema).toBeDefined();
    expect(ConfigIosPayloadSchema).toBeDefined();
    expect(ExecIosPayloadSchema).toBeDefined();
  });
});
