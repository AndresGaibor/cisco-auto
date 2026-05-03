import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cleanWorkspaceOutputs } from "../clean.js";

describe("cleanWorkspaceOutputs", () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), "pt-runtime-clean-"));
    mkdirSync(join(rootDir, "dist"), { recursive: true });
    mkdirSync(join(rootDir, "build"), { recursive: true });
    mkdirSync(join(rootDir, "generated"), { recursive: true });
    writeFileSync(join(rootDir, "dist", "a.txt"), "x");
    writeFileSync(join(rootDir, "build", "b.txt"), "x");
    writeFileSync(join(rootDir, "generated", "c.txt"), "x");
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  test("borra dist, build y generated", () => {
    cleanWorkspaceOutputs(rootDir);

    expect(existsSync(join(rootDir, "dist"))).toBe(false);
    expect(existsSync(join(rootDir, "build"))).toBe(false);
    expect(existsSync(join(rootDir, "generated"))).toBe(false);
  });
});
