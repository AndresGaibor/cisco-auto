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
    writeFileSync(join(tempRoot, "commands", "000000000002-terminal.plan.run.json.tmp"), "");
    writeFileSync(
      join(tempRoot, "dead-letter", "1777829508773-000000000001-terminal.plan.run.json.31559.1777829508772.2df84d04a9acb.tmp.meta.json"),
      "{}",
    );
    writeFileSync(join(tempRoot, "dead-letter", "1777829508773-000000000001-terminal.plan.run.json.error.json"), "{}");
    writeFileSync(join(tempRoot, "runtime.js"), "terminal-execution-result");
    writeFileSync(join(tempRoot, "heartbeat.json"), JSON.stringify({ timestamp: Date.now() }));

    process.env.PT_DEV_DIR = tempRoot;
    process.env.PT_BRIDGE_ROOT = tempRoot;

    const report = runBridgeDoctor();

    expect(report.queuedCount).toBe(1);
    expect(report.deadLetterCount).toBe(0);
    expect(report.ok).toBe(true);
  });
});
