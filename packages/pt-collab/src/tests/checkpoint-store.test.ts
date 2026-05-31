import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { CheckpointStore, type CheckpointRecord } from "../storage/checkpoint-store.js";
import { getCheckpointsDir, getCheckpointIndexPath, getCollabRoot } from "../storage/collab-paths.js";

const ROOM_ID = "test-cp-store";

function makeRecord(overrides: Partial<CheckpointRecord> = {}): CheckpointRecord {
  return {
    checkpointId: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    roomId: ROOM_ID,
    peerId: "peer-test",
    sha256: "a".repeat(64),
    byteSize: 1024,
    chunkCount: 1,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("CheckpointStore", () => {
  let store: CheckpointStore;

  beforeEach(() => {
    process.env.PT_COLLAB_DIR = "/tmp/pt-collab-test";
    store = new CheckpointStore(ROOM_ID);
  });

  afterEach(() => {
    const root = process.env.PT_COLLAB_DIR;
    if (root) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("store vacio al inicio", () => {
    expect(store.count()).toBe(0);
    expect(store.list()).toEqual([]);
    expect(store.latest()).toBeUndefined();
  });

  test("save y get de un checkpoint", () => {
    const record = makeRecord({ checkpointId: "cp-001", byteSize: 512 });
    store.save(record);

    const retrieved = store.get("cp-001");
    expect(retrieved).toBeDefined();
    expect(retrieved!.checkpointId).toBe("cp-001");
    expect(retrieved!.byteSize).toBe(512);
    expect(retrieved!.roomId).toBe(ROOM_ID);
    expect(store.count()).toBe(1);
  });

  test("save reemplaza registro existente con mismo ID", () => {
    const rec1 = makeRecord({ checkpointId: "cp-001", byteSize: 512, peerId: "peer-a" });
    const rec2 = makeRecord({ checkpointId: "cp-001", byteSize: 2048, peerId: "peer-b" });
    store.save(rec1);
    store.save(rec2);

    const retrieved = store.get("cp-001");
    expect(retrieved!.byteSize).toBe(2048);
    expect(retrieved!.peerId).toBe("peer-b");
    expect(store.count()).toBe(1);
  });

  test("list ordena por fecha descendente", () => {
    const old = makeRecord({ checkpointId: "cp-old", createdAt: "2024-01-01T00:00:00.000Z" });
    const mid = makeRecord({ checkpointId: "cp-mid", createdAt: "2025-01-01T00:00:00.000Z" });
    const new_ = makeRecord({ checkpointId: "cp-new", createdAt: "2026-01-01T00:00:00.000Z" });

    store.save(mid);
    store.save(new_);
    store.save(old);

    const list = store.list();
    expect(list.length).toBe(3);
    expect(list[0]!.checkpointId).toBe("cp-new");
    expect(list[1]!.checkpointId).toBe("cp-mid");
    expect(list[2]!.checkpointId).toBe("cp-old");
  });

  test("latest devuelve el mas reciente", () => {
    const old = makeRecord({ checkpointId: "cp-old", createdAt: "2024-01-01T00:00:00.000Z" });
    const new_ = makeRecord({ checkpointId: "cp-new", createdAt: "2026-01-01T00:00:00.000Z" });
    store.save(old);
    store.save(new_);

    expect(store.latest()!.checkpointId).toBe("cp-new");
  });

  test("remove quita registro y archivo .pkt", () => {
    const record = makeRecord({ checkpointId: "cp-to-remove", byteSize: 256 });
    store.save(record);
    store.writePktData("cp-to-remove", new Uint8Array([1, 2, 3]));

    expect(store.count()).toBe(1);

    const removed = store.remove("cp-to-remove");
    expect(removed).toBe(true);
    expect(store.count()).toBe(0);
    expect(store.get("cp-to-remove")).toBeUndefined();

    const pktPath = `${getCheckpointsDir(ROOM_ID)}/cp-to-remove.pkt`;
    expect(existsSync(pktPath)).toBe(false);
  });

  test("remove de ID inexistente devuelve false", () => {
    expect(store.remove("no-existe")).toBe(false);
  });

  test("prune elimina los mas viejos manteniendo keep", () => {
    const checkpoints = [
      makeRecord({ checkpointId: "cp-1", createdAt: "2024-01-01T00:00:00.000Z" }),
      makeRecord({ checkpointId: "cp-2", createdAt: "2025-01-01T00:00:00.000Z" }),
      makeRecord({ checkpointId: "cp-3", createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    checkpoints.forEach((cp) => store.save(cp));

    const removed = store.prune(2);
    expect(removed.length).toBe(1);
    expect(removed[0]!.checkpointId).toBe("cp-1");
    expect(store.count()).toBe(2);
  });

  test("prune con count mayor a registros no elimina nada", () => {
    store.save(makeRecord({ checkpointId: "cp-1" }));
    store.save(makeRecord({ checkpointId: "cp-2" }));

    const removed = store.prune(10);
    expect(removed.length).toBe(0);
    expect(store.count()).toBe(2);
  });

  test("writePktData y readPktData", () => {
    const data = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02]);
    store.writePktData("cp-pkt-test", data);

    const read = store.readPktData("cp-pkt-test");
    expect(read).toBeDefined();
    expect(read!.length).toBe(6);
    expect(read![0]).toBe(0x50);
    expect(read![5]).toBe(0x02);
  });

  test("readPktData de checkpoint inexistente devuelve undefined", () => {
    expect(store.readPktData("no-existe")).toBeUndefined();
  });

  test("persistencia entre instancias del store", () => {
    const record = makeRecord({
      checkpointId: "cp-persist",
      byteSize: 999,
      peerId: "peer-persist",
    });
    store.save(record);

    const store2 = new CheckpointStore(ROOM_ID);
    expect(store2.count()).toBe(1);
    const retrieved = store2.get("cp-persist");
    expect(retrieved).toBeDefined();
    expect(retrieved!.byteSize).toBe(999);
    expect(retrieved!.peerId).toBe("peer-persist");
  });

  test("list es una copia, no referencia mutable", () => {
    const record = makeRecord({ checkpointId: "cp-ref" });
    store.save(record);

    const list = store.list();
    list.push(record);

    expect(store.count()).toBe(1);
  });

  test("maneja archivo de indice corrupto", () => {
    const indexPath = getCheckpointIndexPath(ROOM_ID);
    const { mkdirSync, writeFileSync } = require("node:fs");
    const { dirname } = require("node:path");
    mkdirSync(getCheckpointsDir(ROOM_ID), { recursive: true });
    writeFileSync(indexPath, "esto no es json valido", "utf-8");

    const store2 = new CheckpointStore(ROOM_ID);
    expect(store2.count()).toBe(0);
  });
});
