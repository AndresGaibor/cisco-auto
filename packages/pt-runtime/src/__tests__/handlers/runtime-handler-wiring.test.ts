import { describe, expect, test } from "bun:test";

import { getHandler, registerRuntimeHandlers } from "../../handlers/runtime-handlers";
import { handleSetDeviceIp, handleSetDefaultGateway } from "../../handlers/device-config";
import { handleConfigHost } from "../../handlers/host-handler";

describe("runtime handler wiring", () => {
  test("configHost points to handleConfigHost", () => {
    expect(getHandler("configHost")).toBe(handleConfigHost as never);
  });

  test("runtime-handlers expose HANDLER_MAP in global", () => {
    const scope = globalThis as Record<string, unknown>;

    expect(scope.HANDLER_MAP).toBeDefined();
    expect(Object.keys(scope.HANDLER_MAP as Record<string, unknown>)).toContain("addModule");
  });

  test("setDeviceIp points to handleSetDeviceIp, not handleConfigHost", () => {
    expect(getHandler("setDeviceIp")).toBe(handleSetDeviceIp as never);
    expect(getHandler("setDeviceIp")).not.toBe(handleConfigHost as never);
  });

  test("setDefaultGateway points to handleSetDefaultGateway", () => {
    expect(getHandler("setDefaultGateway")).toBe(handleSetDefaultGateway as never);
  });

  test("omni.evaluate.raw is available when experimental handlers are enabled", () => {
    registerRuntimeHandlers({ experimental: true });

    expect(getHandler("omni.evaluate.raw")).toBeDefined();
    expect(getHandler("__evaluate")).toBeDefined();
    expect(getHandler("omni.raw")).toBeDefined();
  });
});