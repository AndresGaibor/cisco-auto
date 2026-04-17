import { expect, test, describe } from "bun:test";
import {
  validateMainJs,
  validateRuntimeJs,
  validateGeneratedArtifacts,
  formatValidationErrors,
} from "../runtime-validator.js";
import {
  validateBalancedSyntax,
  validateMainBootstrapContract,
  validateRuntimeBootstrapContract,
} from "../build/syntax-preflight.js";

describe("PT-safe validation", () => {
  describe("legacy validator", () => {
    test("main valida el contrato V2 actual", () => {
      const code = `
function main() {}
function cleanUp() {}
function createKernel() {}
var COMMANDS_DIR = "";
var IN_FLIGHT_DIR = "";
var RESULTS_DIR = "";
`;

      const result = validateMainJs(code);

      expect(result.ok).toBe(true);
    });

    test("runtime valida el contrato V2 actual", () => {
      const code = `
function runtimeDispatcher() {}
var _ptDispatch = function(payload) { return runtimeDispatcher(payload); };
`;

      const result = validateRuntimeJs(code);

      expect(result.ok).toBe(true);
    });

    test("falla si main omite createKernel", () => {
      const code = `
function main() {}
function cleanUp() {}
var COMMANDS_DIR = "";
`;

      const result = validateMainJs(code);

      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("createKernel("))).toBe(true);
    });
  });

  describe("preflight", () => {
    test("detecta llaves desbalanceadas", () => {
      const result = validateBalancedSyntax(`function main() {`);
      expect(result.valid).toBe(false);
      expect(result.errors[0].category).toBe("syntax-error");
    });

    test("valida el contrato de main.js", () => {
      const result = validateMainBootstrapContract(
        `function main() {}\nfunction cleanUp() {}\nfunction createKernel() {}`,
      );
      expect(result.valid).toBe(true);
    });

    test("valida el contrato de runtime.js", () => {
      const result = validateRuntimeBootstrapContract(
        `var runtimeDispatcher = function() {};\nvar _ptDispatch = function(payload) { return runtimeDispatcher(payload); };`,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("artifacts", () => {
    test("valida un par de artefactos V2", () => {
      const main = `function main() {}\nfunction cleanUp() {}\nfunction createKernel() {}`;
      const runtime = `var runtimeDispatcher = function() {};\nvar _ptDispatch = function(payload) { return runtimeDispatcher(payload); };`;

      const result = validateGeneratedArtifacts(main, runtime);

      expect(result.ok).toBe(true);
    });

    test("formatea errores", () => {
      const report = formatValidationErrors({
        ok: false,
        errors: ["boom"],
        warnings: ["warn"],
      });

      expect(report).toContain("boom");
      expect(report).toContain("warn");
    });
  });
});
