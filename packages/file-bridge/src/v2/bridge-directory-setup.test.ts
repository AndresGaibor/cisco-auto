import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BridgePathLayout } from "../shared/path-layout.js";
import { ensureBridgeRuntimeDirectories } from "./bridge-directory-setup.js";

describe("ensureBridgeRuntimeDirectories", () => {
  let root: string | null = null;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = null;
  });

  test("crea directorios runtime mínimos del bridge", () => {
    root = mkdtempSync(join(tmpdir(), "pt-bridge-dirs-"));
    const paths = new BridgePathLayout(root);

    ensureBridgeRuntimeDirectories(paths);

    expect(existsSync(paths.commandsDir())).toBe(true);
    expect(existsSync(paths.inFlightDir())).toBe(true);
    expect(existsSync(paths.resultsDir())).toBe(true);
    expect(existsSync(paths.logsDir())).toBe(true);
    expect(existsSync(paths.consumerStateDir())).toBe(true);
    expect(existsSync(paths.deadLetterDir())).toBe(true);
    expect(existsSync(paths.currentEventsFile())).toBe(true);
  });
});