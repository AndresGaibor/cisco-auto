import { describe, expect, test } from "bun:test";
import { getScenariosForProfile } from "./real-scenario-registry.js";

describe("real-scenario-registry", () => {
  test("interactive-resilience incluye el escenario de recovery IOS", () => {
    const escenarios = getScenariosForProfile("interactive-resilience");

    expect(escenarios.map((escenario) => escenario.id)).toContain("ios-session-recovery");
  });
});
