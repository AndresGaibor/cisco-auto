// packages/pt-runtime/src/__tests__/architecture/build-path-isolation.test.ts
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("build path isolation", () => {
  test("render-main-v2 no depende de src/kernel legacy", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../build/render-main-v2.ts"),
      "utf-8",
    );

    expect(source).not.toContain('from "../kernel/index"');
    expect(source).not.toContain('from "../kernel/bootstrap"');
    expect(source).not.toContain('from "../kernel/runtime-loader"');
  });

  test("render-runtime-v2 no depende de src/kernel legacy", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../build/render-runtime-v2.ts"),
      "utf-8",
    );

    expect(source).not.toContain('from "../kernel/index"');
    expect(source).not.toContain('from "../kernel/bootstrap"');
    expect(source).not.toContain('from "../kernel/runtime-loader"');
  });

  test("render-runtime-v2 no depende de src/ast/ legacy", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../build/render-runtime-v2.ts"),
      "utf-8",
    );

    expect(source).not.toContain('from "../ast/"');
    expect(source).not.toContain('from "../ast/compile-to-module"');
  });

  test("render-main-v2 no depende de src/ast/ legacy", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../build/render-main-v2.ts"),
      "utf-8",
    );

    expect(source).not.toContain('from "../ast/"');
    expect(source).not.toContain('from "../ast/compile-to-module"');
  });

  test("RuntimeGenerator no importa de src/kernel legacy", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../build/runtime-generator.ts"),
      "utf-8",
    );

    expect(source).not.toContain('from "../kernel/index"');
    expect(source).not.toContain('from "../kernel/bootstrap"');
  });
});
