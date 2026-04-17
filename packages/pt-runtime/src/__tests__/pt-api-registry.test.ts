import { expect, test, describe } from "bun:test";
import { PT_API_METHOD_INDEX, PT_CABLE_TYPE_CONSTANTS, PT_DEVICE_TYPE_CONSTANTS } from "../pt-api/index.js";

describe("pt-api registry", () => {
  test("expone métodos básicos de la API PT", () => {
    expect(PT_API_METHOD_INDEX["PTIpc"]).toContain("network");
    expect(PT_API_METHOD_INDEX["PTIpc"]).toContain("appWindow");
    expect(PT_API_METHOD_INDEX["PTIpc"]).toContain("systemFileManager");
    expect(PT_API_METHOD_INDEX["PTIpc"]).toContain("simulation");
    expect(PT_API_METHOD_INDEX["PTNetwork"]).toContain("getDevice");
    expect(PT_API_METHOD_INDEX["PTDevice"]).toContain("getCommandLine");
    expect(PT_API_METHOD_INDEX["PTPort"]).toContain("getIpAddress");
  });

  test("expone constantes de tipos de dispositivos y cables", () => {
    expect(PT_DEVICE_TYPE_CONSTANTS.router).toBe(0);
    expect(PT_DEVICE_TYPE_CONSTANTS.multilayerSwitch).toBe(16);
    expect(PT_CABLE_TYPE_CONSTANTS.console).toBe(4);
    expect(PT_CABLE_TYPE_CONSTANTS.usb).toBe(13);
  });
});
