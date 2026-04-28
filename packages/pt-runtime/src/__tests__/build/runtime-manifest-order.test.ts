import { describe, expect, test } from "bun:test";
import { getAllRuntimeFiles } from "../../build/runtime-manifest";

function indexOfFile(files: string[], file: string): number {
  const index = files.indexOf(file);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe("runtime manifest execution order", () => {
  test("primitive registry is loaded before primitive modules with top-level registerPrimitive calls", () => {
    const files = getAllRuntimeFiles();

    const registryIndex = indexOfFile(files, "primitives/primitive-registry.ts");
    const modulePrimitiveIndex = indexOfFile(files, "primitives/module/index.ts");

    expect(registryIndex).toBeLessThan(modulePrimitiveIndex);
  });

  test("generated module map is loaded before module primitive implementation", () => {
    const files = getAllRuntimeFiles();

    const generatedMapIndex = indexOfFile(files, "templates/generated-module-map.ts");
    const modulePrimitiveIndex = indexOfFile(files, "primitives/module/index.ts");

    expect(generatedMapIndex).toBeLessThan(modulePrimitiveIndex);
  });

  test("terminal plan handler is loaded before stable handler registration", () => {
    const files = getAllRuntimeFiles();

    const terminalPlanIndex = indexOfFile(files, "handlers/terminal-plan-run.ts");
    const stableRegistrationIndex = indexOfFile(files, "handlers/registration/stable-handlers.ts");

    expect(terminalPlanIndex).toBeLessThan(stableRegistrationIndex);
  });

  test("runtime manifest incluye el handler de listLinks", () => {
    const files = getAllRuntimeFiles();

    expect(files).toContain("handlers/list-links.ts");
  });
});
