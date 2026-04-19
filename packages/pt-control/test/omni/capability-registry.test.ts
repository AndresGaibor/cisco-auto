import { describe, test, expect } from "bun:test";
import {
  getCapability,
  listCapabilities,
  filterCapabilities,
  capabilityExists,
} from "../../src/omni/capability-registry.js";

describe("capability-registry", () => {
  test("getCapability retorna capability por id", () => {
    const cap = getCapability("device.add");
    expect(cap).not.toBeNull();
    expect(cap?.id).toBe("device.add");
  });

  test("getCapability retorna undefined para id inexistente", () => {
    const cap = getCapability("inexistente");
    expect(cap).toBeUndefined();
  });

  test("capabilityExists detecta id existente", () => {
    expect(capabilityExists("device.add")).toBe(true);
  });

  test("capabilityExists detecta id inexistente", () => {
    expect(capabilityExists("inexistente")).toBe(false);
  });

  test("listCapabilities retorna todas las capabilities", () => {
    const caps = listCapabilities();
    expect(caps.length).toBeGreaterThan(10);
  });

  test("filterCapabilities filtra por domain", () => {
    const caps = filterCapabilities({ domain: "device" });
    expect(caps.length).toBeGreaterThan(0);
    for (const cap of caps) {
      expect(cap.domain).toBe("device");
    }
  });

  test("filterCapabilities filtra por kind", () => {
    const caps = filterCapabilities({ kind: "primitive" });
    expect(caps.length).toBeGreaterThan(0);
    for (const cap of caps) {
      expect(cap.kind).toBe("primitive");
    }
  });

  test("filterCapabilities filtra por risk", () => {
    const caps = filterCapabilities({ risk: "safe" });
    expect(caps.length).toBeGreaterThan(0);
    for (const cap of caps) {
      expect(cap.risk).toBe("safe");
    }
  });

  test("capability tiene fields obligatorios", () => {
    const cap = getCapability("device.add");
    expect(cap).toHaveProperty("id");
    expect(cap).toHaveProperty("title");
    expect(cap).toHaveProperty("domain");
    expect(cap).toHaveProperty("kind");
    expect(cap).toHaveProperty("risk");
    expect(cap).toHaveProperty("description");
    expect(cap).toHaveProperty("prerequisites");
    expect(cap).toHaveProperty("supportPolicy");
  });
});

describe("omni hacks", () => {
  test("existen capabilities omni", () => {
    expect(capabilityExists("omni.evaluate.raw")).toBe(true);
    expect(capabilityExists("omni.assessment.read")).toBe(true);
    expect(capabilityExists("omni.process.inspect")).toBe(true);
    expect(capabilityExists("omni.globalscope.inspect")).toBe(true);
    expect(capabilityExists("omni.environment.probe")).toBe(true);
  });

  test("omni hacks tienen risk dangerous o experimental", () => {
    const caps = filterCapabilities({ domain: "evaluate" });
    for (const cap of caps) {
      expect(["dangerous", "experimental"]).toContain(cap.risk);
    }
  });
});

describe("workflows", () => {
  test("existen workflow capabilities", () => {
    expect(capabilityExists("workflow.vlan.simple")).toBe(true);
    expect(capabilityExists("workflow.trunk.simple")).toBe(true);
    expect(capabilityExists("workflow.router-on-stick")).toBe(true);
    expect(capabilityExists("workflow.dhcp.diagnosis")).toBe(true);
  });

  test("workflows tienen kind workflow", () => {
    const vlan = getCapability("workflow.vlan.simple");
    expect(vlan?.kind).toBe("workflow");
  });
});