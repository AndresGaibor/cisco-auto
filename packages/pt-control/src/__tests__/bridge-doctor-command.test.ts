import { describe, expect, test, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBridgeDoctor } from "../commands/bridge-doctor-command.js";

describe("runBridgeDoctor", () => {
  const previousPtDevDir = process.env.PT_DEV_DIR;
  const previousBridgeRoot = process.env.PT_BRIDGE_ROOT;
  let tempRoot = "";

  afterEach(() => {
    process.env.PT_DEV_DIR = previousPtDevDir;
    process.env.PT_BRIDGE_ROOT = previousBridgeRoot;
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true });
      tempRoot = "";
    }
  });

  test("ignora _queue.json al contar la cola", () => {
    tempRoot = mkdtempSync(join(tmpdir(), "pt-dev-"));
    mkdirSync(join(tempRoot, "commands"), { recursive: true });
    mkdirSync(join(tempRoot, "in-flight"), { recursive: true });
    mkdirSync(join(tempRoot, "results"), { recursive: true });
    mkdirSync(join(tempRoot, "dead-letter"), { recursive: true });

    writeFileSync(join(tempRoot, "commands", "cmd_000000018400.json"), "{}");
    writeFileSync(join(tempRoot, "commands", "_queue.json"), "[\"_queue.json\"]");
    writeFileSync(join(tempRoot, "commands", ".DS_Store"), "");
    writeFileSync(join(tempRoot, "commands", "tmp.json.tmp"), "");
    writeFileSync(join(tempRoot, "runtime.js"), "terminal-execution-result");
    writeFileSync(join(tempRoot, "heartbeat.json"), JSON.stringify({ timestamp: Date.now() }));

    process.env.PT_DEV_DIR = tempRoot;
    process.env.PT_BRIDGE_ROOT = tempRoot;

    const report = runBridgeDoctor();

    expect(report.queuedCount).toBe(1);
  });
});
