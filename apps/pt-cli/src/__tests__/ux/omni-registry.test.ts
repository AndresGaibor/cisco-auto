import { describe, expect, test } from "bun:test";
import { getRegisteredCommandIds } from "../../commands/command-registry.js";

describe("omni registry", () => {
  test("omni es comando raíz público", () => {
    expect(getRegisteredCommandIds()).toContain("omni");
  });
});
