import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

describe("architecture boundaries", () => {
  test("repository satisfies architecture guardrails", () => {
    const result = spawnSync(
      "bun",
      ["run", "scripts/check-architecture-boundaries.ts"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain("Architecture boundaries OK");
  });
});