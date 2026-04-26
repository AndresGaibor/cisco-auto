import { describe, expect, it } from "bun:test";
import {
  listCommands,
  searchCommands,
  filterByTag,
  filterByCapability,
  validateCatalog,
  getCommand,
} from "./command-catalog-use-cases";

describe("command-catalog-use-cases", () => {
  it("exporta listCommands como función", () => {
    expect(typeof listCommands).toBe("function");
  });

  it("exporta searchCommands como función", () => {
    expect(typeof searchCommands).toBe("function");
  });

  it("exporta filterByTag como función", () => {
    expect(typeof filterByTag).toBe("function");
  });

  it("exporta filterByCapability como función", () => {
    expect(typeof filterByCapability).toBe("function");
  });

  it("exporta validateCatalog como función", () => {
    expect(typeof validateCatalog).toBe("function");
  });

  it("exporta getCommand como función", () => {
    expect(typeof getCommand).toBe("function");
  });

  it("listCommands retorna un array", () => {
    const result = listCommands();
    expect(Array.isArray(result)).toBe(true);
  });

  it("validateCatalog retorna array de errores (vacío si el catalog es válido)", () => {
    const errors = validateCatalog();
    expect(Array.isArray(errors)).toBe(true);
  });
});
