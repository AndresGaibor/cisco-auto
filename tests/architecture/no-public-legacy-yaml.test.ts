#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

describe("no-public-legacy-yaml", () => {
  test("comandos públicos no pueden importar legacy-yaml", () => {
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
  }, 30_000);
});
