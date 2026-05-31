import { describe, it, expect } from "bun:test";
import { toCollabSnapshot } from "../pt/pt-controller-snapshot-adapter.js";
import type { TopologySnapshot } from "../detector/change-detector.js";

describe("toCollabSnapshot", () => {
  it("convierte snapshot de pt-control sin deviceConfigs", () => {
    const raw = {
      version: "1.0",
      timestamp: 1234567890,
      devices: {
        R1: { name: "Router1", model: "2911", x: 100, y: 200 },
        SW1: { name: "Switch1", model: "2960", x: 300, y: 400 },
      },
      links: {
        link1: { id: "link1", device1: "R1", port1: "g0/0", device2: "SW1", port2: "g0/1" },
      },
      metadata: { createdBy: "test" },
    };

    const result = toCollabSnapshot(raw);

    expect(result.devices["R1"]).toEqual({
      name: "Router1",
      model: "2911",
      x: 100,
      y: 200,
      displayName: undefined,
    });
    expect(result.devices["SW1"]).toEqual({
      name: "Switch1",
      model: "2960",
      x: 300,
      y: 400,
    });
    expect(result.links["link1"]).toEqual({
      id: "link1",
      device1: "R1",
      port1: "g0/0",
      device2: "SW1",
      port2: "g0/1",
    });
    expect(result.deviceConfigs).toEqual({});
    expect(result.timestamp).toBe(1234567890);
  });

  it("devuelve snapshot vacío para null/undefined", () => {
    const result = toCollabSnapshot(null as unknown as unknown);
    expect(result.devices).toEqual({});
    expect(result.links).toEqual({});
    expect(result.deviceConfigs).toEqual({});

    const result2 = toCollabSnapshot(undefined as unknown as unknown);
    expect(result2.devices).toEqual({});
  });

  it("devuelve snapshot vacío para objeto vacío", () => {
    const result = toCollabSnapshot({});
    expect(result.devices).toEqual({});
    expect(result.links).toEqual({});
  });

  it("ignora dispositivos/links que no son objetos", () => {
    const raw = {
      devices: { R1: null, SW1: "invalid" },
      links: { link1: { id: "link1", device1: "R1", port1: "g0/0", device2: "SW1", port2: "g0/1" } },
    };

    const result = toCollabSnapshot(raw);

    expect(result.links["link1"]).toBeDefined();
  });

  it("asigna nombre desde key cuando device.name es ausente", () => {
    const raw = {
      devices: {
        Router1: { model: "2911" },
      },
      links: {},
    };

    const result = toCollabSnapshot(raw);
    expect(result.devices["Router1"]?.name).toBe("Router1");
  });

  it("asigna modelo 'unknown' cuando falta", () => {
    const raw = {
      devices: { R1: { name: "R1" } },
      links: {},
    };

    const result = toCollabSnapshot(raw);
    expect(result.devices["R1"]?.model).toBe("unknown");
  });

  it("parsea coordenadas string como números", () => {
    const raw = {
      devices: {
        R1: { name: "R1", model: "2911", x: "479", y: "55" },
        SW1: { name: "Switch1", model: "2960", x: "300", y: "400" },
      },
      links: {},
    };

    const result = toCollabSnapshot(raw);
    expect(result.devices["R1"]?.x).toBe(479);
    expect(result.devices["R1"]?.y).toBe(55);
    expect(result.devices["SW1"]?.x).toBe(300);
  });

  it("preserva coordenadas x/y para detectar movimiento", () => {
    const raw = {
      timestamp: 1,
      devices: {
        Router0: { name: "Router0", model: "ISR4321", x: 479, y: 55 },
        PC0: { name: "PC0", model: "PC-PT", x: 597, y: 39 },
      },
      links: {},
    };

    const result = toCollabSnapshot(raw);
    expect(result.devices["Router0"]?.x).toBe(479);
    expect(result.devices["Router0"]?.y).toBe(55);
    expect(result.devices["PC0"]?.x).toBe(597);
    expect(result.devices["PC0"]?.y).toBe(39);
  });
});