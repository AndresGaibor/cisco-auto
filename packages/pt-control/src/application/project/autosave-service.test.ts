import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AutosaveService } from "./autosave-service.js";

describe("AutosaveService", () => {
  test("crea autosave con bytes unsigned y sha256", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pt-autosave-"));
    const project = {
      status: async () => ({
        ok: true,
        activeFile: "/labs/Taller grupal.pkt",
        savedFilename: "/labs/Taller grupal.pkt",
        isSavedToDisk: true,
        isActivityFile: false,
        defaultSaveLocation: "",
        tempFileLocation: "",
        deviceCount: 1,
        linkCount: 2,
        activeFileClass: "NetworkFile",
        networkDescription: "",
      }),
      snapshotBegin: async () => ({
        snapshotId: "snap_1",
        savedFilename: "/labs/Taller grupal.pkt",
        length: 4,
        chunkSize: 2,
      }),
      snapshotRead: async (_id: string, offset: number) =>
        offset === 0
          ? { snapshotId: "snap_1", offset: 0, nextOffset: 2, eof: false, bytes: [-1, 0] }
          : { snapshotId: "snap_1", offset: 2, nextOffset: 4, eof: true, bytes: [127, 128] },
      snapshotClear: async () => undefined,
    };
    const service = new AutosaveService(project as any, { homeDir: dir });
    const result = await service.createAutosave({ keep: 20 });
    expect(result.bytes).toBe(4);
    expect(result.autosavePath).toContain("Taller_grupal");
    const bytes = await readFile(result.autosavePath);
    expect([...bytes]).toEqual([255, 0, 127, 128]);
    expect(result.sha256).toHaveLength(64);
    await rm(dir, { recursive: true, force: true });
  });

  test("pruneAutosaves borra antiguos y conserva ultimos N", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pt-autosave-prune-"));
    const project = {
      status: async () => ({
        ok: true,
        activeFile: "/tmp/test.pkt",
        savedFilename: "/tmp/test.pkt",
        isSavedToDisk: true,
        isActivityFile: false,
        defaultSaveLocation: "",
        tempFileLocation: "",
        deviceCount: 1,
        linkCount: 0,
        activeFileClass: "NetworkFile",
        networkDescription: "",
      }),
      snapshotBegin: async () => ({ snapshotId: "snap_x", savedFilename: "/tmp/test.pkt", length: 1, chunkSize: 1 }),
      snapshotRead: async () => ({ snapshotId: "snap_x", offset: 0, nextOffset: 1, eof: true, bytes: [42] }),
      snapshotClear: async () => undefined,
    };
    const service = new AutosaveService(project as any, { homeDir: dir });
    await service.createAutosave({ dir });
    await new Promise((r) => setTimeout(r, 10));
    await service.createAutosave({ dir });
    await new Promise((r) => setTimeout(r, 10));
    await service.createAutosave({ dir });
    const pruned = await service.pruneAutosaves(2, "/tmp/test.pkt", dir);
    expect(pruned).toHaveLength(1);
    const remaining = await service.listAutosaves("/tmp/test.pkt", dir);
    expect(remaining).toHaveLength(2);
    await rm(dir, { recursive: true, force: true });
  });

  test("resolveLatestAutosave devuelve el mas reciente", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pt-autosave-latest-"));
    const project = {
      status: async () => ({
        ok: true,
        activeFile: "/tmp/lab.pkt",
        savedFilename: "/tmp/lab.pkt",
        isSavedToDisk: true,
        isActivityFile: false,
        defaultSaveLocation: "",
        tempFileLocation: "",
        deviceCount: 3,
        linkCount: 2,
        activeFileClass: "NetworkFile",
        networkDescription: "",
      }),
      snapshotBegin: async () => ({ snapshotId: "snap_y", savedFilename: "/tmp/lab.pkt", length: 1, chunkSize: 1 }),
      snapshotRead: async () => ({ snapshotId: "snap_y", offset: 0, nextOffset: 1, eof: true, bytes: [99] }),
      snapshotClear: async () => undefined,
    };
    const service = new AutosaveService(project as any, { homeDir: dir });
    const first = await service.createAutosave({ dir });
    await new Promise((r) => setTimeout(r, 10));
    const second = await service.createAutosave({ dir });
    const latest = await service.resolveLatestAutosave("/tmp/lab.pkt", dir);
    expect(latest?.autosavePath).toBe(second.autosavePath);
    expect(latest?.autosavePath).not.toBe(first.autosavePath);
    await rm(dir, { recursive: true, force: true });
  });
});