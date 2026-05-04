import { describe, expect, test, vi } from "bun:test";
import { createDeviceKindResolver } from "./device-kind-resolver.js";

describe("DeviceKindResolver", () => {
  test("clasifica router como ios", async () => {
    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast: async () => ({ type: "router", model: "2911" }),
        inspectDevice: async () => ({ type: "router", model: "2911" }),
      },
    });

    const kind = await resolver.resolveDeviceKind("R1");
    expect(kind).toBe("ios");
  });

  test("clasifica switch como ios", async () => {
    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast: async () => ({ type: "switch", model: "2960" }),
        inspectDevice: async () => ({ type: "switch", model: "2960" }),
      },
    });

    const kind = await resolver.resolveDeviceKind("SW1");
    expect(kind).toBe("ios");
  });

  test("clasifica PC como host", async () => {
    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast: async () => ({ type: "pc", model: "PC-PT" }),
        inspectDevice: async () => ({ type: "pc", model: "PC-PT" }),
      },
    });

    const kind = await resolver.resolveDeviceKind("PC1");
    expect(kind).toBe("host");
  });

  test("clasifica server como host", async () => {
    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast: async () => ({ type: "server", model: "server-pt" }),
        inspectDevice: async () => ({ type: "server", model: "server-pt" }),
      },
    });

    const kind = await resolver.resolveDeviceKind("SRV1");
    expect(kind).toBe("host");
  });

  test("clasifica por modelo cuando type no es claro", async () => {
    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast: async () => ({ type: 0, model: "2811" }),
        inspectDevice: async () => ({ type: 0, model: "2811" }),
      },
    });

    const kind = await resolver.resolveDeviceKind("R1");
    expect(kind).toBe("ios");
  });

  test("clasifica por modelo pc-pt como host", async () => {
    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast: async () => ({ type: "unknown", model: "pc-pt" }),
        inspectDevice: async () => ({ type: "unknown", model: "pc-pt" }),
      },
    });

    const kind = await resolver.resolveDeviceKind("PC1");
    expect(kind).toBe("host");
  });

  test("devuelve unknown si inspectDeviceFast retorna null", async () => {
    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast: async () => null,
        inspectDevice: async () => null,
      },
    });

    const kind = await resolver.resolveDeviceKind("UNKNOWN");
    expect(kind).toBe("unknown");
  });

  test("registra cache hit en timings", async () => {
    const inspectDeviceFast = vi.fn().mockResolvedValue({ type: "pc", model: "PC-PT" });

    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast,
        inspectDevice: async () => ({ type: "pc", model: "PC-PT" }),
      },
      cacheFilePath: undefined,
    });

    const deviceName = "UNIQUE_PC_" + Date.now();

    const timings1: any = {};
    const result1 = await resolver.resolveDeviceKind(deviceName, timings1);
    expect(result1).toBe("host");
    expect(timings1.resolveDeviceKindCacheMiss).toBe(1);
    expect(timings1.inspectDeviceFastMs).toBeGreaterThanOrEqual(0);

    const timings2: any = {};
    const result2 = await resolver.resolveDeviceKind(deviceName, timings2);
    expect(result2).toBe("host");
    expect(timings2.resolveDeviceKindCacheHit).toBe(1);
    expect(inspectDeviceFast).toHaveBeenCalledTimes(1);
  });

  test.skip("throw RUNTIME_NOT_POLLING cuando inspectDeviceFast lanza error con keywords", async () => {
    const controller = {
      inspectDeviceFast: async (_device: string) => {
        throw new Error("ETIMEDOUT runtime_not_polling");
      },
      inspectDevice: async () => null,
    };

    const resolver = createDeviceKindResolver({
      controller,
    });

    let caughtError: any = null;
    try {
      await resolver.resolveDeviceKind("R1");
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.code).toBe("RUNTIME_NOT_POLLING");
  });

  test("clasifica switch_layer3 como ios", async () => {
    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast: async () => ({ type: "switch_layer3", model: "3650-24ps" }),
        inspectDevice: async () => ({ type: "switch_layer3", model: "3650-24ps" }),
      },
    });

    const kind = await resolver.resolveDeviceKind("L3SW1");
    expect(kind).toBe("ios");
  });

  test("clasifica printer como host", async () => {
    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast: async () => ({ type: "printer", model: "printer-pt" }),
        inspectDevice: async () => ({ type: "printer", model: "printer-pt" }),
      },
    });

    const kind = await resolver.resolveDeviceKind("PRINTER1");
    expect(kind).toBe("host");
  });

  test("normaliza device names con trim y lowercase", async () => {
    const inspectDeviceFast = vi.fn().mockResolvedValue({ type: "pc", model: "PC-PT" });

    const resolver = createDeviceKindResolver({
      controller: {
        inspectDeviceFast,
        inspectDevice: async () => ({ type: "pc", model: "PC-PT" }),
      },
    });

    const ts = Date.now();

    await resolver.resolveDeviceKind(`  UNIQUE_A_${ts}  `);
    expect(inspectDeviceFast).toHaveBeenCalledTimes(1);

    await resolver.resolveDeviceKind(`UNIQUE_A_${ts}`);
    expect(inspectDeviceFast).toHaveBeenCalledTimes(1);

    await resolver.resolveDeviceKind(`UNIQUE_B_${ts}`);
    expect(inspectDeviceFast).toHaveBeenCalledTimes(2);
  });
});