import { describe, expect, test } from "bun:test";

import { getAllRuntimeFiles, validateRuntimeManifestDependencies } from "../../build/runtime-manifest";
import { validateMainManifestDependencies } from "../../build/main-manifest";

describe("manifest dependency validator", () => {
  test("detecta imports faltantes en main manifest", () => {
    const sourceFiles = new Map<string, string>([
      ["pt/kernel/main.ts", 'import { foo } from "./missing"; export function main() { foo(); }'],
    ]);

    expect(validateMainManifestDependencies(sourceFiles)).toContain("pt/kernel/missing.ts");
  });

  test("detecta imports faltantes en runtime manifest", () => {
    const sourceFiles = new Map<string, string>([
      ["primitives/module/index.ts", 'import { foo } from "../../templates/missing-module-map.js"; export const bar = foo;'],
    ]);

    expect(validateRuntimeManifestDependencies(sourceFiles)).toContain("templates/missing-module-map.ts");
  });

  test("runtime manifest incluye el mapa de módulos generado y excluye hardware-maps node-only", () => {
    const files = getAllRuntimeFiles();

    expect(files).toContain("templates/generated-module-map.ts");
    expect(files).not.toContain("value-objects/hardware-maps.ts");
  });
});
