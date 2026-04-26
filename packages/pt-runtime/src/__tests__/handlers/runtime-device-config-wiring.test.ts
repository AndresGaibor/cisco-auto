import { describe, expect, test } from "bun:test";

import { getHandler } from "../../handlers/runtime-handlers.js";
import { handleSetDeviceIp, handleSetDefaultGateway } from "../../handlers/device-config.js";
import { handleConfigHost } from "../../handlers/host-handler.js";

describe("runtime device config handler wiring", () => {
  test("setDeviceIp points to handleSetDeviceIp", () => {
    expect(getHandler("setDeviceIp")).toBe(handleSetDeviceIp as never);
    expect(getHandler("setDeviceIp")).not.toBe(handleConfigHost as never);
  });

  test("setDefaultGateway points to handleSetDefaultGateway", () => {
    expect(getHandler("setDefaultGateway")).toBe(handleSetDefaultGateway as never);
  });
});
