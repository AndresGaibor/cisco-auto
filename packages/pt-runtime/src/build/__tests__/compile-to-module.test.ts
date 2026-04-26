// packages/pt-runtime/src/build/__tests__/compile-to-module.test.ts
import { describe, it, expect, beforeEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { compileFilesToModule, validateSourceFiles } from "../ast/compile-to-module";

describe("compile-to-module", () => {
  describe("compileFilesToModule", () => {
    it("returns code and validation", () => {
      const result = compileFilesToModule(
        "/tmp",
        ["nonexistent.ts"],
      );

      expect(result).toHaveProperty("code");
      expect(result).toHaveProperty("validation");
    });

    it("returns empty code for nonexistent files", () => {
      const result = compileFilesToModule(
        "/tmp",
        ["nonexistent.ts"],
      );

      // compileFilesToModule doesn't fail on missing files, just warns
      expect(typeof result.code).toBe("string");
    });

    it("returns valid validation result", () => {
      const result = compileFilesToModule(
        "/tmp",
        ["nonexistent.ts"],
      );

      expect(result.validation).toHaveProperty("valid");
      expect(result.validation).toHaveProperty("errors");
      expect(result.validation).toHaveProperty("warnings");
    });

    it("accepts minify option", () => {
      const result = compileFilesToModule(
        "/tmp",
        ["nonexistent.ts"],
        { minify: true },
      );

      expect(result).toHaveProperty("code");
    });
  });

  describe("validateSourceFiles", () => {
    it("returns empty array for no missing deps", () => {
      const sourceFiles = new Map<string, string>();
      sourceFiles.set("test.ts", `export const x = 1;`);
      const manifestFiles = new Set<string>(["test.ts"]);

      const missing = validateSourceFiles(sourceFiles, manifestFiles);
      expect(missing).toHaveLength(0);
    });

    it("detects missing transitive dependencies", () => {
      const sourceFiles = new Map<string, string>();
      sourceFiles.set("main.ts", `import { foo } from "./foo"; export const x = foo;`);
      const manifestFiles = new Set<string>(["main.ts"]);

      const missing = validateSourceFiles(sourceFiles, manifestFiles);
      expect(missing.some(m => m.includes("foo"))).toBe(true);
    });

    it("ignores non-relative imports", () => {
      const sourceFiles = new Map<string, string>();
      sourceFiles.set("main.ts", `import { Something } from "some-package"; export const x = 1;`);
      const manifestFiles = new Set<string>(["main.ts"]);

      const missing = validateSourceFiles(sourceFiles, manifestFiles);
      expect(missing).toHaveLength(0);
    });

    it("returns sorted unique missing files", () => {
      const sourceFiles = new Map<string, string>();
      sourceFiles.set("main.ts", `import { a } from "./a"; import { b } from "./b";`);
      const manifestFiles = new Set<string>(["main.ts"]);

      const missing = validateSourceFiles(sourceFiles, manifestFiles);
      expect(missing).toEqual([...new Set(missing)].sort());
    });
  });
});
