import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { AppendOnlyQueueIndex } from "../shared/append-only-queue-index.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from "node:fs";

let tempDir: string;
let indexPath: string;

beforeEach(() => {
  tempDir = join(tmpdir(), `append-only-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(tempDir, { recursive: true });
  indexPath = join(tempDir, "_queue.ndjson");
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("AppendOnlyQueueIndex", () => {
  test("append es O(1) y no reescribe el archivo", () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    idx.append("cmd_1.json");
    idx.append("cmd_2.json");
    idx.append("cmd_3.json");

    const content = readFileSync(indexPath, "utf8");
    expect(content).toContain("cmd_1.json");
    expect(content).toContain("cmd_2.json");
    expect(content).toContain("cmd_3.json");
  });

  test("getAll retorna las entries en orden de inserción", () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    idx.append("a.json");
    idx.append("b.json");
    idx.append("c.json");

    expect(idx.getAll()).toEqual(["a.json", "b.json", "c.json"]);
  });

  test("deduplica entries repetidas", () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    idx.append("a.json");
    idx.append("a.json");
    idx.append("a.json");

    expect(idx.getAll()).toEqual(["a.json"]);
  });

  test("getAllCached evita re-parsear el archivo", () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    idx.append("a.json");
    idx.append("b.json");

    const firstCall = idx.getAllCached();

    // Eliminar el archivo detrás de las cámaras
    rmSync(indexPath, { force: true });

    const secondCall = idx.getAllCached();
    expect(secondCall).toEqual(firstCall);
  });

  test("remove elimina entries del archivo y del cache", () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    idx.append("a.json");
    idx.append("b.json");
    idx.append("c.json");

    idx.remove(["b.json"]);

    expect(idx.getAll()).toEqual(["a.json", "c.json"]);
    expect(idx.has("b.json")).toBe(false);
  });

  test("compact deduplica y limpia líneas inválidas", () => {
    writeFileSync(indexPath, '"a.json"\n"b.json"\n"a.json"\ninvalid json\n"c.json"\n', "utf8");
    writeFileSync(join(tempDir, "a.json"), '{"cmd":"a"}');
    writeFileSync(join(tempDir, "b.json"), '{"cmd":"b"}');
    writeFileSync(join(tempDir, "c.json"), '{"cmd":"c"}');

    const idx = new AppendOnlyQueueIndex({ indexPath });
    idx.invalidateCache();
    idx.compact();

    const all = idx.getAll();
    expect(all.sort()).toEqual(["a.json", "b.json", "c.json"]);
  });

  test("invalidateCache fuerza re-lectura del disco", () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    idx.append("a.json");

    writeFileSync(indexPath, '"x.json"\n', "utf8");
    idx.invalidateCache();
    expect(idx.getAll()).toEqual(["x.json"]);
  });

  test("getAll en archivo inexistente retorna array vacío", () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    expect(idx.getAll()).toEqual([]);
  });

  test("append crea el directorio si no existe", () => {
    const nestedDir = join(tempDir, "nested", "deep");
    const nestedPath = join(nestedDir, "_queue.ndjson");
    const idx = new AppendOnlyQueueIndex({ indexPath: nestedPath });
    idx.append("a.json");

    expect(existsSync(nestedPath)).toBe(true);
  });

  test("reset limpia todo el índice", () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    idx.append("a.json");
    idx.append("b.json");
    idx.reset();

    expect(idx.getAll()).toEqual([]);
  });

  test("append escribe una línea por entry (NDJSON)", () => {
    const idx = new AppendOnlyQueueIndex({ indexPath });
    idx.append("first.json");
    idx.append("second.json");

    const content = readFileSync(indexPath, "utf8");
    const lines = content.split("\n").filter((l) => l.trim() !== "");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toBe("first.json");
    expect(JSON.parse(lines[1]!)).toBe("second.json");
  });
});
