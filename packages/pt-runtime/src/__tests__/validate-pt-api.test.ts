import { expect, test, describe } from "bun:test";
import { validatePtApiCalls } from "../build/validate-pt-api.js";

describe("validatePtApiCalls", () => {
  test("acepta llamadas registradas", () => {
    const code = `
      function demo(ipc) {
        var net = ipc.network();
        var device = net.getDevice("R1");
        if (device) {
          device.getName();
        }
      }
    `;

    const result = validatePtApiCalls(code, "demo.ts");

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("rechaza métodos no registrados", () => {
    const code = `
      function demo(ipc) {
        var net = ipc.network();
        net.getDeviceByIndex(0);
      }
    `;

    const result = validatePtApiCalls(code, "demo.ts");

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.method === "getDeviceByIndex")).toBe(true);
  });
});
