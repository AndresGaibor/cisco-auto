import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
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

describe("client-config-store", () => {
  test("readClientConfig retorna null si no existe", async () => {
    const { readClientConfig } = await import("../storage/client-config-store.js");
    expect(readClientConfig()).toBeNull();
  });

  test("writeClientConfig escribe y readClientConfig lee", async () => {
    const { writeClientConfig, readClientConfig } = await import("../storage/client-config-store.js");
    writeClientConfig({
      schemaVersion: 1,
      lastUrl: "https://example.ts.net/collab/s/abc123",
      peerId: "test-peer",
      displayName: "TestUser",
      autoReconnect: true,
    });

    const reread = readClientConfig();
    expect(reread).not.toBeNull();
    expect(reread!.lastUrl).toBe("https://example.ts.net/collab/s/abc123");
    expect(reread!.peerId).toBe("test-peer");
    expect(reread!.displayName).toBe("TestUser");
    expect(reread!.autoReconnect).toBeTrue();
  });

  test("writeClientConfig crea directorio si no existe", async () => {
    const { writeClientConfig, readClientConfig } = await import("../storage/client-config-store.js");
    writeClientConfig({ schemaVersion: 1, autoReconnect: true });
    expect(readClientConfig()).not.toBeNull();
  });

  test("updateClientUrl crea config desde cero y guarda URL", async () => {
    const { updateClientUrl, readClientConfig } = await import("../storage/client-config-store.js");
    const url = "https://host1.ts.net/collab/s/test123";
    const config = updateClientUrl(url, "Andres");

    expect(config.lastUrl).toBe(url);
    expect(config.displayName).toBe("Andres");
    expect(config.schemaVersion).toBe(1);
    expect(config.autoReconnect).toBeTrue();
    expect(config.lastConnectedAt).toBeDefined();

    const reread = readClientConfig();
    expect(reread!.lastUrl).toBe(url);
  });

  test("updateClientUrl preserva config existente", async () => {
    const { writeClientConfig, updateClientUrl, readClientConfig } = await import("../storage/client-config-store.js");
    writeClientConfig({
      schemaVersion: 1,
      peerId: "existing-peer",
      displayName: "Original",
      autoReconnect: false,
    });

    updateClientUrl("https://new.ts.net/collab/s/new123");
    const reread = readClientConfig();
    expect(reread!.peerId).toBe("existing-peer");
    expect(reread!.displayName).toBe("Original");
    expect(reread!.autoReconnect).toBeFalse();
    expect(reread!.lastUrl).toBe("https://new.ts.net/collab/s/new123");
  });

  test("resetClientUrl elimina lastUrl", async () => {
    const { updateClientUrl, resetClientUrl, readClientConfig } = await import("../storage/client-config-store.js");
    updateClientUrl("https://test.ts.net/collab/s/abc");
    expect(readClientConfig()!.lastUrl).toBeDefined();

    resetClientUrl();
    expect(readClientConfig()!.lastUrl).toBeUndefined();
  });

  test("resetClientUrl no falla si no hay config", async () => {
    const { resetClientUrl } = await import("../storage/client-config-store.js");
    expect(() => resetClientUrl()).not.toThrow();
  });

  test("readClientConfig retorna null si JSON es invalido", async () => {
    const { getClientConfigPath } = await import("../storage/collab-paths.js");
    const { readClientConfig } = await import("../storage/client-config-store.js");
    const { writeFileSync } = await import("node:fs");

    writeFileSync(getClientConfigPath(), "not-json");
    expect(readClientConfig()).toBeNull();
  });
});
