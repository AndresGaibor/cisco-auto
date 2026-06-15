import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("topology mutation PT-safe source", () => {
  test("no usa for...of en helpers y limpieza de topología", () => {
    const serviceSource = readFileSync(
      join(import.meta.dir, "../application/services/topology-mutation-service.ts"),
      "utf8",
    );
    const helperSource = readFileSync(
      join(import.meta.dir, "../shared/utils/helpers.ts"),
      "utf8",
    );

    expect(serviceSource).not.toContain("for (const link of linkEntries)");
    expect(serviceSource).not.toContain("for (const name of deviceNames)");
    expect(helperSource).not.toContain("for (const typeId of typeList)");
  });
});
