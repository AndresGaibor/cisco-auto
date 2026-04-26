// ============================================================================
// Architecture Test: capability-registry.ts line count
// ============================================================================

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("architecture: capability-registry.ts", () => {
  test("capability-registry.ts is under 50 lines", () => {
    const filePath = join(
      process.cwd(),
      "packages/pt-control/src/omni/capability-registry.ts"
    );
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    expect(lines.length).toBeLessThan(50);
  });
});