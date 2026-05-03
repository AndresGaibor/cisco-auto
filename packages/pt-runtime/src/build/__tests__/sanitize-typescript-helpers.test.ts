import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { sanitizeTypeScriptHelperGlobalThis } from "../sanitize-typescript-helpers";
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
