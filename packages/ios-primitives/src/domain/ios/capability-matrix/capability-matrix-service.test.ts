import { describe, expect, test } from "bun:test";
import { createCapabilityMatrixService } from "./capability-matrix-service.js";

describe("CapabilityMatrixService", () => {
  test("lookupCapability recomienda IOS para rutas estáticas en router", () => {
    const service = createCapabilityMatrixService();
    service.registerDeviceModel("R1", "2911");

    const capability = service.lookupCapability("R1", "static-route");

    expect(capability.supported).toBe(true);
    expect(capability.surface).toBe("ios");
    expect(capability.recommendedSurface).toBe("ios");
    expect(capability.reason).toBeUndefined();
  });

  test("lookupCapability explica cuando una operación no está soportada", () => {
    const service = createCapabilityMatrixService();
    service.registerDeviceModel("SW1", "2960-24TC-L");

    const capability = service.lookupCapability("SW1", "static-route");

    expect(capability.supported).toBe(false);
    expect(capability.surface).toBe("ios");
    expect(capability.recommendedSurface).toBeUndefined();
    expect(capability.reason).toContain("routing");
  });
});
