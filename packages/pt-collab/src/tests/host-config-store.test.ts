import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
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
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("host-config-store", () => {
  test("readHostConfig retorna null si no existe", async () => {
    const { readHostConfig } = await import("../storage/host-config-store.js");
    expect(readHostConfig()).toBeNull();
  });

  test("getOrCreateHostConfig crea config con sessionSecret", async () => {
    const { getOrCreateHostConfig, readHostConfig } = await import("../storage/host-config-store.js");
    const config = getOrCreateHostConfig(5000);

    expect(config.schemaVersion).toBe(1);
    expect(config.lastPort).toBe(5000);
    expect(config.sessionSecret).toBeDefined();
    expect(config.sessionSecret.length).toBe(12);
    expect(config.funnelPort).toBe(443);
    expect(config.lastStartedAt).toBeDefined();

    // persiste en disco
    const reread = readHostConfig();
    expect(reread).not.toBeNull();
    expect(reread!.sessionSecret).toBe(config.sessionSecret);
  });

  test("getOrCreateHostConfig actualiza existing config", async () => {
    const { getOrCreateHostConfig } = await import("../storage/host-config-store.js");
    const first = getOrCreateHostConfig(3937);
    const originalSecret = first.sessionSecret;

    const second = getOrCreateHostConfig(4000);
    expect(second.sessionSecret).toBe(originalSecret);
    expect(second.lastPort).toBe(4000);
  });

  test("getOrCreateHostConfig usa default port si no se pasa", async () => {
    const { getOrCreateHostConfig } = await import("../storage/host-config-store.js");
    const config = getOrCreateHostConfig();
    expect(config.lastPort).toBe(3937);
  });

  test("resetSessionSecret genera nuevo secret", async () => {
    const { getOrCreateHostConfig, resetSessionSecret } = await import("../storage/host-config-store.js");
    const original = getOrCreateHostConfig();
    const originalSecret = original.sessionSecret;

    const reset = resetSessionSecret();
    expect(reset.sessionSecret).not.toBe(originalSecret);
    expect(reset.sessionSecret.length).toBe(12);
  });

  test("resetSessionSecret funciona incluso si no hay config previa", async () => {
    const { resetSessionSecret, readHostConfig } = await import("../storage/host-config-store.js");
    const config = resetSessionSecret();
    expect(config.sessionSecret).toBeDefined();
    expect(config.schemaVersion).toBe(1);

    const reread = readHostConfig();
    expect(reread!.sessionSecret).toBe(config.sessionSecret);
  });

  test("writeHostConfig escribe archivo valido", async () => {
    const { writeHostConfig, readHostConfig } = await import("../storage/host-config-store.js");
    writeHostConfig({
      schemaVersion: 1,
      lastPort: 9999,
      sessionSecret: "testsecret1234",
      funnelPort: 443,
    });

    const reread = readHostConfig();
    expect(reread!.lastPort).toBe(9999);
    expect(reread!.sessionSecret).toBe("testsecret1234");
  });

  test("readHostConfig retorna null si JSON es invalido", async () => {
    const { getHostConfigPath } = await import("../storage/collab-paths.js");
    const { readHostConfig } = await import("../storage/host-config-store.js");
    const { writeFileSync } = await import("node:fs");

    writeFileSync(getHostConfigPath(), "not-json");
    expect(readHostConfig()).toBeNull();
  });
});
