import { describe, expect, test } from "bun:test";

import { getHandler } from "../../handlers/dispatcher";
import { handleSetDeviceIp, handleSetDefaultGateway } from "../../handlers/device-config";
import { handleConfigHost } from "../../handlers/host-handler";

import "../../handlers/runtime-handlers";

describe("runtime handler wiring", () => {
  test("configHost points to handleConfigHost", () => {
    expect(getHandler("configHost")).toBe(handleConfigHost as never);
  });

  test("setDeviceIp points to handleSetDeviceIp, not handleConfigHost", () => {
    expect(getHandler("setDeviceIp")).toBe(handleSetDeviceIp as never);
    expect(getHandler("setDeviceIp")).not.toBe(handleConfigHost as never);
  });

  test("setDefaultGateway points to handleSetDefaultGateway", () => {
    expect(getHandler("setDefaultGateway")).toBe(handleSetDefaultGateway as never);
  });
});