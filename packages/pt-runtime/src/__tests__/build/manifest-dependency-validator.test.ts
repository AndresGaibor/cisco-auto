import { describe, expect, test } from "bun:test";

import { validateMainManifestDependencies } from "../../build/main-manifest";
import { validateRuntimeManifestDependencies } from "../../build/runtime-manifest";

describe("manifest dependency validator", () => {
  test("detecta imports faltantes en main manifest", () => {
    const sourceFiles = new Map<string, string>([
      ["pt/kernel/main.ts", 'import { foo } from "./missing"; export function main() { foo(); }'],
    ]);

    expect(validateMainManifestDependencies(sourceFiles)).toContain("pt/kernel/missing.ts");
  });

  test("detecta imports faltantes en runtime manifest", () => {
    const sourceFiles = new Map<string, string>([
      ["handlers/runtime-handlers.ts", 'import { foo } from "./missing"; export const bar = foo;'],
    ]);

    expect(validateRuntimeManifestDependencies(sourceFiles)).toContain("handlers/missing.ts");
  });
});
