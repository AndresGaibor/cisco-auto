import { describe, expect, test } from "bun:test";
import {
  collectCandidateModuleCodesForSlots,
  filterCatalogEntriesForSlots,
  listCatalogEntries,
  normalizeProbePorts,
  suggestModulesForNeed,
} from "../commands/device/module";

describe("device module helpers", () => {
  test("listCatalogEntries expone catalogo basico", () => {
    const entries = listCatalogEntries();

    expect(entries.map((entry) => entry.code)).toContain("WIC-2T");
    expect(entries.map((entry) => entry.code)).toContain("HWIC-4ESW");
  });

  test("suggestModulesForNeed prioriza modulos ethernet", () => {
    const suggestions = suggestModulesForNeed("ethernet", ["NM-2W", "HWIC-4ESW", "WIC-2T"]);

    expect(suggestions.map((entry) => entry.code)).toEqual(["NM-2W", "HWIC-4ESW"]);
  });

  test("filterCatalogEntriesForSlots conserva solo modulos compatibles", () => {
    const entries = listCatalogEntries();
    const filtered = filterCatalogEntriesForSlots(entries, [
      { index: 1, type: 2, occupied: false, compatibleModules: ["WIC-2T", "HWIC-4ESW"] },
    ]);

    expect(filtered.map((entry) => entry.code)).toEqual(["HWIC-4ESW", "WIC-2T"]);
  });

  test("collectCandidateModuleCodesForSlots usa el catalogo cuando no hay compatibles", () => {
    const entries = listCatalogEntries();

    const codes = collectCandidateModuleCodesForSlots(
      [{}],
      entries,
    );

    expect(codes).toContain("WIC-2T");
    expect(codes).toContain("HWIC-4ESW");
  });

  test("normalizeProbePorts convierte el nombre del puerto a texto", () => {
    const ports = normalizeProbePorts([{ name: 42, link: null } as never]);

    expect(ports).toEqual([{ name: "42", link: null }]);
  });
});
