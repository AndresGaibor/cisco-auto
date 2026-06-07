import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import {
  REQUIRED_TSLIB_HELPERS,
  assertTslibHelpersOrThrow,
  hasAllTslibHelpers,
  sanitizeTypeScriptHelperGlobalThis,
} from "../sanitize-typescript-helpers";
import { renderRuntimeV2Sync } from "../render-runtime-v2";

describe("sanitizeTypeScriptHelperGlobalThis", () => {
  test("preserva el cuerpo de __read", () => {
    const input = `
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
`;

    const output = sanitizeTypeScriptHelperGlobalThis(input);

    expect(output).toContain("var __read = function (o, n) {");
    expect(output).toContain("try {");
    expect(output).toContain("catch (error)");
    expect(output).toContain("return ar;");
    expect(() => new Function(output)).not.toThrow();
  });

  test("preserva el cuerpo de __values", () => {
    const input = `
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError("Object is not iterable.");
};
`;

    const output = sanitizeTypeScriptHelperGlobalThis(input);

    expect(output).toContain("var __values = function(o) {");
    expect(output).toContain("throw new TypeError");
    expect(() => new Function(output)).not.toThrow();
  });
});

describe("sanitizeTypeScriptHelperGlobalThis ownership", () => {
  test("validate-pt-safe no implementa sanitizer peligroso propio", () => {
    const file = readFileSync(
      new URL("../validate-pt-safe.ts", import.meta.url),
      "utf8",
    );

    expect(file).not.toContain(
      'replacement: "var __assign = Object.assign || function',
    );
    expect(file).not.toContain(
      'replacement: "var __awaiter = function',
    );
    expect(file).not.toContain(
      'replacement: "var __generator = function',
    );
    expect(file).not.toContain(
      'replacement: "var __values = function(o) { return o; }',
    );
  });
});

describe("renderRuntimeV2Sync", () => {
  test("incluye el helper __values en runtime.js", () => {
    const code = renderRuntimeV2Sync({
      srcDir: join(process.cwd(), "src"),
      outputPath: "",
      injectDevDir: "/tmp/pt-dev-test",
    });

    expect(code).toContain("var __values = function(");
  });

  test("genera JavaScript válido sin catch huérfano", () => {
    const code = renderRuntimeV2Sync({
      srcDir: join(process.cwd(), "src"),
      outputPath: "",
      injectDevDir: "/tmp/pt-dev-test",
    });

    expect(() => new Function(code)).not.toThrow();
    expect(code).not.toContain("\n    catch (error) { e = { error: error }; }");
  });

  test("usa un fallback literal de /pt-dev", () => {
    const code = renderRuntimeV2Sync({
      srcDir: join(process.cwd(), "src"),
      outputPath: "",
    });

    expect(code).toContain('"/pt-dev"');
    expect(code).not.toContain('DEV_DIR + "/pt-dev"');
  });
});

describe("assertTslibHelpersOrThrow", () => {
  test("no lanza si el code tiene todas las definiciones var", () => {
    const code = [
      "var __assign = function () { return Object.assign; };",
      "var __values = function (o) { return o; };",
      "var __read = function (o, n) { return o; };",
      "var __spreadArray = function (to, from, pack) { return to; };",
      "var __awaiter = function (thisArg, _arguments, P, generator) { return P; };",
      "var __generator = function (thisArg, body) { return body; };",
      "var __rest = function (s, e) { return s; };",
    ].join("\n");

    expect(() => assertTslibHelpersOrThrow("build", code)).not.toThrow();
  });

  test("lanza con mensaje 'missing tslib helper definitions' si falta var __values", () => {
    const code = [
      "var __assign = function () { return Object.assign; };",
      "var __read = function (o, n) { return o; };",
      "var __spreadArray = function (to, from, pack) { return to; };",
      "var __awaiter = function (thisArg, _arguments, P, generator) { return P; };",
      "var __generator = function (thisArg, body) { return body; };",
      "var __rest = function (s, e) { return s; };",
    ].join("\n");

    expect(() => assertTslibHelpersOrThrow("build", code)).toThrow(
      "missing tslib helper definitions",
    );
  });

  test("lanza si faltan dos helpers y los reporta", () => {
    const code = [
      "var __assign = function () { return Object.assign; };",
      "var __values = function (o) { return o; };",
      "var __read = function (o, n) { return o; };",
      "var __spreadArray = function (to, from, pack) { return to; };",
      "var __rest = function (s, e) { return s; };",
    ].join("\n");

    expect(() => assertTslibHelpersOrThrow("build", code)).toThrow(
      "__awaiter, __generator",
    );
  });

  test("hasAllTslibHelpers devuelve { ok: true, missing: [] } con todas las definiciones", () => {
    const code = [
      "var __assign = function () { return Object.assign; };",
      "var __values = function (o) { return o; };",
      "var __read = function (o, n) { return o; };",
      "var __spreadArray = function (to, from, pack) { return to; };",
      "var __awaiter = function (thisArg, _arguments, P, generator) { return P; };",
      "var __generator = function (thisArg, body) { return body; };",
      "var __rest = function (s, e) { return s; };",
    ].join("\n");

    expect(hasAllTslibHelpers(code)).toEqual({ ok: true, missing: [] });
  });

  test("REQUIRED_TSLIB_HELPERS contiene los 7 helpers en orden", () => {
    expect(REQUIRED_TSLIB_HELPERS).toEqual([
      "__assign",
      "__values",
      "__read",
      "__spreadArray",
      "__awaiter",
      "__generator",
      "__rest",
    ]);
  });
});

describe("hasAllTslibHelpers", () => {
  test("code vacío → { ok: false, missing con longitud 7 }", () => {
    const result = hasAllTslibHelpers("");
    expect(result.ok).toBe(false);
    expect(result.missing).toHaveLength(7);
  });

  test("code con solo 'var __values = function' → { ok: false, missing con 6 elementos }", () => {
    const result = hasAllTslibHelpers("var __values = function(o) { return o; }");
    expect(result.ok).toBe(false);
    expect(result.missing).toHaveLength(6);
  });
});
