import { expect, test, describe } from "bun:test";
import { renderRuntimeFromHandlers } from "../../build/render-from-handlers";
import { validatePtSafe } from "../../build/validate-pt-safe";

describe("renderRuntimeFromHandlers", () => {
  test("genera runtime PT-safe con handlers nuevos", () => {
    const output = renderRuntimeFromHandlers({
      handlersDir: "./packages/pt-runtime/src",
      outputPath: "",
    });

    expect(output).toContain("handleEnsureVlans");
    expect(output).toContain("handleConfigDhcpServer");
    expect(validatePtSafe(output).valid).toBe(true);
  });
});
