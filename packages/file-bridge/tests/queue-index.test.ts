import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileBridgeV2 } from "../src/file-bridge-v2.js";

describe("Queue index", () => {
  test("sendCommand registra el filename en _queue.json", () => {
    const root = mkdtempSync(join(tmpdir(), "queue-index-"));
    try {
      const bridge = new FileBridgeV2({ root });

      const envelope = bridge.sendCommand("listDevices", { filter: undefined });
      const queuePath = join(root, "commands", "_queue.json");
      const queue = JSON.parse(readFileSync(queuePath, "utf8"));

      expect(envelope.id).toBeTruthy();
      expect(Array.isArray(queue)).toBe(true);
      expect(queue).toContain(`${String(envelope.seq).padStart(12, "0")}-listDevices.json`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
