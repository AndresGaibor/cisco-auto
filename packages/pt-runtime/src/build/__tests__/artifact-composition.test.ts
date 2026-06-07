import { describe, expect, test } from "bun:test";
import {
  CatalogArtifact,
  type CatalogArtifactInput,
} from "../artifacts/catalog-artifact";
import {
  MainArtifact,
  type MainArtifactInput,
} from "../artifacts/main-artifact";
import {
  RuntimeArtifact,
  type RuntimeArtifactInput,
} from "../artifacts/runtime-artifact";
import {
  TslibHelperBundle,
  countOccurrences,
} from "../artifacts/tslib-helper-bundle";

describe("TslibHelperBundle", () => {
  test("countOccurrences cuenta 0, 1 y 2 ocurrencias", () => {
    expect(countOccurrences("abc", "x")).toBe(0);
    expect(countOccurrences("abc", "a")).toBe(1);
    expect(countOccurrences("ababab", "ab")).toBe(3);
    expect(countOccurrences("var __values = function\nvar __values = function", "var __values = function")).toBe(2);
  });

  test("compose() retorna el template de helpers de tslib", () => {
    const bundle = TslibHelperBundle.compose();
    expect(bundle).toContain("var __values = function");
    expect(bundle).toContain("var __read = function");
  });
});

describe("MainArtifact", () => {
  const validInput: MainArtifactInput = {
    header: "// header main.js\n",
    kernelIife: "function createKernel() { return {}; }\n",
    fileLoader: "function _ptLoadModule(name) { return null; }\n",
    entryPoints: "function main() {}\nfunction cleanUp() {}\n",
  };

  test("compose produce un output que pasa assertContract", () => {
    const code = MainArtifact.compose(validInput);
    MainArtifact.assertContract(code);
    expect(code).toContain("function main()");
    expect(code).toContain("function cleanUp()");
    expect(code).toContain("createKernel(");
    expect(code).toContain("_ptLoadModule");
  });

  test("compose respeta el orden header + tslib + kernelIife + fileLoader + entryPoints", () => {
    const code = MainArtifact.compose(validInput);
    const headerIdx = code.indexOf("// header main.js");
    const tslibIdx = code.indexOf("var __values = function");
    const kernelIdx = code.indexOf("function createKernel()");
    const loaderIdx = code.indexOf("function _ptLoadModule(name)");
    const entryIdx = code.indexOf("function main()");
    expect(headerIdx).toBeGreaterThanOrEqual(0);
    expect(tslibIdx).toBeGreaterThan(headerIdx);
    expect(kernelIdx).toBeGreaterThan(tslibIdx);
    expect(loaderIdx).toBeGreaterThan(kernelIdx);
    expect(entryIdx).toBeGreaterThan(loaderIdx);
  });

  test("assertContract rechaza si falta 'function main()'", () => {
    const code = MainArtifact.compose({
      ...validInput,
      entryPoints: "function cleanUp() {}\n",
    });
    expect(() => MainArtifact.assertContract(code)).toThrow("main.js missing function main()");
  });

  test("assertContract rechaza si hay 'runtimeDispatcher('", () => {
    const code = `${MainArtifact.compose(validInput)}\nruntimeDispatcher(payload);`;
    expect(() => MainArtifact.assertContract(code)).toThrow("main.js must not include runtime dispatcher");
  });
});

describe("RuntimeArtifact", () => {
  const validInput: RuntimeArtifactInput = {
    bootstrap: "function _ptDispatch(payload) { return null; }\n",
    code: "function runtimeDispatcher(payload, api) { return null; }\n// stub",
  };

  test("compose produce un output que pasa assertContract", () => {
    const code = RuntimeArtifact.compose(validInput);
    RuntimeArtifact.assertContract(code);
    expect(code).toContain("_ptDispatch");
    expect(code).toContain("runtimeDispatcher");
  });

  test("assertContract rechaza si falta 'var __values = function'", () => {
    const codeWithoutTslib = "function _ptDispatch() {}\nfunction runtimeDispatcher() {}\n";
    expect(() => RuntimeArtifact.assertContract(codeWithoutTslib)).toThrow("runtime.js missing __values helper");
  });

  test("assertContract rechaza si tiene 'createKernel('", () => {
    const code = `${RuntimeArtifact.compose(validInput)}\ncreateKernel(config);`;
    expect(() => RuntimeArtifact.assertContract(code)).toThrow("runtime.js must not include kernel lifecycle");
  });

  test("assertContract rechaza duplicados de tslib helpers", () => {
    const duplicated = `${TslibHelperBundle.compose()}\n${TslibHelperBundle.compose()}\n${validInput.bootstrap}\n${validInput.code}`;
    expect(() => RuntimeArtifact.assertContract(duplicated)).toThrow("runtime.js has duplicate tslib helpers");
  });
});

describe("CatalogArtifact", () => {
  test("compose con PT_CATALOG pasa assertContract", () => {
    const input: CatalogArtifactInput = {
      constants: "var PT_CATALOG = { device: 0 };\n",
    };
    const code = CatalogArtifact.compose(input);
    CatalogArtifact.assertContract(code);
    expect(code).toContain("PT_CATALOG");
  });

  test("compose sin header usa el header por defecto", () => {
    const code = CatalogArtifact.compose({ constants: "var PT_CATALOG = {};\n" });
    expect(code.startsWith("// Catalog - constantes estáticas de PT\n")).toBe(true);
  });

  test("assertContract rechaza si tiene 'createKernel('", () => {
    const code = "// Catalog\nvar PT_CATALOG = {};\ncreateKernel(config);";
    expect(() => CatalogArtifact.assertContract(code)).toThrow("catalog.js must not include kernel lifecycle");
  });
});
