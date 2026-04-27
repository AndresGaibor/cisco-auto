import { describe, expect, test } from "bun:test";

import { getHandler } from "../../handlers/dispatcher";
import { handleSetDeviceIp, handleSetDefaultGateway } from "../../handlers/device-config";
import { handleConfigHost } from "../../handlers/host-handler";

import "../../handlers/runtime-handlers";

describe("runtime handler wiring", () => {
  test("configHost points to handleConfigHost", () => {
    expect(getHandler("configHost")).toBe(handleConfigHost as never);
  });

  test("runtime-handlers expone HANDLER_MAP en global", () => {
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
});
