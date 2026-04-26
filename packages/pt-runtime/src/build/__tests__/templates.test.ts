// packages/pt-runtime/src/build/__tests__/templates.test.ts
import { describe, it, expect } from "bun:test";
import {
  tslibHelpersTemplate,
  kernelIifeTemplate,
  fileLoaderTemplate,
  entryPointsTemplate,
  moduleWrapperTemplate,
  runtimeLoaderTemplate,
} from "../templates";

describe("templates", () => {
  describe("tslibHelpersTemplate", () => {
    it("returns a non-empty string", () => {
      const result = tslibHelpersTemplate();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("contains __assign helper", () => {
      const result = tslibHelpersTemplate();
      expect(result).toContain("var __assign = function()");
    });

    it("contains __values helper", () => {
      const result = tslibHelpersTemplate();
      expect(result).toContain("var __values = function");
    });

    it("contains __read helper", () => {
      const result = tslibHelpersTemplate();
      expect(result).toContain("var __read = function");
    });

    it("contains __spreadArray helper", () => {
      const result = tslibHelpersTemplate();
      expect(result).toContain("var __spreadArray = function");
    });

    it("contains __awaiter helper", () => {
      const result = tslibHelpersTemplate();
      expect(result).toContain("var __awaiter = function");
    });

    it("contains __generator helper", () => {
      const result = tslibHelpersTemplate();
      expect(result).toContain("var __generator = function");
    });

    it("contains __rest helper", () => {
      const result = tslibHelpersTemplate();
      expect(result).toContain("var __rest = function");
    });
  });

  describe("kernelIifeTemplate", () => {
    it("returns a non-empty string", () => {
      const result = kernelIifeTemplate({
        devDirLiteral: '"/pt-dev"',
        tslibHelpers: tslibHelpersTemplate(),
        kernelCode: "/* kernel code */",
      });
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("wraps code in IIFE", () => {
      const result = kernelIifeTemplate({
        devDirLiteral: '"/pt-dev"',
        tslibHelpers: "",
        kernelCode: "",
      });
      expect(result).toContain("(function() {");
      expect(result).toContain("})();");
    });

    it("uses devDirLiteral for DEV_DIR", () => {
      const result = kernelIifeTemplate({
        devDirLiteral: '"/custom-dev-dir"',
        tslibHelpers: "",
        kernelCode: "",
      });
      expect(result).toContain('/custom-dev-dir');
    });

    it("interpolates tslibHelpers parameter into output", () => {
      const helpers = "var __custom = 1;";
      const result = kernelIifeTemplate({
        devDirLiteral: '"/pt-dev"',
        tslibHelpers: helpers,
        kernelCode: "",
      });
      expect(result).toContain(helpers);
    });

    it("interpolates kernelCode parameter into output", () => {
      const kernelCode = "function MY_KERNEL() { return 42; }";
      const result = kernelIifeTemplate({
        devDirLiteral: '"/pt-dev"',
        tslibHelpers: "",
        kernelCode,
      });
      expect(result).toContain(kernelCode);
    });

    it("publishes createKernel on _g", () => {
      const result = kernelIifeTemplate({
        devDirLiteral: '"/pt-dev"',
        tslibHelpers: "",
        kernelCode: "function createKernel() {}",
      });
      expect(result).toContain("_g.createKernel = createKernel");
    });

    it("publishes shutdownKernel on _g", () => {
      const result = kernelIifeTemplate({
        devDirLiteral: '"/pt-dev"',
        tslibHelpers: "",
        kernelCode: "",
      });
      expect(result).toContain("_g.shutdownKernel = function");
    });
  });

  describe("fileLoaderTemplate", () => {
    it("returns a non-empty string", () => {
      const result = fileLoaderTemplate();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("defines _ptLoadModule function", () => {
      const result = fileLoaderTemplate();
      expect(result).toContain("function _ptLoadModule(");
    });

    it("uses _ScriptModule fallback for file access", () => {
      const result = fileLoaderTemplate();
      expect(result).toContain("_ScriptModule");
    });

    it("uses new Function for module loading", () => {
      const result = fileLoaderTemplate();
      expect(result).toContain("new Function(");
    });

    it("passes ipc, fm, dprint, DEV_DIR as globals", () => {
      const result = fileLoaderTemplate();
      expect(result).toContain('"ipc"');
      expect(result).toContain('"fm"');
      expect(result).toContain('"dprint"');
      expect(result).toContain('"DEV_DIR"');
    });
  });

  describe("entryPointsTemplate", () => {
    it("returns a non-empty string", () => {
      const result = entryPointsTemplate({
        devDirLiteral: '"/pt-dev"',
        buildTimestamp: "2024-01-01T00:00:00.000Z",
      });
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("defines main function", () => {
      const result = entryPointsTemplate({
        devDirLiteral: '"/pt-dev"',
        buildTimestamp: "2024-01-01T00:00:00.000Z",
      });
      expect(result).toContain("function main()");
    });

    it("defines cleanUp function", () => {
      const result = entryPointsTemplate({
        devDirLiteral: '"/pt-dev"',
        buildTimestamp: "2024-01-01T00:00:00.000Z",
      });
      expect(result).toContain("function cleanUp()");
    });

    it("loads catalog.js via _ptLoadModule", () => {
      const result = entryPointsTemplate({
        devDirLiteral: '"/pt-dev"',
        buildTimestamp: "2024-01-01T00:00:00.000Z",
      });
      expect(result).toContain('_ptLoadModule(devDir + "/catalog.js"');
    });

    it("calls createKernel with proper config", () => {
      const result = entryPointsTemplate({
        devDirLiteral: '"/pt-dev"',
        buildTimestamp: "2024-01-01T00:00:00.000Z",
      });
      expect(result).toContain("createKernel({");
      expect(result).toContain("devDir:");
      expect(result).toContain("commandsDir:");
      expect(result).toContain("inFlightDir:");
      expect(result).toContain("resultsDir:");
    });

    it("includes buildTimestamp in output", () => {
      const timestamp = "2024-01-01T00:00:00.000Z";
      const result = entryPointsTemplate({
        devDirLiteral: '"/pt-dev"',
        buildTimestamp: timestamp,
      });
      expect(result).toContain(timestamp);
    });
  });

  describe("moduleWrapperTemplate", () => {
    it("returns a non-empty string", () => {
      const result = moduleWrapperTemplate({
        moduleName: "core",
        devDir: "/pt-dev",
        code: "var x = 1;",
      });
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("wraps code in IIFE", () => {
      const result = moduleWrapperTemplate({
        moduleName: "core",
        devDir: "/pt-dev",
        code: "var x = 1;",
      });
      expect(result).toContain("(function() {");
      expect(result).toContain("})();");
    });

    it("includes module name in comment", () => {
      const result = moduleWrapperTemplate({
        moduleName: "my-module",
        devDir: "/pt-dev",
        code: "",
      });
      expect(result).toContain("Module: my-module");
    });

    it("registers module in _RUNTIME_MODULES", () => {
      const result = moduleWrapperTemplate({
        moduleName: "test-module",
        devDir: "/pt-dev",
        code: "",
      });
      expect(result).toContain('_RUNTIME_MODULES["test-module"]');
    });

    it("includes provided code", () => {
      const code = "var MY_CODE = true;";
      const result = moduleWrapperTemplate({
        moduleName: "core",
        devDir: "/pt-dev",
        code,
      });
      expect(result).toContain(code);
    });

    it("uses devDir for default DEV_DIR value", () => {
      const result = moduleWrapperTemplate({
        moduleName: "core",
        devDir: "/custom-dev",
        code: "",
      });
      expect(result).toContain('"/custom-dev"');
    });
  });

  describe("runtimeLoaderTemplate", () => {
    it("returns a non-empty string", () => {
      const result = runtimeLoaderTemplate({
        devDir: "/pt-dev",
        modules: ["runtime/core.js", "runtime/device.js"],
      });
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("wraps code in IIFE", () => {
      const result = runtimeLoaderTemplate({
        devDir: "/pt-dev",
        modules: [],
      });
      expect(result).toContain("(function() {");
      expect(result).toContain("})();");
    });

    it("exposes _runtimeLoader API", () => {
      const result = runtimeLoaderTemplate({
        devDir: "/pt-dev",
        modules: [],
      });
      expect(result).toContain("_g._runtimeLoader = {");
      expect(result).toContain("loadAll:");
      expect(result).toContain("reloadChanged:");
    });

    it("includes module paths in loadAllModules", () => {
      const modules = ["runtime/core.js", "runtime/device.js"];
      const result = runtimeLoaderTemplate({
        devDir: "/pt-dev",
        modules,
      });
      expect(result).toContain('"runtime/core.js"');
      expect(result).toContain('"runtime/device.js"');
    });

    it("has checkModuleChanged function", () => {
      const result = runtimeLoaderTemplate({
        devDir: "/pt-dev",
        modules: [],
      });
      expect(result).toContain("function checkModuleChanged(");
    });

    it("has reloadChangedModules function", () => {
      const result = runtimeLoaderTemplate({
        devDir: "/pt-dev",
        modules: [],
      });
      expect(result).toContain("function reloadChangedModules(");
    });

    it("auto-loads modules on startup", () => {
      const result = runtimeLoaderTemplate({
        devDir: "/pt-dev",
        modules: [],
      });
      expect(result).toContain("loadAllModules();");
    });
  });
});
