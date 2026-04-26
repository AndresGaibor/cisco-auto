import { describe, expect, test } from "bun:test";
import {
  getRegisteredCommandIds,
  COMMAND_CATALOG,
  listCommands,
  searchCommands,
  filterByTag,
  filterByCapability,
  getCommand,
  validateCatalog,
} from "../src/commands/command-catalog.js";

describe("command-catalog thin CLI", () => {
  test("getRegisteredCommandIds returns array of strings", () => {
    const ids = getRegisteredCommandIds();
    expect(Array.isArray(ids)).toBe(true);
    expect(ids.length).toBeGreaterThan(50);
    expect(ids).toContain("device");
    expect(ids).toContain("build");
  });

  test("re-exports from pt-control/application/command-catalog", () => {
    expect(listCommands).toBeDefined();
    expect(typeof listCommands).toBe("function");
    expect(searchCommands).toBeDefined();
    expect(typeof searchCommands).toBe("function");
    expect(filterByTag).toBeDefined();
    expect(typeof filterByTag).toBe("function");
    expect(filterByCapability).toBeDefined();
    expect(typeof filterByCapability).toBe("function");
    expect(getCommand).toBeDefined();
    expect(typeof getCommand).toBe("function");
    expect(validateCatalog).toBeDefined();
    expect(typeof validateCatalog).toBe("function");
  });

  test("COMMAND_CATALOG is re-exported from pt-control", () => {
    expect(COMMAND_CATALOG).toBeDefined();
    expect(typeof COMMAND_CATALOG).toBe("object");
    expect(COMMAND_CATALOG["device"]).toBeDefined();
    expect(COMMAND_CATALOG["build"]).toBeDefined();
  });

  test("thin CLI is backward compatible - getRegisteredCommandIds matches keys", () => {
    const ids = getRegisteredCommandIds();
    const catalogKeys = Object.keys(COMMAND_CATALOG);
    for (const id of ids) {
      expect(catalogKeys).toContain(id);
    }
  });

  test("thin CLI returns proper CommandCatalogEntry type", () => {
    const cmd = getCommand("help");
    expect(cmd).toBeDefined();
    expect(cmd?.id).toBe("help");
    expect(cmd?.summary).toBeDefined();
    expect(cmd?.status).toBeDefined();
    expect(["stable", "partial", "experimental"]).toContain(cmd!.status);
  });
});