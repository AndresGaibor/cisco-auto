/**
 * Tests para fs-atomic-async.ts - versiones async (non-blocking) de fs-atomic.ts.
 *
 * Cada test valida que la versión async produce el mismo resultado que
 * la versión sync correspondiente. Esto garantiza backward compatibility
 * semántica entre ambas APIs.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { atomicWriteFile, readJsonFile, listJsonFiles } from "./fs-atomic";
import {
  readTextFile,
  readJsonFileAsync,
  readJsonFileOrThrowAsync,
  listJsonFilesAsync,
  pathExists,
  fileSize,
  ensureDirAsync,
  appendLineAsync,
  writeTextFile,
} from "./fs-atomic-async";

function makeTestDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

let TEST_DIR: string;

describe("fs-atomic-async utilities", () => {
  beforeEach(() => {
    TEST_DIR = makeTestDir("file-bridge-fs-atomic-async-");
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
  });

  describe("readTextFile", () => {
    test("retorna el contenido del archivo cuando existe", async () => {
      const file = join(TEST_DIR, "exists.txt");
      writeFileSync(file, "hello world", "utf8");

      const content = await readTextFile(file);

      expect(content).toBe("hello world");
    });

    test("retorna null cuando el archivo no existe", async () => {
      const file = join(TEST_DIR, "missing.txt");

      const content = await readTextFile(file);

      expect(content).toBeNull();
    });
  });

  describe("readJsonFileAsync", () => {
    test("parsea JSON válido retornando el objeto", async () => {
      const file = join(TEST_DIR, "valid.json");
      atomicWriteFile(file, JSON.stringify({ id: 1, name: "test" }));

      const parsed = await readJsonFileAsync<{ id: number; name: string }>(file);

      expect(parsed).toEqual({ id: 1, name: "test" });
    });

    test("retorna null si el archivo no existe (mismo comportamiento que readJsonFile sync)", async () => {
      const file = join(TEST_DIR, "missing.json");

      const parsed = await readJsonFileAsync(file);

      expect(parsed).toBeNull();
    });

    test("retorna null si el archivo está vacío", async () => {
      const file = join(TEST_DIR, "empty.json");
      writeFileSync(file, "", "utf8");

      const parsed = await readJsonFileAsync(file);

      expect(parsed).toBeNull();
    });

    test("lanza SyntaxError si el JSON es inválido", async () => {
      const file = join(TEST_DIR, "invalid.json");
      writeFileSync(file, "{ not valid json", "utf8");

      await expect(readJsonFileAsync(file)).rejects.toThrow();
    });

    test("produce el mismo resultado que la versión sync", async () => {
      const file = join(TEST_DIR, "parity.json");
      const payload = { commands: [1, 2, 3], meta: { version: 2 } };
      atomicWriteFile(file, JSON.stringify(payload));

      const syncResult = readJsonFile<typeof payload>(file);
      const asyncResult = await readJsonFileAsync<typeof payload>(file);

      expect(asyncResult).toEqual(syncResult);
    });
  });

  describe("readJsonFileOrThrowAsync", () => {
    test("retorna el valor parseado si existe", async () => {
      const file = join(TEST_DIR, "exists.json");
      atomicWriteFile(file, JSON.stringify({ value: 42 }));

      const value = await readJsonFileOrThrowAsync<{ value: number }>(file);

      expect(value).toEqual({ value: 42 });
    });

    test("lanza error si el archivo no existe", async () => {
      const file = join(TEST_DIR, "missing.json");

      await expect(readJsonFileOrThrowAsync(file)).rejects.toThrow(
        /Invalid or missing JSON file/,
      );
    });
  });

  describe("listJsonFilesAsync", () => {
    test("lista solo archivos .json ordenados alfabéticamente", async () => {
      const dir = join(TEST_DIR, "listdir");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "c.json"), "{}");
      writeFileSync(join(dir, "a.json"), "{}");
      writeFileSync(join(dir, "b.txt"), "text");
      writeFileSync(join(dir, "ignore.txt"), "text");

      const files = await listJsonFilesAsync(dir);

      expect(files).toEqual(["a.json", "c.json"]);
    });

    test("retorna array vacío si el directorio no existe", async () => {
      const files = await listJsonFilesAsync(join(TEST_DIR, "nope"));

      expect(files).toEqual([]);
    });

    test("produce el mismo resultado que listJsonFiles sync", async () => {
      const dir = join(TEST_DIR, "parity");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "x.json"), "{}");
      writeFileSync(join(dir, "y.json"), "{}");

      const syncResult = listJsonFiles(dir);
      const asyncResult = await listJsonFilesAsync(dir);

      expect(asyncResult).toEqual(syncResult);
    });
  });

  describe("pathExists", () => {
    test("retorna true si el archivo existe", async () => {
      const file = join(TEST_DIR, "exists.txt");
      writeFileSync(file, "x");

      expect(await pathExists(file)).toBe(true);
    });

    test("retorna false si el archivo no existe", async () => {
      const file = join(TEST_DIR, "missing.txt");

      expect(await pathExists(file)).toBe(false);
    });
  });

  describe("fileSize", () => {
    test("retorna el tamaño en bytes del archivo", async () => {
      const file = join(TEST_DIR, "sized.txt");
      writeFileSync(file, "hello", "utf8");

      const size = await fileSize(file);

      expect(size).toBe(5);
    });

    test("retorna 0 si el archivo no existe", async () => {
      const size = await fileSize(join(TEST_DIR, "nope.txt"));

      expect(size).toBe(0);
    });
  });

  describe("ensureDirAsync", () => {
    test("crea directorios anidados", async () => {
      const dir = join(TEST_DIR, "a", "b", "c");

      await ensureDirAsync(dir);

      expect(await pathExists(dir)).toBe(true);
    });

    test("es idempotente", async () => {
      const dir = join(TEST_DIR, "idem");
      await ensureDirAsync(dir);
      await ensureDirAsync(dir);

      expect(await pathExists(dir)).toBe(true);
    });
  });

  describe("appendLineAsync", () => {
    test("crea el archivo si no existe y escribe la línea con newline", async () => {
      const file = join(TEST_DIR, "append-create.txt");

      await appendLineAsync(file, "first line");

      const content = readFileSync(file, "utf8");
      expect(content).toBe("first line\n");
    });

    test("appendea múltiples líneas en orden", async () => {
      const file = join(TEST_DIR, "append-multi.txt");

      await appendLineAsync(file, "line 1");
      await appendLineAsync(file, "line 2");
      await appendLineAsync(file, "line 3");

      const content = readFileSync(file, "utf8");
      expect(content).toBe("line 1\nline 2\nline 3\n");
    });

    test("no duplica newline si la línea ya lo trae", async () => {
      const file = join(TEST_DIR, "append-no-dup.txt");

      await appendLineAsync(file, "with newline\n");

      const content = readFileSync(file, "utf8");
      expect(content).toBe("with newline\n");
    });

    test("crea el directorio padre si no existe", async () => {
      const file = join(TEST_DIR, "nested", "deep", "lines.txt");

      await appendLineAsync(file, "content");

      expect(await pathExists(file)).toBe(true);
    });
  });

  describe("writeTextFile", () => {
    test("escribe contenido y crea el directorio padre", async () => {
      const file = join(TEST_DIR, "nested", "written.txt");

      await writeTextFile(file, "written content");

      const content = readFileSync(file, "utf8");
      expect(content).toBe("written content");
    });

    test("sobrescribe el contenido existente", async () => {
      const file = join(TEST_DIR, "overwrite.txt");
      writeFileSync(file, "old", "utf8");

      await writeTextFile(file, "new");

      const content = readFileSync(file, "utf8");
      expect(content).toBe("new");
    });
  });
});
