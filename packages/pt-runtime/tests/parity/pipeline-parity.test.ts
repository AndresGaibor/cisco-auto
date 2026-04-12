import { expect, test, describe } from "bun:test";
import { join } from "node:path";
import { RuntimeGenerator } from "../../src/index.js";
import { renderRuntimeFromHandlers } from "../../src/build/render-from-handlers.js";
import { validatePtSafe } from "../../src/build/validate-pt-safe.js";

describe("pipeline parity", () => {
  test("nuevo renderer produce runtime PT-safe con handlers nuevos", () => {
    const output = renderRuntimeFromHandlers({
      handlersDir: join(__dirname, "../../src"),
      outputPath: "",
    });

    expect(validatePtSafe(output).valid).toBe(true);
    expect(output).toContain("handleEnsureVlans");
    expect(output).toContain("handleConfigDhcpServer");
    expect(output).toContain("handleInspectHost");
  });

  test("legacy generator sigue generando runtime", async () => {
    const generator = new RuntimeGenerator({
      outputDir: "/tmp/pt-parity",
      devDir: "/tmp/pt-dev-parity",
    });

    const runtime = generator.generateRuntime();
    expect(runtime.length).toBeGreaterThan(0);
    expect(runtime).toContain("handleConfigIos");
  });
});
