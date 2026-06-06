import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { bootstrapLatestCheckpoint } from "../checkpoint/bootstrap-checkpoint.js";
import { createHash } from "node:crypto";

describe("bootstrapLatestCheckpoint", () => {
  const originalFetch = globalThis.fetch;

  function mockFetchOk(body: any, bytes: Uint8Array): typeof fetch {
    return mock(async (url: string) => {
      if (url.includes("/checkpoint/latest")) {
        return new Response(JSON.stringify(body), { status: 200 });
      }
      if (url.includes("/checkpoint/")) {
        return new Response(bytes, { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;
  }

  function mockFetchError(): typeof fetch {
    return mock(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
  }

  const fakeController = {
    project: {
      open: async (path: string) => ({ ok: true, path }),
    },
  };

  let tempDir: string;

  beforeEach(() => {
    tempDir = `/tmp/pt-collab-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("retorna error si no puede acceder al servidor", async () => {
    globalThis.fetch = mockFetchError();
    const result = await bootstrapLatestCheckpoint({
      checkpointBaseUrl: "http://localhost:3937",
      controller: fakeController,
      tempDir,
    });
    expect(result.checked).toBe(true);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("No se pudo acceder");
  });

  test("retorna error si la respuesta HTTP no es ok", async () => {
    globalThis.fetch = mock(async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    const result = await bootstrapLatestCheckpoint({
      checkpointBaseUrl: "http://localhost:3937",
      controller: fakeController,
      tempDir,
    });
    expect(result.checked).toBe(true);
    expect(result.error).toContain("HTTP 500");
  });

  test("retorna error si no hay checkpoint disponible", async () => {
    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({ ok: false }), { status: 200 }),
    ) as unknown as typeof fetch;
    const result = await bootstrapLatestCheckpoint({
      checkpointBaseUrl: "http://localhost:3937",
      controller: fakeController,
      tempDir,
    });
    expect(result.error).toBe("No hay checkpoint disponible en el servidor");
  });

  test("rechaza checkpoint con SHA256 incorrecto (validación de integridad)", async () => {
    const realBytes = new TextEncoder().encode("contenido valido del archivo pkt");
    const fakeSha = "a".repeat(64);

    globalThis.fetch = mockFetchOk({ ok: true, checkpointId: "cp_123", sha256: fakeSha }, realBytes);

    const result = await bootstrapLatestCheckpoint({
      checkpointBaseUrl: "http://localhost:3937",
      controller: fakeController,
      tempDir,
    });

    expect(result.checked).toBe(true);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Fallo de integridad");
    expect(result.downloaded).toBe(false);
  });

  test("acepta checkpoint con SHA256 correcto", async () => {
    const realBytes = new TextEncoder().encode("contenido valido del archivo pkt");
    const correctSha = createHash("sha256").update(realBytes).digest("hex");

    globalThis.fetch = mockFetchOk({ ok: true, checkpointId: "cp_456", sha256: correctSha }, realBytes);

    const result = await bootstrapLatestCheckpoint({
      checkpointBaseUrl: "http://localhost:3937",
      controller: fakeController,
      tempDir,
    });

    expect(result.checked).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.downloaded).toBe(true);
    expect(result.opened).toBe(true);
    expect(result.checkpointId).toBe("cp_456");
  });

  test("acepta checkpoint sin SHA256 declarado (compatibilidad)", async () => {
    const realBytes = new TextEncoder().encode("archivo sin hash");

    globalThis.fetch = mockFetchOk({ ok: true, checkpointId: "cp_789" }, realBytes);

    const result = await bootstrapLatestCheckpoint({
      checkpointBaseUrl: "http://localhost:3937",
      controller: fakeController,
      tempDir,
    });

    expect(result.downloaded).toBe(true);
    expect(result.opened).toBe(true);
  });

  test("reporta fallo si la descarga HTTP falla", async () => {
    globalThis.fetch = mock(async (url: string) => {
      if (url.includes("/checkpoint/latest")) {
        return new Response(JSON.stringify({ ok: true, checkpointId: "cp_fail" }), { status: 200 });
      }
      return new Response("error", { status: 404 });
    }) as unknown as typeof fetch;

    const result = await bootstrapLatestCheckpoint({
      checkpointBaseUrl: "http://localhost:3937",
      controller: fakeController,
      tempDir,
    });

    expect(result.error).toContain("No se pudo descargar");
  });
});
