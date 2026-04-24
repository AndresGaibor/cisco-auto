import { describe, expect, test } from "bun:test";
import { validatePortExists } from "../../value-objects/hardware-maps.js";

describe("validatePortExists", () => {
  test("acepta FastEthernet0 en PC-PT aunque el mapa esté vacío", () => {
    const result = validatePortExists("PC-PT", "FastEthernet0");

    expect(result.valid).toBe(true);
    expect(result.connector).toBe("rj45");
  });
});
