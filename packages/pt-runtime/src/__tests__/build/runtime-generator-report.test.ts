import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "bun:test";

import { RuntimeGenerator } from "../../index.js";

describe("RuntimeGenerator build report", () => {
  test("reporta cambios solo cuando cambian artefactos", async () => {
    const root = mkdtempSync(join(tmpdir(), "pt-runtime-report-"));
    const outputDir = join(root, "generated");
    const devDir = join(root, "pt-dev");

    try {
      const generator = new RuntimeGenerator({ outputDir, devDir });

      const first = await generator.build();
      expect(first.changes.mainChanged).toBe(true);
      expect(first.changes.runtimeChanged).toBe(true);

      const second = await generator.build();
      expect(second.changes.mainChanged).toBe(false);
      expect(second.changes.runtimeChanged).toBe(false);
      expect(second.changes.catalogChanged).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 30000);
});
