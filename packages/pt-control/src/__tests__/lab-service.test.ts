import { describe, expect, test } from "bun:test";
import { LabService, type LabScenario } from "../application/services/lab-service.js";

function createBridge() {
  const commands: Array<{ type: string; payload: unknown }> = [];
  return {
    commands,
    sendCommandAndWait: async (type: string, payload: unknown) => {
      commands.push({ type, payload });
      if (type === "inspect")
        return {
          ok: true,
          value: {
            name: "R1",
            model: "2911",
            type: "router",
            power: true,
            ports: [],
            uuid: "uuid-123",
          },
        };
      return { ok: true, value: null };
    },
  } as any;
}

function createCache() {
  return {
    getSnapshot: () => ({ version: "1.0", timestamp: Date.now(), devices: {}, links: {} }),
    getDevice: () => undefined,
  } as any;
}

function createDeviceService() {
  return {
    inspect: async (name: string, _includeXml?: boolean) => {
      return { name, model: "2911", type: "router", power: true, ports: [], uuid: "uuid-123" };
    },
  } as any;
}

function createIosService() {
  return {
    execIos: async () => ({ raw: "output" }),
    configIos: async () => ({
      executed: true,
      device: "R1",
      commands: [],
      results: [],
      evidence: { source: "terminal" },
    }),
  } as any;
}

function createTopologyService() {
  return {
    addDevice: async () => ({ name: "R1", model: "2911", type: "router", power: true, ports: [] }),
    removeDevice: async () => {},
  } as any;
}

function createPrimitivePort() {
  return {
    runPrimitive: async (id: string, payload: unknown) => {
      if (id === "device.inspect") {
        return { ok: true, value: { xml: "<device></device>" } };
      }
      return { ok: false, error: "Unknown primitive" };
    },
  } as any;
}

describe("LabService", () => {
  test("runScenario ejecuta setup → action → verify → cleanup", async () => {
    const bridge = createBridge();
    const primitivePort = createPrimitivePort();
    const cache = createCache();
    const deviceService = createDeviceService();
    const iosService = createIosService();
    const topologyService = createTopologyService();

    const labService = new LabService(bridge, primitivePort, cache, deviceService, iosService, topologyService);

    const ordenInvocacion: string[] = [];

    const escenario: LabScenario = {
      id: "test-1",
      name: "Test Scenario",
      description: "Scenario for testing",
      setup: async () => {
        ordenInvocacion.push("setup");
      },
      action: async () => {
        ordenInvocacion.push("action");
      },
      verify: async () => {
        ordenInvocacion.push("verify");
        return {
          ok: true,
          scenarioId: "test-1",
          checks: [],
          evidence: {},
          errors: [],
          durationMs: 10,
        };
      },
      cleanup: async () => {
        ordenInvocacion.push("cleanup");
      },
    };

    const resultado = await labService.runScenario(escenario);

    expect(resultado.scenarioId).toBe("test-1");
    expect(resultado.ok).toBe(true);
    expect(ordenInvocacion).toEqual(["setup", "action", "verify", "cleanup"]);
  });

  test("cleanup se ejecuta aunque verify falle", async () => {
    const bridge = createBridge();
    const primitivePort = createPrimitivePort();
    const cache = createCache();
    const deviceService = createDeviceService();
    const iosService = createIosService();
    const topologyService = createTopologyService();

    const labService = new LabService(bridge, primitivePort, cache, deviceService, iosService, topologyService);

    let cleanupEjecutada = false;

    const escenario: LabScenario = {
      id: "test-2",
      name: "Test Cleanup",
      description: "Testing cleanup runs even on verify failure",
      setup: async () => {},
      action: async () => {},
      verify: async () => {
        throw new Error("Verification failed");
      },
      cleanup: async () => {
        cleanupEjecutada = true;
      },
    };

    const resultado = await labService.runScenario(escenario);

    expect(cleanupEjecutada).toBe(true);
    expect(resultado.ok).toBe(false);
    expect(resultado.errors).toContain("Verification failed");
  });

  test("inspectDeviceXml retorna null si device no existe", async () => {
    const bridge = createBridge();
    const primitivePort = createPrimitivePort();
    const cache = createCache();
    const deviceService = createDeviceService();
    const iosService = createIosService();
    const topologyService = createTopologyService();

    const deviceServiceMock = {
      inspect: async () => ({
        name: "Inexistente",
        model: "2911",
        type: "router",
        power: true,
        ports: [],
      }),
    };

    const labService = new LabService(
      bridge,
      primitivePort,
      cache,
      deviceServiceMock as any,
      iosService,
      topologyService,
    );

    const resultado = await labService.inspectDeviceXml("Inexistente");

    expect(resultado).toBeNull();
  });

  test("runScenario captura errores de setup y action", async () => {
    const bridge = createBridge();
    const primitivePort = createPrimitivePort();
    const cache = createCache();
    const deviceService = createDeviceService();
    const iosService = createIosService();
    const topologyService = createTopologyService();

    const labService = new LabService(bridge, primitivePort, cache, deviceService, iosService, topologyService);

    const escenario: LabScenario = {
      id: "test-3",
      name: "Test Error",
      description: "Testing error capture",
      setup: async () => {
        throw new Error("Setup failed");
      },
      action: async () => {},
      verify: async () => ({
        ok: true,
        scenarioId: "test-3",
        checks: [],
        evidence: {},
        errors: [],
        durationMs: 5,
      }),
      cleanup: async () => {},
    };

    const resultado = await labService.runScenario(escenario);

    expect(resultado.ok).toBe(false);
    expect(resultado.errors).toContain("Setup failed");
  });

  test("getSnapshot retorna snapshot del cache", async () => {
    const bridge = createBridge();
    const primitivePort = createPrimitivePort();
    const cache = createCache();
    const deviceService = createDeviceService();
    const iosService = createIosService();
    const topologyService = createTopologyService();

    const labService = new LabService(bridge, primitivePort, cache, deviceService, iosService, topologyService);

    const snapshot = await labService.getSnapshot();

    expect(snapshot).toBeDefined();
    expect(snapshot.version).toBe("1.0");
  });
});
