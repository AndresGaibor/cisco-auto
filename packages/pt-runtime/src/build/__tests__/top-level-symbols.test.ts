import { describe, expect, test } from "bun:test";
import { findDuplicateTopLevelSymbols } from "../top-level-symbols";

describe("findDuplicateTopLevelSymbols", () => {
  test("detects duplicate function and const declarations as fatal", () => {
    const source = `
function errorResult() {}
const errorResult = function() {};
`;

    const duplicates = findDuplicateTopLevelSymbols(source, {
      fileName: "runtime.js",
      allowDuplicateVarDeclarations: true,
    });

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.name).toBe("errorResult");
    expect(duplicates[0]?.fatal).toBe(true);
  });

  test("allows duplicate var declarations when explicitly enabled", () => {
    const source = `
var CABLE_TYPES = {};
var CABLE_TYPES = {};
`;

    const duplicates = findDuplicateTopLevelSymbols(source, {
      fileName: "runtime.js",
      allowDuplicateVarDeclarations: true,
    });

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0]?.name).toBe("CABLE_TYPES");
    expect(duplicates[0]?.fatal).toBe(false);
  });

  test("allows unique top-level symbols", () => {
    const source = `
function okResult() {}
var errorResult = function() {};
class RuntimeResult {}
var deferredResult = function() {};
`;

    expect(
      findDuplicateTopLevelSymbols(source, {
        fileName: "runtime.js",
        allowDuplicateVarDeclarations: true,
      }),
    ).toEqual([]);
  });
});