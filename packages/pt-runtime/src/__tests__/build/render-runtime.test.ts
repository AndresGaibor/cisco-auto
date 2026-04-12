import { expect, test, describe } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRuntime } from "../../build/render-runtime";

describe("buildRuntime", () => {
  test("genera runtime desde handlers tipados", async () => {
    const dir = mkdtempSync(join(tmpdir(), "pt-runtime-"));
    const outputPath = join(dir, "runtime.js");

    await buildRuntime({
      inputDir: "./packages/pt-runtime/src",
      outputPath,
    });

    const output = readFileSync(outputPath, "utf-8");
    expect(output).toContain("handleEnsureVlans");
    expect(output).toContain("PT Runtime - Generated from TypeScript handlers");

    rmSync(dir, { recursive: true, force: true });
  });
});
