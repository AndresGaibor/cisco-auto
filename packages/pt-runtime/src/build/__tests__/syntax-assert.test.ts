import { describe, expect, test } from "bun:test";
import { assertJavaScriptSyntaxOrThrow } from "../syntax-assert";

describe("assertJavaScriptSyntaxOrThrow", () => {
  test("pasa con código JavaScript válido", () => {
    const code = "var x = 1; function f() { return x; }";
    expect(() => assertJavaScriptSyntaxOrThrow("test.js", code)).not.toThrow();
  });

  test("lanza error con código JavaScript inválido", () => {
    const code = "var x = 1; function f() { return x; "; // falta cerrar llave
    expect(() => assertJavaScriptSyntaxOrThrow("test.js", code)).toThrow();
  });

  test("el mensaje de error incluye el nombre del archivo", () => {
    const code = "invalid javascript $$$";
    try {
      assertJavaScriptSyntaxOrThrow("runtime.js", code);
    } catch (e) {
      expect((e as Error).message).toContain("runtime.js");
    }
  });

  test("el mensaje de error incluye el detalle del error de sintaxis", () => {
    const code = "var x = ;";
    try {
      assertJavaScriptSyntaxOrThrow("main.js", code);
    } catch (e) {
      expect((e as Error).message).toContain("syntax");
    }
  });
});
