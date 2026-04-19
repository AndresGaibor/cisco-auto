import { describe, it, expect } from "bun:test";
import { validatePtSafe, validateMainJs, validateRuntimeJs } from "../runtime-validator";

describe("runtime-validator", () => {
  describe("validateMainJs", () => {
    it("falla si falta function main()", () => {
      const result = validateMainJs("function cleanUp() {} createKernel({});");
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("main()"))).toBe(true);
    });

    it("falla si falta function cleanUp()", () => {
      const result = validateMainJs("function main() {} createKernel({});");
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("cleanUp()"))).toBe(true);
    });

    it("falla con const", () => {
      const code = "const x = 1; function main() {} function cleanUp() {} createKernel({});";
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("const is not PT-safe");
    });

    it("falla con let", () => {
      const code = "let x = 1; function main() {} function cleanUp() {} createKernel({});";
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("let is not PT-safe");
    });

    it("falla con require()", () => {
      const code = "const fs = require('fs'); function main() {} function cleanUp() {} createKernel({});";
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("require() is not PT-safe");
    });

    it("falla con import", () => {
      const code = "import { x } from 'y'; function main() {} function cleanUp() {} createKernel({});";
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("ES modules are not PT-safe");
    });

    it("falla con globalThis", () => {
      const code = "globalThis.x = 1; function main() {} function cleanUp() {} createKernel({});";
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("globalThis is not PT-safe");
    });

    it("falla con module", () => {
      const code = "module.exports = {}; function main() {} function cleanUp() {} createKernel({});";
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("module is not PT-safe");
    });

    it("falla con exports", () => {
      const code = "exports.x = 1; function main() {} function cleanUp() {} createKernel({});";
      const result = validateMainJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("exports is not PT-safe");
    });

    it("pasa con código PT-safe válido", () => {
      const code = `
        function main() {
          var x = 1;
          return x;
        }
        function cleanUp() {}
        createKernel({});
      `;
      const result = validateMainJs(code);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("validateRuntimeJs", () => {
    it("falla si falta runtimeDispatcher", () => {
      const result = validateRuntimeJs("function _ptDispatch() {} handleConfigIos();");
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("runtimeDispatcher"))).toBe(true);
    });

    it("falla con async", () => {
      const code = "async function x() {} function runtimeDispatcher() {} function _ptDispatch() {} handleConfigIos();";
      const result = validateRuntimeJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("async/await is not PT-safe");
    });

    it("falla con await", () => {
      const code = "await x; function runtimeDispatcher() {} function _ptDispatch() {} handleConfigIos();";
      const result = validateRuntimeJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("async/await is not PT-safe");
    });

    it("falla con arrow function", () => {
      const code = "var f = () => {}; function runtimeDispatcher() {} function _ptDispatch() {} handleConfigIos();";
      const result = validateRuntimeJs(code);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("arrow functions are not PT-safe");
    });

    it("pasa con código runtime PT-safe válido", () => {
      const code = `
        function runtimeDispatcher(payload, api) {
          return { ok: false };
        }
        function _ptDispatch(payload, api) {
          return runtimeDispatcher(payload, api);
        }
      `;
      const result = validateRuntimeJs(code);
      expect(result.ok).toBe(true);
    });
  });

  describe("formatValidationErrors", () => {
    it("solo warnings no marcan como failed", () => {
      const code = "var m = new Map(); function main() {} function cleanUp() {} createKernel({});";
      const result = validateMainJs(code);
      expect(result.ok).toBe(true);
    });
  });
});