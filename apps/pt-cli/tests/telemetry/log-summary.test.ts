import { describe, expect, test } from "bun:test";
import {
  summarizeEvent,
  summarizeEvents,
  truncate,
  renderSessionBlock,
} from "../../src/telemetry/log-summary.js";
import type { SessionLogEvent } from "../../src/telemetry/session-log-store.js";

function makeEvent(overrides: Partial<SessionLogEvent> = {}): SessionLogEvent {
  return {
    session_id: "s-test-001",
    correlation_id: "c-test-001",
    timestamp: "2025-01-01T12:00:00.000Z",
    phase: "start",
    action: "test.action",
    metadata: undefined,
    ...overrides,
  };
}

describe("truncate", () => {
  test("returns empty string for empty input", () => {
    expect(truncate("", 10)).toBe("");
  });

  test("returns original if within max", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  test("truncates and adds ellipsis", () => {
    expect(truncate("hello world", 8)).toBe("hello w…");
  });

  test("handles exact length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("summarizeEvent", () => {
  test("basic event with no metadata", () => {
    const evt = makeEvent();
    const sum = summarizeEvent(evt);
    expect(sum.sessionId).toBe("s-test-001");
    expect(sum.correlationId).toBe("c-test-001");
    expect(sum.phase).toBe("start");
    expect(sum.action).toBe("test.action");
    expect(sum.icon).toBe("🔵");
    expect(sum.ok).toBeNull();
  });

  test("ok=true phase=end", () => {
    const evt = makeEvent({ phase: "end", metadata: { ok: true } });
    const sum = summarizeEvent(evt);
    expect(sum.icon).toBe("🟢");
    expect(sum.ok).toBe(true);
  });

  test("ok=false phase=end", () => {
    const evt = makeEvent({ phase: "end", metadata: { ok: false } });
    const sum = summarizeEvent(evt);
    expect(sum.icon).toBe("🔴");
    expect(sum.ok).toBe(false);
  });

  test("error phase", () => {
    const evt = makeEvent({ phase: "error" });
    const sum = summarizeEvent(evt);
    expect(sum.icon).toBe("🔴");
  });

  test("payloadPreview extracted in resumen", () => {
    const evt = makeEvent({
      metadata: {
        payloadPreview: { device: "Router1", action: "config" },
      },
    });
    const sum = summarizeEvent(evt);
    expect(sum.resumen).toContain("device=Router1");
    expect(sum.resumen).toContain("action=config");
  });

  test("contextSummary extracted in resumen", () => {
    const evt = makeEvent({
      metadata: {
        contextSummary: { deviceCount: 3, linkCount: 2, bridgeReady: true },
      },
    });
    const sum = summarizeEvent(evt);
    expect(sum.resumen).toContain("devices:3");
    expect(sum.resumen).toContain("links:2");
    expect(sum.resumen).toContain("bridge:up");
  });

  test("preview includes ok and durationMs", () => {
    const evt = makeEvent({
      metadata: { ok: true, durationMs: 150 },
    });
    const sum = summarizeEvent(evt);
    expect(sum.preview).toContain("ok=true");
    expect(sum.preview).toContain("150ms");
  });

  test("preview truncates long interactionSummary", () => {
    const long =
      "this is a very long interaction summary that should be truncated because it exceeds eighty characters in the preview";
    const evt = makeEvent({ metadata: { interactionSummary: long } });
    const sum = summarizeEvent(evt);
    expect(sum.preview.length).toBeLessThanOrEqual(90);
    expect(sum.preview).toContain("…");
  });

  test("detalle contains full metadata", () => {
    const evt = makeEvent({
      metadata: { deviceCount: 5, customField: "test" },
    });
    const sum = summarizeEvent(evt);
    expect(sum.detalle).toContain("deviceCount");
    expect(sum.detalle).toContain("customField");
  });

  test("detalle falls back to JSON for event without metadata", () => {
    const evt = makeEvent({ metadata: undefined });
    const sum = summarizeEvent(evt);
    expect(sum.detalle).toContain("session_id");
    expect(sum.detalle).toContain("test.action");
  });
});

describe("summarizeEvents", () => {
  test("maps array of events", () => {
    const events = [
      makeEvent({ phase: "start" }),
      makeEvent({ phase: "end", metadata: { ok: true } }),
    ];
    const sums = summarizeEvents(events);
    expect(sums).toHaveLength(2);
    expect(sums[0]!.icon).toBe("🔵");
    expect(sums[1]!.icon).toBe("🟢");
  });
});

describe("renderSessionBlock", () => {
  test("adds outcome line for end events", () => {
    const lines = renderSessionBlock({
      session_id: "s-1",
      correlation_id: "c-1",
      timestamp: "2026-01-01T00:00:03.000Z",
      phase: "end",
      action: "device.list",
      metadata: {
        ok: true,
        completionReason: "completed",
        commandIds: ["cmd-1"],
        resultSummary: { total: 3 },
      },
    });

    expect(lines.some((line) => line.includes("OK"))).toBe(true);
    expect(lines.some((line) => line.includes("resultado"))).toBe(true);
    expect(lines.some((line) => line.includes("completed"))).toBe(true);
    expect(lines.some((line) => line.includes("cmds:1"))).toBe(true);
    expect(lines.some((line) => line.includes("resultSummary"))).toBe(true);
  });
});
