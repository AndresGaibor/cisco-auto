import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("pt-runtime public API boundary", () => {
  test("index.ts does not use export *", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../src/index.ts"),
      "utf8",
    );

    const exportStarMatches = source.match(/export \* from/g);
    expect(
      exportStarMatches,
      "No debe haber export * en el index.ts",
    ).toBeNull();
  });

  test("index.ts does not re-export internal modules via export *", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../src/index.ts"),
      "utf8",
    );

    const forbiddenPatterns = [
      'export * from "./pt/',
      'export * from "./handlers/',
      'export * from "./domain/',
      'export * from "./core/',
      'export * from "./utils/',
      'export * from "./value-objects/',
      'export * from "./runtime/',
      'export * from "./build/"',
    ];

    const offenders = forbiddenPatterns.filter((pattern) =>
      source.includes(pattern),
    );
    expect(offenders).toEqual([]);
  });

  test("pt-compatibility exports are explicit (no export *)", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../src/contracts/pt-compatibility.ts"),
      "utf8",
    );

    const exportStarMatches = source.match(/export \* from/g);
    expect(
      exportStarMatches,
      "pt-compatibility no debe usar export *",
    ).toBeNull();
  });
});

describe("pt-runtime imports from pt-control", () => {
  test("pt-runtime index does not import from @cisco-auto/pt-control", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../src/index.ts"),
      "utf8",
    );

    const hasWrongImport = source.includes("@cisco-auto/pt-control");
    expect(
      hasWrongImport,
      "pt-runtime no debe importar de pt-control (violación de arquitectura)",
    ).toBe(false);
  });

  test("pt-runtime index does not import from @cisco-auto/file-bridge", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../src/index.ts"),
      "utf8",
    );

    const hasWrongImport = source.includes("@cisco-auto/file-bridge");
    expect(
      hasWrongImport,
      "pt-runtime no debe importar de file-bridge (violación de arquitectura)",
    ).toBe(false);
  });
});