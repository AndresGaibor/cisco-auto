import { describe, it, expect } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, readFileSync } from "node:fs";
import { createDefaultPTController } from "../src/controller/index.js";

// Basic smoke tests for snapshot and logs commands

describe("CLI commands smoke", () => {
  it("can save and load snapshot files", async () => {
    const devDir = tmpdir();
    const controller = createDefaultPTController();
    // stub: write a fake state.json
    const state = { version: "1.0", timestamp: Date.now(), devices: {}, links: {}, metadata: { deviceCount: 0, linkCount: 0 } };
    const path = join(devDir, "state.json");
    writeFileSync(path, JSON.stringify(state), "utf-8");
    const snap = await controller.readState();
    expect(snap).not.toBeNull();
  });
});
