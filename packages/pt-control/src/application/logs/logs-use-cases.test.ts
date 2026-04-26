import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { categorizeLogErrorLayer, extractPayloadDevice } from "./categorize.js";
import {
  findRecentLogErrors,
  generateLogBundle,
  inspectCommandLogs,
  listIosLogEntries,
  readLogSession,
  tailLogs,
  type LogBundleWriterPort,
  type LogSessionRepositoryPort,
} from "./logs-use-cases.js";

function makeLogsRoot(): {
  root: string;
  logsDir: string;
  commandLogsDir: string;
  resultsDir: string;
  eventsPath: string;
} {
  const root = mkdtempSync(join(tmpdir(), "pt-logs-"));
  const logsDir = join(root, "logs");
  const commandLogsDir = join(logsDir, "commands");
  const resultsDir = join(root, "results");
  const eventsPath = join(root, "events.ndjson");

  mkdirSync(logsDir, { recursive: true });
  mkdirSync(commandLogsDir, { recursive: true });
  mkdirSync(resultsDir, { recursive: true });

  return { root, logsDir, commandLogsDir, resultsDir, eventsPath };
}

function writeNdjson(path: string, entries: unknown[]): void {
  writeFileSync(path, entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n", "utf-8");
}

describe("logs use cases", () => {
  test("tailLogs reads recent ndjson entries and filters errors", async () => {
    const { logsDir } = makeLogsRoot();

    writeNdjson(join(logsDir, "events-1.ndjson"), [
      {
        timestamp: "2026-04-25T00:00:00.000Z",
        session_id: "s1",
        action: "device.list",
        phase: "start",
      },
      {
        timestamp: "2026-04-25T00:00:01.000Z",
        session_id: "s1",
        action: "device.list",
        phase: "error",
        error: "boom",
      },
    ]);

    const all = await tailLogs({ logsDir, lines: 10 });
    expect(all.ok).toBe(true);
    if (!all.ok) throw new Error(all.error.message);
    expect(all.data.count).toBe(2);

    const errors = await tailLogs({ logsDir, lines: 10, errorsOnly: true });
    expect(errors.ok).toBe(true);
    if (!errors.ok) throw new Error(errors.error.message);
    expect(errors.data.count).toBe(1);
    expect(errors.data.entries[0]?.error).toBe("boom");
  });

  test("readLogSession uses repository port", async () => {
    const repository: LogSessionRepositoryPort = {
      async read(sessionId: string) {
        return [
          {
            timestamp: "2026-04-25T00:00:00.000Z",
            session_id: sessionId,
            action: "host.exec",
          },
        ];
      },
    };

    const result = await readLogSession(repository, { sessionId: "abc" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.count).toBe(1);
    expect(result.data.events[0]?.session_id).toBe("abc");
  });

  test("inspectCommandLogs merges trace, result and bridge events", async () => {
    const { commandLogsDir, resultsDir, eventsPath } = makeLogsRoot();

    writeFileSync(
      join(commandLogsDir, "abc.json"),
      JSON.stringify({ trace: true }),
      "utf-8",
    );

    writeFileSync(
      join(resultsDir, "cmd_abc.json"),
      JSON.stringify({ ok: false, status: "failed" }),
      "utf-8",
    );

    writeNdjson(eventsPath, [
      { command_id: "abc", phase: "start" },
      { command_id: "other", phase: "start" },
    ]);

    const result = await inspectCommandLogs({
      commandId: "abc",
      commandLogsDir,
      resultsDir,
      eventsPath,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.foundAny).toBe(true);
    expect(result.data.trace).toEqual({ trace: true });
    expect(result.data.result).toEqual({ ok: false, status: "failed" });
    expect(result.data.bridgeEvents).toHaveLength(1);
  });

  test("categorizeLogErrorLayer groups common failure causes", () => {
    expect(categorizeLogErrorLayer("bridge.send", "lease expired")).toBe("bridge");
    expect(categorizeLogErrorLayer("pt.runtime", "terminal timeout")).toBe("pt");
    expect(categorizeLogErrorLayer("config.ios", "command rejected")).toBe("ios");
    expect(categorizeLogErrorLayer("verify", "verification failed")).toBe("verification");
    expect(categorizeLogErrorLayer("unknown", "boom")).toBe("other");
  });

  test("findRecentLogErrors extracts and classifies failures", async () => {
    const { logsDir } = makeLogsRoot();

    writeNdjson(join(logsDir, "events-1.ndjson"), [
      {
        timestamp: "2026-04-25T00:00:00.000Z",
        session_id: "s1",
        action: "bridge.queue",
        phase: "failure",
        error: "lease expired",
      },
    ]);

    const result = await findRecentLogErrors({ logsDir, limit: 10 });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.errors).toHaveLength(1);
    expect(result.data.errors[0]?.layer).toBe("bridge");
  });

  test("generateLogBundle uses bundle writer port", async () => {
    const writer: LogBundleWriterPort = {
      async writeBundle(sessionId: string) {
        return `/tmp/${sessionId}.zip`;
      },
      exists() {
        return true;
      },
    };

    const result = await generateLogBundle(writer, { sessionId: "abc" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.bundlePath).toBe("/tmp/abc.zip");
  });

  test("listIosLogEntries extracts IOS-like actions and optional device", async () => {
    const { logsDir } = makeLogsRoot();

    writeNdjson(join(logsDir, "events-1.ndjson"), [
      {
        timestamp: "2026-04-25T00:00:00.000Z",
        session_id: "s1",
        action: "config.ios",
        metadata: {
          payloadPreview: {
            device: "SW1",
          },
        },
      },
      {
        timestamp: "2026-04-25T00:00:01.000Z",
        session_id: "s2",
        action: "device.list",
      },
    ]);

    const result = await listIosLogEntries({
      logsDir,
      device: "SW1",
      limit: 20,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.entries).toHaveLength(1);
    expect(result.data.entries[0]?.device).toBe("SW1");
  });

  test("extractPayloadDevice extracts device from metadata", () => {
    expect(extractPayloadDevice({ metadata: { payloadPreview: { device: "R1" } } })).toBe("R1");
    expect(extractPayloadDevice({})).toBeUndefined();
    expect(extractPayloadDevice({ metadata: null })).toBeUndefined();
  });
});