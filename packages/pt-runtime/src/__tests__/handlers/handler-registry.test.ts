import { describe, expect, test } from "bun:test";
import { handleAddLink } from "../../handlers/add-link";
import type { HandlerDeps } from "../../ports";

const deps = {
  getLW: () => ({}) as any,
  getNet: () =>
    ({ getDevice: () => null, getDeviceCount: () => 0, getDeviceAt: () => null }) as any,
  dprint: () => {},
} as any;

describe("Link handlers", () => {
  test("handleAddLink retorna error cuando device1 no existe", () => {
    const result = handleAddLink(
      { type: "addLink", device1: "NonExistent", port1: "Gig0/0", device2: "R2", port2: "Gig0/0" },
      deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok && "code" in result) {
      expect(result.code).toBe("DEVICE_NOT_FOUND");
    }
  });
});
