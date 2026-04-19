import { describe, test, expect } from "bun:test";
import {
  getSuite,
  listSuites,
  getSuiteCapabilities,
  filterSuitesByRisk,
} from "../../src/omni/capability-suites.js";

describe("capability-suites", () => {
  test("getSuite retorna suite por id", () => {
    const suite = getSuite("device-basic");
    expect(suite).not.toBeNull();
    expect(suite?.id).toBe("device-basic");
  });

  test("getSuite retorna undefined para id inexistente", () => {
    const suite = getSuite("inexistente");
    expect(suite).toBeUndefined();
  });

  test("listSuites retorna todas las suites", () => {
    const suites = listSuites();
    expect(suites.length).toBeGreaterThan(5);
  });

  test("getSuiteCapabilities retorna capability ids", () => {
    const capIds = getSuiteCapabilities("device-basic");
    expect(capIds.length).toBeGreaterThan(0);
  });

  test("filterSuitesByRisk filtra por risk", () => {
    const suites = filterSuitesByRisk("safe");
    expect(suites.length).toBeGreaterThan(0);
    for (const suite of suites) {
      expect(suite.risk).toBe("safe");
    }
  });

  test("suite tiene fields obligatorios", () => {
    const suite = getSuite("device-basic");
    expect(suite).toHaveProperty("id");
    expect(suite).toHaveProperty("title");
    expect(suite).toHaveProperty("description");
    expect(suite).toHaveProperty("capabilityIds");
    expect(suite).toHaveProperty("estimatedDurationMs");
    expect(suite).toHaveProperty("risk");
  });
});

describe("suites predefinidas", () => {
  test("existe regression-smoke suite", () => {
    const suite = getSuite("regression-smoke");
    expect(suite).not.toBeNull();
    expect(suite?.capabilityIds).toContain("device.add");
  });

  test("existe terminal-core suite", () => {
    const suite = getSuite("terminal-core");
    expect(suite).not.toBeNull();
  });

  test("existe omni-hacks suite", () => {
    const suite = getSuite("omni-hacks");
    expect(suite).not.toBeNull();
  });
});