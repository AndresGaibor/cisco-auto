import { describe, expect, test } from "bun:test";
import {
  MockPTBridge,
  crearMockBridgeState,
  crearMockBridgeParaTests,
  ejecutarPasoE2EConMock,
} from "../e2e/mock-pt-bridge.js";

describe("MockPTBridge", () => {
  test("crearMockBridgeState inicializa estado vacío", () => {
    const state = crearMockBridgeState();
    expect(state.devices.size).toBe(0);
    expect(state.links.length).toBe(0);
    expect(state.nextX).toBe(50);
    expect(state.nextY).toBe(50);
  });

  test("addDevice agrega dispositivo al estado", async () => {
    const bridge = new MockPTBridge();
    const device = await bridge.addDevice("R1", "2911", { x: 100, y: 100 });

    expect(device.name).toBe("R1");
    expect(device.model).toBe("2911");
    expect(device.type).toBe("router");
    expect(device.x).toBe(100);
    expect(device.y).toBe(100);
    expect(bridge.getState().devices.size).toBe(1);
  });

  test("addDevice incrementa coordenadas si no se especifican", async () => {
    const bridge = new MockPTBridge();
    await bridge.addDevice("R1", "2911");
    await bridge.addDevice("S1", "2960");

    const state = bridge.getState();
    expect(state.nextX).toBe(150);
    expect(state.nextY).toBe(150);
  });

  test("removeDevice elimina dispositivo y sus links", async () => {
    const bridge = new MockPTBridge();
    await bridge.addDevice("R1", "2911");
    await bridge.addDevice("S1", "2960");
    await bridge.addLink("R1", "Gig0/0", "S1", "Gig0/1");

    await bridge.removeDevice("R1");

    const state = bridge.getState();
    expect(state.devices.has("R1")).toBe(false);
    expect(state.devices.has("S1")).toBe(true);
    expect(state.links.length).toBe(0);
  });

  test("addLink crea enlace entre dispositivos", async () => {
    const bridge = new MockPTBridge();
    await bridge.addDevice("R1", "2911");
    await bridge.addDevice("S1", "2960");

    const link = await bridge.addLink("R1", "Gig0/0", "S1", "Gig0/1");

    expect(link.device1).toBe("R1");
    expect(link.port1).toBe("Gig0/0");
    expect(link.device2).toBe("S1");
    expect(link.port2).toBe("Gig0/1");
    expect(bridge.getState().links.length).toBe(1);
  });

  test("configHost asigna IP a dispositivo", async () => {
    const bridge = new MockPTBridge();
    await bridge.addDevice("PC1", "PC-PT");

    await bridge.configHost("PC1", { ip: "192.168.1.10", mask: "255.255.255.0" });

    const state = bridge.getState();
    const pc = state.devices.get("PC1");
    expect(pc?.ip).toBe("192.168.1.10");
  });

  test("execIos retorna output simulado", async () => {
    const bridge = new MockPTBridge();
    await bridge.addDevice("R1", "2911");

    const result = await bridge.execIos("R1", "enable");

    expect(result.raw).toBe("Router#");
    expect(bridge.getCommandHistory()).toHaveLength(1);
  });

  test("show retorna output simulado para show vlan", async () => {
    const bridge = new MockPTBridge();
    await bridge.addDevice("S1", "2960");

    const result = await bridge.show("S1", "show vlan");

    expect(result.raw).toContain("VLAN Name");
    expect(result.raw).toContain("VLAN0010");
  });

  test("snapshot retorna topología actual", async () => {
    const bridge = new MockPTBridge();
    await bridge.addDevice("R1", "2911");
    await bridge.addDevice("S1", "2960");

    const snapshot = await bridge.snapshot();

    expect(snapshot.devices).toHaveLength(2);
    expect(snapshot.links).toHaveLength(0);
    expect(snapshot.version).toBeDefined();
  });

  test("reset limpia estado e historial", async () => {
    const bridge = new MockPTBridge();
    await bridge.addDevice("R1", "2911");
    await bridge.execIos("R1", "enable");

    bridge.reset();

    expect(bridge.getState().devices.size).toBe(0);
    expect(bridge.getCommandHistory()).toHaveLength(0);
  });

  test("isReady retorna true por defecto", () => {
    const bridge = new MockPTBridge();
    expect(bridge.isReady()).toBe(true);
  });

  test(" MockPTBridge con config ready=false", () => {
    const bridge = new MockPTBridge(undefined, { ready: false });
    expect(bridge.isReady()).toBe(false);
  });
});

describe("crearMockBridgeParaTests", () => {
  test("crea bridge con R1 y S1 pre-configurados", () => {
    const bridge = crearMockBridgeParaTests();
    const state = bridge.getState();

    expect(state.devices.has("R1")).toBe(true);
    expect(state.devices.has("S1")).toBe(true);
    expect(state.devices.get("R1")?.model).toBe("2911");
    expect(state.devices.get("S1")?.model).toBe("2960");
  });
});

describe("ejecutarPasoE2EConMock", () => {
  test("ejecuta paso add-device", async () => {
    const bridge = new MockPTBridge();

    const result = await ejecutarPasoE2EConMock(
      {
        id: "add-r1",
        type: "add-device",
        payload: { name: "R1", model: "2911" },
      },
      bridge
    );

    expect(result.outcome).toBe("passed");
    expect(result.stepId).toBe("add-r1");
    expect(bridge.getState().devices.has("R1")).toBe(true);
  });

  test("ejecuta paso add-link", async () => {
    const bridge = new MockPTBridge();
    await bridge.addDevice("R1", "2911");
    await bridge.addDevice("S1", "2960");

    const result = await ejecutarPasoE2EConMock(
      {
        id: "link-devices",
        type: "add-link",
        payload: { device1: "R1", port1: "Gig0/0", device2: "S1", port2: "Gig0/1" },
      },
      bridge
    );

    expect(result.outcome).toBe("passed");
    expect(bridge.getState().links).toHaveLength(1);
  });

  test("ejecuta paso exec-ios", async () => {
    const bridge = new MockPTBridge();
    await bridge.addDevice("R1", "2911");

    const result = await ejecutarPasoE2EConMock(
      {
        id: "enable",
        type: "exec-ios",
        payload: { device: "R1", command: "enable" },
      },
      bridge
    );

    expect(result.outcome).toBe("passed");
    expect(result.evidence.commandSent).toBe("enable");
    expect(result.evidence.rawOutput).toBe("Router#");
  });

  test("retorna error cuando dispositivo no existe", async () => {
    const bridge = new MockPTBridge();

    const result = await ejecutarPasoE2EConMock(
      {
        id: "config-unknown",
        type: "config-ios",
        payload: { device: "UNKNOWN", commands: ["hostname TEST"] },
      },
      bridge
    );

    expect(result.outcome).toBe("error");
    expect(result.error).toContain("UNKNOWN");
  });

  test("ejecuta paso wait-for", async () => {
    const bridge = new MockPTBridge();
    const start = Date.now();

    const result = await ejecutarPasoE2EConMock(
      {
        id: "wait",
        type: "wait-for",
        payload: { seconds: 0.1 },
      },
      bridge
    );

    expect(result.outcome).toBe("passed");
    expect(Date.now() - start).toBeGreaterThanOrEqual(90);
  });

  test("ejecuta paso snapshot", async () => {
    const bridge = new MockPTBridge();
    await bridge.addDevice("R1", "2911");

    const result = await ejecutarPasoE2EConMock(
      {
        id: "snapshot",
        type: "snapshot",
        payload: { label: "test-snapshot" },
      },
      bridge
    );

    expect(result.outcome).toBe("passed");
    expect(result.evidence.topologySnapshot).toBeDefined();
  });

  test("skip assert step", async () => {
    const bridge = new MockPTBridge();

    const result = await ejecutarPasoE2EConMock(
      {
        id: "assert",
        type: "assert",
        payload: { condition: "true" },
      },
      bridge
    );

    expect(result.outcome).toBe("skipped");
  });
});
