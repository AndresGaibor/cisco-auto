import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { PTController } from "../src/controller/index.js";

// Basic smoke tests for controller instantiation

describe("CLI commands smoke", () => {
  let testDir: string;
  let controller: PTController;

  beforeEach(() => {
    testDir = join(tmpdir(), `pt-cli-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    controller = new PTController({ devDir: testDir });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("can instantiate controller with custom devDir", () => {
    expect(controller).toBeDefined();
    expect(controller.getBridge()).toBeDefined();
  });

  it("readState returns null in V2 (topology derived from events)", () => {
    // V2 derives topology from events, not a single state file
    const state = controller.readState();
    expect(state).toBeNull();
  });
});
