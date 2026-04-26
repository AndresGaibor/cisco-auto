import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

describe("stale @cisco-auto/core references", () => {
  test("active docs and code do not reference removed core package", () => {
    const result = spawnSync("bun", ["run", "scripts/check-stale-core-references.ts"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain("No active @cisco-auto/core");
  });
});
