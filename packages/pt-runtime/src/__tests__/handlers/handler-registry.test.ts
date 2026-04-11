import { describe, expect, test } from "bun:test";
import { DeviceHandler } from "../../handlers/device.handler";
import { LinkHandler } from "../../handlers/link.handler";
import type { HandlerDeps } from "../../ports";

const deps = {
  getLW: () => ({}) as any,
  getNet: () => ({ getDevice: () => null, getDeviceCount: () => 0, getDeviceAt: () => null }) as any,
  dprint: () => {},
} as HandlerDeps;

describe("Handler wrappers", () => {
  test("DeviceHandler expone tipos soportados", () => {
    const handler = new DeviceHandler();

    expect(handler.name).toBe("device");
    expect(handler.supportedTypes).toContain("addDevice");
  });

  test("DeviceHandler responde a payload inválido de forma segura", () => {
    const handler = new DeviceHandler();
    const result = handler.execute({ type: "listDevices" }, deps as any);

    expect(result.ok).toBe(true);
  });

  test("LinkHandler expone tipos soportados", () => {
    const handler = new LinkHandler();

    expect(handler.name).toBe("link");
    expect(handler.supportedTypes).toContain("addLink");
  });
});
