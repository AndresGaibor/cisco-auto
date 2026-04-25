import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("history CLI boundary", () => {
  test("history command delegates history logic to pt-control application/history", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../commands/history.ts"),
      "utf8",
    );

    expect(source).toContain("@cisco-auto/pt-control/application/history");
    expect(source).toContain("listHistory");
    expect(source).toContain("showHistory");
    expect(source).toContain("getLastHistory");
    expect(source).toContain("prepareHistoryRerun");
    expect(source).toContain("explainHistory");

    expect(source).not.toContain("historyStore");
    expect(source).not.toContain("existsSync");
    expect(source).not.toContain("readdirSync");
    expect(source).not.toContain("getHistoryDir");
    expect(source).not.toContain("inferFailureCauses");
    expect(source).not.toContain("classifyRerunnable");
    expect(source).not.toContain("formatEntryCompact");
    expect(source).not.toContain("function getField");
    expect(source).not.toContain("function getDuration");
    expect(source).not.toContain("function getTargetDevice");
  });
});