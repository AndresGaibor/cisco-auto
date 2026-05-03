import { existsSync, mkdtempSync, rmSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "bun:test";

import { createRuntimeLoader } from "../runtime-loader";

describe("runtime-loader status", () => {
  const originalDprint = (globalThis as any).dprint;
  const originalFm = (globalThis as any).fm;

  afterEach(() => {
    (globalThis as any).dprint = originalDprint;
    (globalThis as any).fm = originalFm;
  });

  test("conserva el runtime anterior si el nuevo falla", () => {
    const root = mkdtempSync(join(tmpdir(), "pt-runtime-loader-"));
    const runtimeFile = join(root, "runtime.js");

    (globalThis as any).dprint = () => {};
    (globalThis as any).fm = {
      fileExists: (path: string) => existsSync(path),
      getFileModificationTime: (path: string) => {
        try {
          return existsSync(path) ? statSync(path).mtimeMs : 0;
        } catch {
          return 0;
        }
      },
      getFileContents: (path: string) => readFileSync(path, "utf8"),
    };

    try {
      writeFileSync(
        runtimeFile,
        `
_global._ptDispatch = function(payload) {
  return { ok: true, type: payload && payload.type ? payload.type : "ok" };
};
`,
        "utf8",
      );

      const loader = createRuntimeLoader({ runtimeFile });

      const first = loader.load(true);
      expect(first.ok).toBe(true);
      expect(first.loaded).toBe(true);
      expect(loader.getStatus().runtimeLoaded).toBe(true);
      expect(loader.getStatus().reloadCount).toBe(1);

      writeFileSync(runtimeFile, "_global._ptDispatch = function() {", "utf8");

      const second = loader.reloadNow();

      expect(second.ok).toBe(false);
      expect(second.loaded).toBe(true);
      expect(loader.getStatus().runtimeLoaded).toBe(true);
      expect(loader.getStatus().lastLoadError).not.toBeNull();
      expect(typeof loader.getRuntimeFn()).toBe("function");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
