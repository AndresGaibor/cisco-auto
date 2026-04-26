/**
 * Validate use cases tests
 */

import { describe, it, expect } from "bun:test";
import { validateLab, validateLabUseCase } from "./validate-use-cases";

describe("validate-lab", () => {
  it("validates empty lab as invalid", () => {
    const result = validateLab({
      metadata: { name: "" },
      devices: [],
      connections: [],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("validates lab without name", () => {
    const result = validateLab({
      metadata: {},
      devices: [{ name: "R1", type: "router" }],
      connections: [],
    });
    expect(result.issues.some((i) => i.category === "structure")).toBe(true);
  });

  it("validates duplicate device names", () => {
    const result = validateLab({
      metadata: { name: "TestLab" },
      devices: [
        { name: "R1", type: "router" },
        { name: "R1", type: "router" },
      ],
      connections: [],
    });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        (i) => i.message.includes("duplicado") && i.severity === "error",
      ),
    ).toBe(true);
  });

  it("validates router without interfaces", () => {
    const result = validateLab({
      metadata: { name: "TestLab" },
      devices: [{ name: "R1", type: "router" }],
      connections: [],
    });
    expect(
      result.issues.some(
        (i) => i.category === "physical" && i.severity === "warning",
      ),
    ).toBe(true);
  });

  it("validates connected devices", () => {
    const result = validateLab({
      metadata: { name: "TestLab" },
      devices: [
        { name: "PC1", type: "pc", interfaces: [{ ip: "192.168.1.10" }] },
        { name: "PC2", type: "pc", interfaces: [{ ip: "192.168.1.20" }] },
      ],
      connections: [
        { from: { deviceName: "PC1" }, to: { deviceName: "PC2" } },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("validates connection to non-existent device", () => {
    const result = validateLab({
      metadata: { name: "TestLab" },
      devices: [{ name: "PC1", type: "pc" }],
      connections: [
        { from: { deviceName: "PC1" }, to: { deviceName: "NONEXISTENT" } },
      ],
    });
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        (i) => i.category === "topology" && i.severity === "error",
      ),
    ).toBe(true);
  });

  it("validates PC without IP", () => {
    const result = validateLab({
      metadata: { name: "TestLab" },
      devices: [{ name: "PC1", type: "pc", interfaces: [{ name: "FastEthernet0/0" }] }],
      connections: [],
    });
    expect(
      result.issues.some((i) => i.category === "logical"),
    ).toBe(true);
  });
});

describe("validate-lab-use-case", () => {
  it("returns ok=false on error", () => {
    const result = validateLabUseCase({
      metadata: { name: "" },
      devices: [],
      connections: [],
    });
    expect(result.ok).toBe(false);
  });

  it("returns valid data on success", () => {
    const result = validateLabUseCase({
      metadata: { name: "TestLab" },
      devices: [
        { name: "PC1", type: "pc", interfaces: [{ ip: "192.168.1.10" }] },
      ],
      connections: [],
    });
    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.valid).toBe(true);
  });
});