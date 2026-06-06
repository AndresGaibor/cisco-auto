import { describe, expect, test } from "bun:test";
import { ReaddirCache } from "../shared/readdir-cache.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";

function makeTempDir(): string {
  const dir = join(tmpdir(), `readdir-cache-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("ReaddirCache", () => {
  test("lee del disco en el primer miss", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "a.json"), "{}");
    writeFileSync(join(dir, "b.json"), "{}");

    const cache = new ReaddirCache({ ttlMs: 1000, extension: ".json" });
    const files = cache.list(dir);
    expect(files.sort()).toEqual(["a.json", "b.json"]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("usa cache dentro del TTL sin volver al disco", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "a.json"), "{}");

    let readCount = 0;
    const cache = new ReaddirCache({
      ttlMs: 5000,
      reader: () => {
        readCount++;
        return ["a.json"];
      },
    });

    cache.list(dir);
    cache.list(dir);
    cache.list(dir);
    expect(readCount).toBe(1);

    const stats = cache.getStats();
    expect(stats.totalHits).toBe(2);
    expect(stats.totalMisses).toBe(1);
    expect(stats.hitRate).toBe(2 / 3);
    rmSync(dir, { recursive: true, force: true });
  });

  test("re-lee del disco cuando el TTL expira y el mtime cambió", async () => {
    const { utimesSync } = require("node:fs") as typeof import("node:fs");
    const dir = makeTempDir();
    writeFileSync(join(dir, "a.json"), "{}");

    let readCount = 0;
    const cache = new ReaddirCache({
      ttlMs: 50,
      reader: () => {
        readCount++;
        return ["a.json"];
      },
    });

    cache.list(dir);
    expect(readCount).toBe(1);

    // Esperar a que TTL expire Y forzar cambio de mtime en el directorio
    await new Promise((r) => setTimeout(r, 80));
    utimesSync(dir, new Date(Date.now() + 5000), new Date(Date.now() + 5000));

    cache.list(dir);
    expect(readCount).toBe(2);
    rmSync(dir, { recursive: true, force: true });
  });

  test("invalidate fuerza re-lectura inmediata", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "a.json"), "{}");

    let readCount = 0;
    const cache = new ReaddirCache({
      ttlMs: 5000,
      reader: () => {
        readCount++;
        return ["a.json"];
      },
    });

    cache.list(dir);
    cache.invalidate(dir);
    cache.list(dir);
    expect(readCount).toBe(2);
    rmSync(dir, { recursive: true, force: true });
  });

  test("invalidateAll limpia todo el cache", () => {
    const dir1 = makeTempDir();
    const dir2 = makeTempDir();
    writeFileSync(join(dir1, "a.json"), "{}");
    writeFileSync(join(dir2, "b.json"), "{}");

    const cache = new ReaddirCache({ ttlMs: 5000 });
    cache.list(dir1);
    cache.list(dir2);
    expect(cache.getStats().entries).toBe(2);

    cache.invalidateAll();
    expect(cache.getStats().entries).toBe(0);
    rmSync(dir1, { recursive: true, force: true });
    rmSync(dir2, { recursive: true, force: true });
  });

  test("prune elimina solo entradas expiradas", async () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "a.json"), "{}");

    const cache = new ReaddirCache({ ttlMs: 30 });
    cache.list(dir);

    await new Promise((r) => setTimeout(r, 60));
    const pruned = cache.prune();
    expect(pruned).toBe(1);
    expect(cache.getStats().entries).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  });

  test("retorna array vacío si el directorio no existe", () => {
    const cache = new ReaddirCache({ ttlMs: 1000 });
    const files = cache.list("/tmp/non-existent-dir-" + Math.random());
    expect(files).toEqual([]);
  });

  test("filtra por extensión personalizada", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "a.json"), "{}");
    writeFileSync(join(dir, "b.txt"), "");
    writeFileSync(join(dir, "c.json"), "{}");

    const cache = new ReaddirCache({ ttlMs: 1000, extension: ".json" });
    const files = cache.list(dir);
    expect(files.sort()).toEqual(["a.json", "c.json"]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("aplica filter personalizado", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "a.json"), "{}");
    writeFileSync(join(dir, "b.json"), "{}");
    writeFileSync(join(dir, "c.txt"), "");

    const cache = new ReaddirCache({
      ttlMs: 1000,
      filter: (f) => f.startsWith("a"),
    });
    expect(cache.list(dir)).toEqual(["a.json"]);
    rmSync(dir, { recursive: true, force: true });
  });

  test("refresh invalida y re-lee", () => {
    let readCount = 0;
    const cache = new ReaddirCache({
      ttlMs: 5000,
      reader: () => {
        readCount++;
        return ["a.json"];
      },
    });

    cache.list("/fake");
    cache.refresh("/fake");
    expect(readCount).toBe(2);
  });

  test("ttlMs=0 desactiva el cache", () => {
    let readCount = 0;
    const cache = new ReaddirCache({
      ttlMs: 0,
      reader: () => {
        readCount++;
        return ["x"];
      },
    });

    cache.list("/fake");
    cache.list("/fake");
    cache.list("/fake");
    expect(readCount).toBe(3);
  });
});
