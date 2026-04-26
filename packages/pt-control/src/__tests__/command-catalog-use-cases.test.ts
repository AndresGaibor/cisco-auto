import { describe, expect, test } from "bun:test";
import {
  listCommands,
  searchCommands,
  filterByTag,
  filterByCapability,
  validateCatalog,
  getCommand,
  COMMAND_CATALOG,
} from "../application/command-catalog/index.js";

describe("command-catalog use cases", () => {
  test("listCommands returns all commands", () => {
    const all = listCommands();
    expect(all.length).toBeGreaterThan(50);
    expect(all.find((c) => c.id === "build")).toBeDefined();
    expect(all.find((c) => c.id === "device")).toBeDefined();
    expect(all.find((c) => c.id === "help")).toBeDefined();
  });

  test("searchCommands filters by keyword in summary", () => {
    const results = searchCommands("VLAN");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((c) => c.id === "vlan")).toBe(true);
  });

  test("searchCommands filters by keyword in longDescription", () => {
    const results = searchCommands("Packet Tracer");
    expect(results.length).toBeGreaterThan(0);
  });

  test("filterByTag filters by status (stable)", () => {
    const stable = filterByTag("stable");
    expect(stable.length).toBeGreaterThan(0);
    for (const cmd of stable) {
      expect(cmd.status).toBe("stable");
    }
  });

  test("filterByTag filters by status (experimental)", () => {
    const experimental = filterByTag("experimental");
    for (const cmd of experimental) {
      expect(cmd.status).toBe("experimental");
    }
  });

  test("filterByCapability filters by capability flag", () => {
    const autonomous = filterByCapability("supportsAutonomousUse");
    expect(autonomous.length).toBeGreaterThan(0);
    for (const cmd of autonomous) {
      expect(cmd.supportsAutonomousUse).toBe(true);
    }
  });

  test("getCommand returns correct entry by id", () => {
    const cmd = getCommand("build");
    expect(cmd).toBeDefined();
    expect(cmd!.id).toBe("build");
    expect(cmd!.summary).toContain("Build");
  });

  test("getCommand returns undefined for unknown id", () => {
    const cmd = getCommand("nonexistent-command");
    expect(cmd).toBeUndefined();
  });

  test("validateCatalog returns no errors for valid catalog", () => {
    const errors = validateCatalog();
    expect(errors).toEqual([]);
  });

  test("COMMAND_CATALOG has all expected command ids", () => {
    const expectedIds = [
      "build", "device", "inspect", "layout", "verify", "agent",
      "show", "config-host", "vlan", "etherchannel", "link",
      "config-ios", "routing", "acl", "stp", "services",
      "results", "logs", "help", "history", "doctor", "completion",
      "topology", "status", "setup", "runtime",
    ];
    for (const id of expectedIds) {
      expect(COMMAND_CATALOG[id]).toBeDefined();
    }
  });
});
