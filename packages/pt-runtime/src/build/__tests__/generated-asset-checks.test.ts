// packages/pt-runtime/src/build/__tests__/generated-asset-checks.test.ts
import { describe, it, expect } from "bun:test";
import {
  checkMainAsset,
  checkRuntimeAsset,
  checkCatalogAsset,
  checkAllAssets,
  runAssetValidationPipeline,
  formatAssetCheckResult,
  type AssetCheckResult,
} from "../generated-asset-checks";

const VALID_MAIN_CODE = `
// PT Main — Generated
function main() {
  var devDir = DEV_DIR || "/pt-dev";
  _ptLoadModule(devDir + "/catalog.js", "catalog");
  var kernel = createKernel({ devDir: devDir });
  kernel.boot();
}
function cleanUp() {
  shutdownKernel();
}
var createKernel = function(cfg) { return {}; };
var _ptLoadModule = function(p, l) { return true; };
function shutdownKernel() {}
`;

const VALID_RUNTIME_CODE = `
var _g = this;
function runtimeDispatcher(payload, deps) {
  return { ok: true };
}
_g._ptDispatch = function(payload) {
  return runtimeDispatcher(payload, {});
};
`;

const VALID_CATALOG_CODE = `
var _g = this;
_g.PT_CATALOG = { devices: {} };
_g.PT_DEVICE_TYPES = { router: 0, switch: 1 };
_g.PT_CABLE_TYPES = { auto: -1, straight: 0 };
`;

const INVALID_MAIN_WITH_LOGIC = `
function main() {}
function cleanUp() {}
// Business logic should NOT be in main.js
var handleAddDevice = function() { return {}; };
function handleRemoveDevice() {}
var device = { name: "R1" };
`;

const INVALID_MAIN_WITHOUT_FUNCTIONS = `
// main.js missing required functions
var ipc = null;
`;

const INVALID_RUNTIME_WITH_KERNEL_LIFECYCLE = `
function main() {}
// Kernel lifecycle should NOT be in runtime.js
function createKernel() { return {}; }
function boot() {}
var _ptDispatch = function(p) { return {}; };
`;

const INVALID_CATALOG_WITH_LOGIC = `
var _g = this;
_g.PT_CATALOG = {};
// Executive logic should NOT be in catalog.js
function runtimeDispatcher() { return {}; }
function createPtDepsFromGlobals() { return {}; }
`;

describe("checkMainAsset", () => {
  it("should pass for valid main.js", () => {
    const result = checkMainAsset(VALID_MAIN_CODE);
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail when main.js contains business logic", () => {
    const result = checkMainAsset(INVALID_MAIN_WITH_LOGIC);
    expect(result.passed).toBe(false);
    const noBusinessLogicErrors = result.errors.filter(
      (e: { check: string }) => e.check === "no-business-logic",
    );
    expect(noBusinessLogicErrors.length).toBeGreaterThan(0);
  });

  it("should fail when main.js missing main() and cleanUp()", () => {
    const result = checkMainAsset(INVALID_MAIN_WITHOUT_FUNCTIONS);
    expect(result.passed).toBe(false);
    const hasMainErrors = result.errors.filter(
      (e: { check: string }) => e.check === "has-main-function" || e.check === "has-cleanup-function",
    );
    expect(hasMainErrors.length).toBeGreaterThan(0);
  });
});

describe("checkRuntimeAsset", () => {
  it("should pass for valid runtime.js", () => {
    const result = checkRuntimeAsset(VALID_RUNTIME_CODE);
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail when runtime.js contains kernel lifecycle", () => {
    const result = checkRuntimeAsset(INVALID_RUNTIME_WITH_KERNEL_LIFECYCLE);
    expect(result.passed).toBe(false);
    const kernelErrors = result.errors.filter(
      (e: { check: string }) => e.check === "no-kernel-lifecycle",
    );
    expect(kernelErrors.length).toBeGreaterThan(0);
  });

  it("should fail when runtime.js missing _ptDispatch", () => {
    const code = "var ipc = null; function runtimeDispatcher() {}";
    const result = checkRuntimeAsset(code);
    expect(result.passed).toBe(false);
    const dispatchErrors = result.errors.filter(
      (e: { check: string }) => e.check === "has-dispatch",
    );
    expect(dispatchErrors.length).toBeGreaterThan(0);
  });
});

describe("checkCatalogAsset", () => {
  it("should pass for valid catalog.js", () => {
    const result = checkCatalogAsset(VALID_CATALOG_CODE);
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail when catalog.js contains executive logic", () => {
    const result = checkCatalogAsset(INVALID_CATALOG_WITH_LOGIC);
    expect(result.passed).toBe(false);
    const logicErrors = result.errors.filter(
      (e: { check: string }) => e.check === "no-executive-logic",
    );
    expect(logicErrors.length).toBeGreaterThan(0);
  });

  it("should fail when catalog.js missing PT_CATALOG", () => {
    const code = "var _g = this; _g.PT_DEVICE_TYPES = {};";
    const result = checkCatalogAsset(code);
    expect(result.passed).toBe(false);
    const catalogErrors = result.errors.filter(
      (e: { check: string }) => e.check === "has-pt-catalog",
    );
    expect(catalogErrors.length).toBeGreaterThan(0);
  });
});

describe("checkAllAssets", () => {
  it("should return overall true when all assets pass", () => {
    const result = checkAllAssets({
      main: VALID_MAIN_CODE,
      runtime: VALID_RUNTIME_CODE,
      catalog: VALID_CATALOG_CODE,
    });
    expect(result.overall).toBe(true);
    expect(result.main.passed).toBe(true);
    expect(result.runtime.passed).toBe(true);
    expect(result.catalog.passed).toBe(true);
  });

  it("should return overall false when any asset fails", () => {
    const result = checkAllAssets({
      main: INVALID_MAIN_WITHOUT_FUNCTIONS,
      runtime: VALID_RUNTIME_CODE,
      catalog: VALID_CATALOG_CODE,
    });
    expect(result.overall).toBe(false);
    expect(result.main.passed).toBe(false);
  });
});

describe("runAssetValidationPipeline", () => {
  it("should use custom validators when provided", () => {
    const customMainResult: AssetCheckResult = {
      passed: true,
      errors: [],
      warnings: ["custom warning"],
    };
    const result = runAssetValidationPipeline(
      {
        main: VALID_MAIN_CODE,
        runtime: VALID_RUNTIME_CODE,
        catalog: VALID_CATALOG_CODE,
      },
      {
        main: () => customMainResult,
      },
    );
    expect(result.main.passed).toBe(true);
    expect(result.main.warnings).toContain("custom warning");
  });

  it("should fall back to built-in checks when no custom validator", () => {
    const result = runAssetValidationPipeline({
      main: VALID_MAIN_CODE,
      runtime: VALID_RUNTIME_CODE,
      catalog: VALID_CATALOG_CODE,
    }, {});
    expect(result.overall).toBe(true);
  });
});

describe("formatAssetCheckResult", () => {
  it("should format check result correctly", () => {
    const result: AssetCheckResult = {
      passed: false,
      errors: [
        {
          asset: "main",
          check: "has-main-function",
          message: "main.js must contain function main()",
          severity: "error",
        },
      ],
      warnings: ["some warning"],
    };
    const formatted = formatAssetCheckResult(result, "main.js");
    expect(formatted).toContain("main.js Asset Check");
    expect(formatted).toContain("Passed: false");
    expect(formatted).toContain("has-main-function");
    expect(formatted).toContain("some warning");
  });
});
