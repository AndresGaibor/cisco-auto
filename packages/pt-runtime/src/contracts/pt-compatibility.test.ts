import { describe, expect, test } from "bun:test";
import {
  assertCatalogHealth,
  assertCatalogLoaded,
  getContractSummary,
  PT_DEVICE_TYPE_ID,
  PT_CABLE_TYPE_ID,
  validatePTModel,
  validatePortExists,
  validateModuleExists,
  validateModuleSlotCompatible,
} from "./pt-compatibility.js";

describe("PT Compatibility Contract", () => {
  describe("getContractSummary", () => {
    test("retorna resumen del catálogo con version", () => {
      const summary = getContractSummary();
      expect(summary.version).toBe("1.0");
      expect(summary.models).toBeGreaterThan(0);
      expect(typeof summary.portMapPopulated).toBe("boolean");
      expect(typeof summary.moduleCatalogPopulated).toBe("boolean");
    });
  });

  describe("assertCatalogHealth", () => {
    test("catálogo tiene modelos válidos", () => {
      const health = assertCatalogHealth();
      expect(health.errors.length).toBe(0);
      expect(health.modelCount).toBeGreaterThan(0);
    });
  });

  describe("assertCatalogLoaded", () => {
    test("no lanza si el catálogo está poblado", () => {
      expect(() => assertCatalogLoaded()).not.toThrow();
    });
  });

  describe("PT_DEVICE_TYPE_ID", () => {
    test("tiene constantes canónicas", () => {
      expect(PT_DEVICE_TYPE_ID.router).toBe(0);
      expect(PT_DEVICE_TYPE_ID.switch).toBe(1);
      expect(PT_DEVICE_TYPE_ID.pc).toBe(8);
      expect(PT_DEVICE_TYPE_ID.server).toBe(9);
    });
  });

  describe("PT_CABLE_TYPE_ID", () => {
    test("tiene constantes canónicas", () => {
      expect(PT_CABLE_TYPE_ID.straight).toBe(0);
      expect(PT_CABLE_TYPE_ID.cross).toBe(1);
      expect(PT_CABLE_TYPE_ID.auto).toBe(-1);
    });
  });

  describe("validatePTModel", () => {
    test("acepta modelo válido", () => {
      expect(validatePTModel("2911")).toBe("2911");
      expect(validatePTModel("2960")).toBe("2960-24TT");
      expect(validatePTModel("PC-PT")).toBe("PC-PT");
    });

    test("lanza para modelo inválido", () => {
      expect(() => validatePTModel("MODEL-INVALID-XYZ")).toThrow();
    });

    test("lanza para modelo no-creable", () => {
      expect(() => validatePTModel("Power Distribution Device")).toThrow();
    });
  });
});
