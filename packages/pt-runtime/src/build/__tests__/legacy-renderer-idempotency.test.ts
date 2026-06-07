// packages/pt-runtime/src/build/__tests__/legacy-renderer-idempotency.test.ts
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("legacy renderer idempotency", () => {
  test("render-from-handlers.ts no inyecta timestamp dinámico", () => {
    const source = readFileSync(
      join(import.meta.dir, "../render-from-handlers.ts"),
      "utf-8",
    );

    expect(source).not.toContain("new Date()");
    expect(source).not.toContain("Date.now()");
    expect(source).not.toContain("toISOString()");
  });

  test("render-from-handlers.ts sigue exportando renderRuntimeFromHandlers", () => {
    const source = readFileSync(
      join(import.meta.dir, "../render-from-handlers.ts"),
      "utf-8",
    );

    expect(source).toContain("export function renderRuntimeFromHandlers");
  });
});
