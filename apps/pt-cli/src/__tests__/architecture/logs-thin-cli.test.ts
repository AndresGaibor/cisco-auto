import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("logs CLI boundary", () => {
  test("logs command delegates file parsing to pt-control application/logs", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../commands/logs.ts"),
      "utf8",
    );

    expect(source).toContain("@cisco-auto/pt-control/application/logs");
    expect(source).toContain("tailLogs");
    expect(source).toContain("readLogSession");
    expect(source).toContain("inspectCommandLogs");
    expect(source).toContain("findRecentLogErrors");
    expect(source).toContain("generateLogBundle");
    expect(source).toContain("listIosLogEntries");

    expect(source).not.toContain("sessionLogStore");
    expect(source).not.toContain("bundleWriter");
    expect(source).not.toContain("readFileSync");
    expect(source).not.toContain("readdirSync");
    expect(source).not.toContain("JSON.parse(readFileSync");
    expect(source).not.toContain("const commandsTraceDir = getCommandLogsDir()");
    expect(source).not.toContain("const resultsDir = getResultsDir()");
  });
});