import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("results CLI boundary", () => {
  test("results command delegates filesystem logic to pt-control application/results", () => {
    const source = readFileSync(
      join(import.meta.dir, "../../commands/results.ts"),
      "utf8",
    );

    expect(source).toContain("@cisco-auto/pt-control/application/results");
    expect(source).toContain("listResults");
    expect(source).toContain("viewResult");
    expect(source).toContain("cleanResults");
    expect(source).toContain("showResult");
    expect(source).toContain("listFailedResults");
    expect(source).toContain("inspectPendingResults");

    expect(source).not.toContain("readdirSync");
    expect(source).not.toContain("statSync");
    expect(source).not.toContain("readFileSync");
    expect(source).not.toContain("readFile(");
    expect(source).not.toContain("unlink(");
    expect(source).not.toContain("homedir");
    expect(source).not.toContain("getDefaultDevDir(): string");
    expect(source).not.toContain("function getDefaultDevDir");
  });
});