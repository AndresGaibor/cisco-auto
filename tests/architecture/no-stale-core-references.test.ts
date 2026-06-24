import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const SCRIPT = resolve(PROJECT_ROOT, "scripts/check-stale-core-references.ts");

describe("stale @cisco-auto/core references", () => {
  test("active docs and code do not reference removed core package", () => {
    const result = spawnSync("bun", [SCRIPT], {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    expect(result.status, result.stdout + result.stderr).toBe(0);
  }, 30_000);
});
