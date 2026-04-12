import { expect, test, describe } from "bun:test";
import { transformToPtSafeAst } from "../../build/ast-transform";

describe("transformToPtSafeAst", () => {
  test("convierte TypeScript a JS PT-safe", () => {
    const sourceFiles = new Map<string, string>([
      ["sample.ts", `
        import type { Foo } from "./foo";
        export function demo(value: string): number {
          console.log(value);
          const total: number = 1;
          return total;
        }
      `],
    ]);

    const result = transformToPtSafeAst(sourceFiles);

    expect(result.validation.valid).toBe(true);
    expect(result.code).not.toContain("import type");
    expect(result.code).not.toContain("export function");
    expect(result.code).not.toContain(": string");
    expect(result.code).toContain("dprint(value)");
  });
});
