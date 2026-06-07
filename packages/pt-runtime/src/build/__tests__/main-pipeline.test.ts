// packages/pt-runtime/src/build/__tests__/main-pipeline.test.ts
import { describe, expect, test } from "bun:test";
import { ZodError } from "zod";

import { renderMainV2Pipeline } from "../pipelines/main-pipeline";

describe("renderMainV2Pipeline", () => {
  test("genera main.js con todos los marcadores del contrato del main", () => {
    const result = renderMainV2Pipeline({
      srcDir: "src",
      outputPath: "",
    });

    expect(typeof result).toBe("string");
    expect(result).toContain("function main()");
    expect(result).toContain("function cleanUp()");
    expect(result).toContain("createKernel(");
    expect(result).toContain("_ptLoadModule");
    expect(result).toContain("var __values = function");
  });

  test("lanza ZodError cuando el input no es un objeto", () => {
    expect(() => renderMainV2Pipeline("no soy un objeto")).toThrow(ZodError);
  });

  test("lanza ZodError cuando srcDir viene vacío", () => {
    expect(() =>
      renderMainV2Pipeline({
        srcDir: "",
        outputPath: "",
      }),
    ).toThrow(ZodError);
  });

  test("el output NO contiene 'runtimeDispatcher(' (contrato del main)", () => {
    const result = renderMainV2Pipeline({
      srcDir: "src",
      outputPath: "",
    });

    expect(result).not.toContain("runtimeDispatcher(");
  });
});
