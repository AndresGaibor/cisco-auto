import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

const TEST_DIR = join(tmpdir(), "pt-collab-test-" + randomUUID());

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  process.env.PT_COLLAB_DIR = TEST_DIR;
});

afterEach(() => {
  delete process.env.PT_COLLAB_DIR;
  rmdirSync(TEST_DIR, { recursive: true, force: true });
});

describe("session-store", () => {
  test("readSessionFile retorna null si no existe", async () => {
    const { readSessionFile } = await import("../storage/session-store.js");
    expect(readSessionFile()).toBeNull();
  });

  test("writeSessionFile escribe y readSessionFile lee", async () => {
    const { writeSessionFile, readSessionFile } = await import("../storage/session-store.js");
    writeSessionFile({
      mode: "host",
      localPort: 3937,
      publicUrl: "https://host.ts.net/collab/s/test123",
      sessionSecret: "testsecret1234",
      startedAt: "2025-01-01T00:00:00.000Z",
      pid: 12345,
    });

    const reread = readSessionFile();
    expect(reread).not.toBeNull();
    expect(reread!.mode).toBe("host");
    expect(reread!.localPort).toBe(3937);
    expect(reread!.publicUrl).toBe("https://host.ts.net/collab/s/test123");
    expect(reread!.sessionSecret).toBe("testsecret1234");
    expect(reread!.pid).toBe(12345);
    expect(reread!.schemaVersion).toBe(1);
  });

  test("writeSessionFile para modo client", async () => {
    const { writeSessionFile, readSessionFile } = await import("../storage/session-store.js");
    writeSessionFile({
      mode: "client",
      startedAt: "2025-06-01T12:00:00.000Z",
      pid: 67890,
    });

    const reread = readSessionFile();
    expect(reread!.mode).toBe("client");
    expect(reread!.pid).toBe(67890);
    expect(reread!.localPort).toBeUndefined();
  });

  test("deleteSessionFile elimina el archivo", async () => {
    const { writeSessionFile, deleteSessionFile, readSessionFile } = await import("../storage/session-store.js");
    writeSessionFile({ mode: "host", startedAt: "2025-01-01T00:00:00.000Z", pid: 111 });
    expect(readSessionFile()).not.toBeNull();

    deleteSessionFile();
    expect(readSessionFile()).toBeNull();
  });

  test("deleteSessionFile no falla si no existe", async () => {
    const { deleteSessionFile } = await import("../storage/session-store.js");
    expect(() => deleteSessionFile()).not.toThrow();
  });

  test("readPidFile retorna null si no existe", async () => {
    const { readPidFile } = await import("../storage/session-store.js");
    expect(readPidFile()).toBeNull();
  });

  test("writePidFile escribe pid del proceso", async () => {
    const { writePidFile, readPidFile } = await import("../storage/session-store.js");
    writePidFile();
    const pid = readPidFile();
    expect(pid).toBe(process.pid);
  });

  test("deletePidFile elimina pid file", async () => {
    const { writePidFile, deletePidFile, readPidFile } = await import("../storage/session-store.js");
    writePidFile();
    expect(readPidFile()).toBe(process.pid);

    deletePidFile();
    expect(readPidFile()).toBeNull();
  });

  test("deletePidFile no falla si no existe", async () => {
    const { deletePidFile } = await import("../storage/session-store.js");
    expect(() => deletePidFile()).not.toThrow();
  });

  test("readPidFile retorna null si contenido no es numero", async () => {
    const { getPidFilePath } = await import("../storage/collab-paths.js");
    const { readPidFile } = await import("../storage/session-store.js");
    writeFileSync(getPidFilePath(), "not-a-number\n");
    expect(readPidFile()).toBeNull();
  });

  test("isSessionActive retorna true si session file existe", async () => {
    const { writeSessionFile, isSessionActive } = await import("../storage/session-store.js");
    expect(isSessionActive()).toBeFalse();

    writeSessionFile({ mode: "host", startedAt: "2025-01-01T00:00:00.000Z", pid: 555 });
    expect(isSessionActive()).toBeTrue();
  });
});
