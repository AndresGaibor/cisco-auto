import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { renderMainV2 } from "../../build/render-main-v2";

describe("generated main.js symbols", () => {
  test("define buildCommandResultEnvelope when referenced", () => {
    const source = renderMainV2({
      srcDir: join(process.cwd(), "packages/pt-runtime/src"),
      outputPath: "",
      injectDevDir: "/tmp/pt-dev",
    });

    const references = source.includes("buildCommandResultEnvelope");
    const defines =
      source.includes("function buildCommandResultEnvelope") ||
      source.includes("var buildCommandResultEnvelope") ||
      source.includes("const buildCommandResultEnvelope");

    expect(references).toBe(true);
    expect(defines).toBe(true);
  });
});
