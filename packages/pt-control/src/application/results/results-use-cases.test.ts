import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  cleanResults,
  inspectPendingResults,
  listFailedResults,
  listResults,
  planCleanResults,
  showResult,
  viewResult,
} from "./results-use-cases.js";

function makeDevDir(): string {
  const root = mkdtempSync(join(tmpdir(), "pt-results-"));
  mkdirSync(join(root, "results"), { recursive: true });
  mkdirSync(join(root, "logs", "commands"), { recursive: true });
  mkdirSync(join(root, "commands"), { recursive: true });
  mkdirSync(join(root, "in-flight"), { recursive: true });
  mkdirSync(join(root, "dead-letter"), { recursive: true });
  mkdirSync(join(root, "journal"), { recursive: true });
  return root;
}

function writeResult(
  devDir: string,
  file: string,
  envelope: Record<string, unknown>,
): string {
  const path = join(devDir, "results", file);
  writeFileSync(path, JSON.stringify(envelope, null, 2), "utf-8");
  return path;
}

describe("results use cases", () => {
  test("listResults returns cmd_*.json sorted and limited", async () => {
    const devDir = makeDevDir();

    writeResult(devDir, "cmd_a.json", { ok: true, status: "success" });
    writeResult(devDir, "ignore.json", { ok: true });
    writeResult(devDir, "cmd_b.json", { ok: true, status: "success" });

    const result = await listResults({ devDir, limit: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.files).toHaveLength(1);
    expect(result.data.total).toBe(2);
    expect(result.data.files[0]?.name.startsWith("cmd_")).toBe(true);
  });

  test("viewResult parses JSON and blocks path traversal", async () => {
    const devDir = makeDevDir();
    writeResult(devDir, "cmd_abc.json", { ok: true, value: { device: "R1" } });

    const result = await viewResult({ devDir, file: "cmd_abc.json" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.content).toEqual({ ok: true, value: { device: "R1" } });

    const traversal = await viewResult({ devDir, file: "../secret.json" });
    expect(traversal.ok).toBe(false);
  });

  test("planCleanResults plans deletions by keep count", async () => {
    const devDir = makeDevDir();

    writeResult(devDir, "cmd_1.json", { ok: true });
    writeResult(devDir, "cmd_2.json", { ok: true });
    writeResult(devDir, "cmd_3.json", { ok: true });

    const result = await planCleanResults({ devDir, keep: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.total).toBe(3);
    expect(result.data.candidates.length).toBe(2);
    expect(result.data.kept).toBe(1);
  });

  test("cleanResults deletes planned files", async () => {
    const devDir = makeDevDir();

    const first = writeResult(devDir, "cmd_1.json", { ok: true });
    writeResult(devDir, "cmd_2.json", { ok: true });

    const result = await cleanResults({ devDir, keep: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.attempted).toBe(1);
    expect(result.data.deleted).toBe(1);

    const remaining = await listResults({ devDir, limit: 10 });
    expect(remaining.ok).toBe(true);
    if (!remaining.ok) throw new Error(remaining.error.message);
    expect(remaining.data.total).toBe(1);

    expect(existsSync(first) || remaining.data.files.length === 1).toBe(true);
  });

  test("showResult resolves result and optional trace", async () => {
    const devDir = makeDevDir();

    writeResult(devDir, "cmd_abc.json", {
      ok: false,
      status: "failed",
      value: { error: "boom", device: "R1" },
    });

    writeFileSync(
      join(devDir, "logs", "commands", "abc.json"),
      JSON.stringify({ phase: "runtime", ticket: "abc" }),
      "utf-8",
    );

    const result = await showResult({ devDir, commandId: "abc" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.file).toBe("cmd_abc.json");
    expect(result.data.envelope.status).toBe("failed");
    expect(result.data.trace).toEqual({ phase: "runtime", ticket: "abc" });
  });

  test("listFailedResults extracts failed envelopes", async () => {
    const devDir = makeDevDir();

    writeResult(devDir, "cmd_ok.json", { ok: true, status: "success" });
    writeResult(devDir, "cmd_failed.json", {
      ok: false,
      status: "failed",
      value: { error: "timeout" },
      completedAt: 123,
    });

    const result = await listFailedResults({ devDir, limit: 10 });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.failed).toHaveLength(1);
    expect(result.data.failed[0]?.name).toBe("cmd_failed.json");
    expect(result.data.failed[0]?.error).toBe("timeout");
  });

  test("inspectPendingResults counts queue directories and warnings", async () => {
    const devDir = makeDevDir();

    writeFileSync(join(devDir, "commands", "a.json"), "{}", "utf-8");
    writeFileSync(join(devDir, "in-flight", "b.json"), "{}", "utf-8");
    writeFileSync(join(devDir, "dead-letter", "c.json"), "{}", "utf-8");
    writeFileSync(
      join(devDir, "journal", "pending-commands.json"),
      JSON.stringify({ one: {}, two: {} }),
      "utf-8",
    );

    const result = await inspectPendingResults({ devDir });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.data.queueCount).toBe(1);
    expect(result.data.inFlightCount).toBe(1);
    expect(result.data.deadLetterCount).toBe(1);
    expect(result.data.pendingDeferred).toBe(2);
    expect(result.data.warnings.length).toBeGreaterThan(0);
  });
});