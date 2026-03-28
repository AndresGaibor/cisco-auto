import { describe, expect, it } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { readEvents, summarizeEvents, tailEvents } from "../src/tools/event-log.js";

describe("Event log parser", () => {
  it("parses NDJSON events and summarizes counts", () => {
    const now = Date.now();
    const lines = [
      JSON.stringify({ type: "init", ts: now }),
      JSON.stringify({ type: "log", ts: now + 1, level: "info", message: "ready" }),
      JSON.stringify({ type: "result", ts: now + 2, id: "abc", ok: true, value: { test: true } }),
    ];

    const filePath = join(tmpdir(), `pt-events-${Math.random().toString(36).slice(2)}.ndjson`);
    writeFileSync(filePath, lines.join("\n"), "utf-8");

    const events = readEvents(filePath);
    expect(events).toHaveLength(3);

    const summary = summarizeEvents(events);
    expect(summary.total).toBe(3);
    expect(summary.counts["init"]).toBe(1);
    expect(summary.counts["log"]).toBe(1);
    expect(summary.counts["result"]).toBe(1);

    const tail = tailEvents(events, 2);
    expect(tail).toHaveLength(2);
    expect(tail[0].type).toBe("log");
    expect(tail[1].type).toBe("result");
  });
});
