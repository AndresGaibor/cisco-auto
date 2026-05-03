import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  assertInsideDir,
  countJsonFiles,
  normalizeCommandId,
  readNdjsonFile,
  resolveNumberOrDefault,
} from "./filesystem.js";

describe("filesystem shared helpers", () => {
  test("normalizeCommandId quita extensión y prefijo cmd", () => {
    expect(normalizeCommandId("cmd_abc.json")).toBe("abc");
    expect(normalizeCommandId("abc")).toBe("abc");
  });

  test("resolveNumberOrDefault usa fallback para valores no válidos", () => {
    expect(resolveNumberOrDefault(undefined, 10)).toBe(10);
    expect(resolveNumberOrDefault(0, 10)).toBe(10);
    expect(resolveNumberOrDefault(5, 10)).toBe(5);
  });

  test("assertInsideDir bloquea rutas fuera del directorio", () => {
    const root = mkdtempSync(join(tmpdir(), "pt-fs-"));
    const inside = join(root, "nested", "file.json");
    const outside = join(root, "..", "secret.json");

    mkdirSync(join(root, "nested"), withRecursion());

    expect(() => assertInsideDir(root, inside)).not.toThrow();
    expect(() => assertInsideDir(root, outside)).toThrow("Ruta fuera del directorio permitido");
  });

  test("readNdjsonFile ignora líneas corruptas y countJsonFiles cuenta JSON", () => {
    const root = mkdtempSync(join(tmpdir(), "pt-fs-"));
    const ndjsonPath = join(root, "events.ndjson");
    const jsonDir = join(root, "json");

    mkdirSync(jsonDir, { recursive: true });
    writeFileSync(ndjsonPath, '{"ok":true}\nnot-json\n{"id":2}\n', "utf-8");
    writeFileSync(join(jsonDir, "a.json"), "{}", "utf-8");
    writeFileSync(join(jsonDir, "b.json"), "{}", "utf-8");
    writeFileSync(join(jsonDir, "c.txt"), "{}", "utf-8");

    expect(readNdjsonFile(ndjsonPath)).toEqual([{ ok: true }, { id: 2 }]);
    expect(countJsonFiles(jsonDir)).toBe(2);
  });
});

function withRecursion(): { recursive: boolean } {
  return { recursive: true };
}
