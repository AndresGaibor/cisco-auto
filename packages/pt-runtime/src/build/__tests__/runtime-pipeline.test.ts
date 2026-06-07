import { describe, expect, test } from "bun:test";
import { ZodError } from "zod";

import { renderRuntimeV2Pipeline } from "../pipelines/runtime-pipeline";

describe("renderRuntimeV2Pipeline", () => {
  test("con srcDir='src' y outputPath='' devuelve string con markers de contrato", () => {
    const codigo = renderRuntimeV2Pipeline({
      srcDir: "src",
      outputPath: "",
    });

    expect(typeof codigo).toBe("string");
    expect(codigo).toContain("_ptDispatch");
    expect(codigo).toContain("runtimeDispatcher");
    expect(codigo).toContain("var __values = function");
    expect(codigo).toContain("var __read = function");
  });

  test("si input no es objeto, lanza error de zod", () => {
    expect(() => renderRuntimeV2Pipeline("no soy objeto")).toThrow(ZodError);
    expect(() => renderRuntimeV2Pipeline(123)).toThrow(ZodError);
    expect(() => renderRuntimeV2Pipeline(null)).toThrow(ZodError);
  });

  test("si srcDir viene vacío, lanza error de zod", () => {
    expect(() =>
      renderRuntimeV2Pipeline({
        srcDir: "",
        outputPath: "",
      }),
    ).toThrow(ZodError);
  });

  test("el output NO contiene createKernel(", () => {
    const codigo = renderRuntimeV2Pipeline({
      srcDir: "src",
      outputPath: "",
    });

    expect(codigo).not.toContain("createKernel(");
  });
});
