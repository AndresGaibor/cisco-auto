import { describe, expect, test } from "bun:test";

import {
  classifyHistoryRerunnable,
  explainHistory,
  formatHistoryEntryCompact,
  getLastHistory,
  inferHistoryFailureCauses,
  listHistory,
  prepareHistoryRerun,
  showHistory,
  type HistoryEntry,
  type HistoryRepositoryPort,
} from "./history-use-cases.js";

class FakeHistoryRepository implements HistoryRepositoryPort {
  constructor(
    private readonly entries: HistoryEntry[],
    private readonly availableSessions: string[] = [],
  ) {}

  async list(filters?: { limit?: number; failedOnly?: boolean; actionPrefix?: string }) {
    let entries = [...this.entries];

    if (filters?.failedOnly) {
      entries = entries.filter((entry) => entry.status !== "success");
    }

    if (filters?.actionPrefix) {
      entries = entries.filter((entry) => entry.action.startsWith(filters.actionPrefix!));
    }

    if (filters?.limit) {
      entries = entries.slice(0, filters.limit);
    }

    return entries;
  }

  async read(sessionId: string) {
    return this.entries.find((entry) => entry.sessionId === sessionId) ?? null;
  }

  async listAvailableSessions() {
    return this.availableSessions;
  }
}

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    schemaVersion: "1.0",
    sessionId: "sess-1",
    startedAt: "2026-04-25T00:00:00.000Z",
    endedAt: "2026-04-25T00:00:01.000Z",
    durationMs: 1000,
    action: "device.list",
    status: "success",
    ok: true,
    ...overrides,
  };
}

describe("history use cases", () => {
  test("listHistory returns entries and compact rows", async () => {
    const repo = new FakeHistoryRepository([
      makeEntry({ sessionId: "sess-1", action: "device.list" }),
      makeEntry({ sessionId: "sess-2", action: "vlan.apply", status: "error", ok: false }),
    ]);

    const result = await listHistory(repo, { limit: 10 });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.count).toBe(2);
    expect(result.data.rows[0]).toContain("sess-1");
  });

  test("showHistory returns available sessions when not found", async () => {
    const repo = new FakeHistoryRepository([], ["a", "b"]);

    const result = await showHistory(repo, { sessionId: "missing" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.entry).toBeNull();
    expect(result.data.availableSessions).toEqual(["a", "b"]);
  });

  test("getLastHistory returns first repository entry", async () => {
    const repo = new FakeHistoryRepository([
      makeEntry({ sessionId: "latest" }),
      makeEntry({ sessionId: "older" }),
    ]);

    const result = await getLastHistory(repo);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.entry?.sessionId).toBe("latest");
  });

  test("inferHistoryFailureCauses detects bridge, heartbeat, timeout and terminal issues", () => {
    const causes = inferHistoryFailureCauses(
      makeEntry({
        status: "error",
        ok: false,
        contextSummary: { bridgeReady: false },
        warnings: ["heartbeat stale"],
        errorMessage: "timeout waiting for terminal",
      }),
    );

    expect(causes).toContain("Bridge no estaba listo durante la ejecución.");
    expect(causes).toContain("Packet Tracer parecía no estar disponible o no responder.");
    expect(causes).toContain("Se agotó el tiempo de espera del comando.");
    expect(causes).toContain("La terminal del dispositivo no estaba disponible.");
  });

  test("classifyHistoryRerunnable distinguishes read and write actions", () => {
    expect(classifyHistoryRerunnable(makeEntry({ action: "device.list" })).rerunnable).toBe(true);
    expect(classifyHistoryRerunnable(makeEntry({ action: "vlan.apply" })).rerunnable).toBe(false);
  });

  test("explainHistory rejects successful sessions", async () => {
    const repo = new FakeHistoryRepository([makeEntry({ sessionId: "ok", status: "success" })]);

    const result = await explainHistory(repo, { sessionId: "ok" });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error");

    expect(result.error.code).toBe("HISTORY_SESSION_SUCCESS");
  });

  test("explainHistory explains failed sessions", async () => {
    const repo = new FakeHistoryRepository([
      makeEntry({
        sessionId: "bad",
        status: "error",
        ok: false,
        errorMessage: "runtime timeout",
      }),
    ]);

    const result = await explainHistory(repo, { sessionId: "bad" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.causes.length).toBeGreaterThan(0);
    expect(result.data.error).toBe("runtime timeout");
  });

  test("prepareHistoryRerun blocks unsafe actions unless force is used", async () => {
    const repo = new FakeHistoryRepository([
      makeEntry({
        sessionId: "write",
        action: "vlan.apply",
        argv: ["bun", "pt", "vlan", "apply", "--device", "SW1"],
      }),
    ]);

    const blocked = await prepareHistoryRerun(repo, { sessionId: "write" });
    expect(blocked.ok).toBe(false);

    const forced = await prepareHistoryRerun(repo, {
      sessionId: "write",
      force: true,
    });

    expect(forced.ok).toBe(true);
    if (!forced.ok) throw new Error(forced.error.message);

    expect(forced.data.argsToParse).toEqual(["vlan", "apply", "--device", "SW1"]);
  });

  test("formatHistoryEntryCompact normalizes display fields", () => {
    const row = formatHistoryEntryCompact(
      makeEntry({
        sessionId: "abcdef123456",
        action: "device.list",
        durationMs: 1234,
        targetDevice: "Switch1",
      }),
    );

    expect(row).toContain("abcdef12");
    expect(row).toContain("device.list");
    expect(row).toContain("1.2s");
    expect(row).toContain("Switch1");
  });
});