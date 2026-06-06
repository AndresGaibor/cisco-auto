import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileBridgeV2 } from "../src/file-bridge-v2.js";

describe("Queue index", () => {
  test("sendCommand registra el filename en el AppendOnlyQueueIndex (NDJSON)", async () => {
    const root = mkdtempSync(join(tmpdir(), "queue-index-"));
    try {
      const bridge = new FileBridgeV2({ root });
      bridge.start();

      const envelope = bridge.sendCommand("listDevices", { filter: undefined });
      const queuePath = join(root, "commands", "_queue.ndjson");
      const content = readFileSync(queuePath, "utf8");
      const entries = content
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line) => JSON.parse(line));

      expect(envelope.id).toBeTruthy();
      expect(entries).toContain(`${String(envelope.seq).padStart(12, "0")}-listDevices.json`);
      await bridge.stop();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
