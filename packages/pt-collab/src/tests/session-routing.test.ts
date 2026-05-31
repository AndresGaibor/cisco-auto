import { describe, expect, test, afterAll } from "bun:test";
import { createCollabServer, type CollabServerHandle } from "../server/start-collab-server.js";
import { CheckpointStore } from "../storage/checkpoint-store.js";

const ROOM_ID = "default";
const TOKEN = "ptc_testsecretrouting01";
const SESSION_SECRET = "he110w0rldxyz";

describe("session-based routing /collab/s/:secret/*", () => {
  let server: CollabServerHandle;

  test("createCollabServer con sessionSecret", async () => {
    server = await createCollabServer({
      roomId: ROOM_ID,
      token: TOKEN,
      sessionSecret: SESSION_SECRET,
      port: 0,
    });

    expect(server.sessionSecret).toBe(SESSION_SECRET);
    expect(server.localUrl).toBeDefined();
  });

  test("GET /collab/s/:secret/health retorna 200", async () => {
    const res = await fetch(`${server.localUrl}/s/${SESSION_SECRET}/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.service).toBe("pt-collab");
  });

  test("GET /collab/s/:secret/info retorna info con peers", async () => {
    const res = await fetch(`${server.localUrl}/s/${SESSION_SECRET}/info`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.service).toBe("pt-collab");
    expect(body.mode).toBe("simple");
    expect(typeof body.peers).toBe("number");
  });

  test("GET /collab/s/:secret/peers retorna lista vacia sin conexiones", async () => {
    const res = await fetch(`${server.localUrl}/s/${SESSION_SECRET}/peers`);
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; peers: unknown[]; count: number };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.peers)).toBe(true);
    expect(body.count).toBe(0);
  });

  test("GET /collab/s/:secret/checkpoint/latest retorna checkpointId null", async () => {
    const res = await fetch(`${server.localUrl}/s/${SESSION_SECRET}/checkpoint/latest`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.checkpointId).toBeDefined();
  });

  test("GET /collab/s/:secret/checkpoint/:id retorna bytes", async () => {
    const store = new CheckpointStore(ROOM_ID);
    const checkpointId = "cp-routing-test";
    const data = new Uint8Array([1, 2, 3, 4]);
    store.writePktData(checkpointId, data);
    store.save({
      checkpointId,
      roomId: ROOM_ID,
      peerId: "peer-1",
      sha256: "abcd",
      byteSize: data.length,
      chunkCount: 1,
      createdAt: new Date().toISOString(),
    });

    const res = await fetch(`${server.localUrl}/s/${SESSION_SECRET}/checkpoint/${checkpointId}`);
    expect(res.status).toBe(200);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  test("GET /collab/s/:secret/invalid retorna 404", async () => {
    const res = await fetch(`${server.localUrl}/s/${SESSION_SECRET}/nonexistent`);
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(body.error).toBe("not_found");
  });

  test("GET /collab/s/invalidsecret/health retorna 404 por session invalida", async () => {
    const res = await fetch(`${server.localUrl}/s/badsecret1234/health`);
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(false);
    expect(body.error).toBe("session_not_found");
  });

  test("WebSocket upgrade en /collab/s/:secret/socket funciona", async () => {
    const wsUrl = server.localUrl.replace("http://", "ws://") + `/s/${SESSION_SECRET}/socket`;
    const ws = new WebSocket(wsUrl);

    const welcome = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "hello",
          protocolVersion: 1,
          peerId: "session-peer-1",
          displayName: "SessionPeer",
          capabilities: [],
        }));
      };

      ws.onmessage = (event: MessageEvent) => {
        clearTimeout(timeout);
        const msg = JSON.parse(event.data as string) as Record<string, unknown>;
        resolve(msg);
        setTimeout(() => ws.close(), 100);
      };

      ws.onerror = () => {};
    });

    expect(welcome.type).toBe("welcome");
    expect(welcome.roomId).toBe("default");

    ws.close();
  });

  test("WebSocket upgrade en /collab/s/badsecret/socket falla (no upgrade)", async () => {
    const wsUrl = server.localUrl.replace("http://", "ws://") + "/s/badsecret1234/socket";
    const ws = new WebSocket(wsUrl);

    const result = await new Promise<string>((resolve) => {
      const timeout = setTimeout(() => resolve("timeout"), 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve("open");
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve("error");
      };

      ws.onclose = (ev) => {
        clearTimeout(timeout);
        resolve(`close:${ev.code}`);
      };
    });

    // No deberia abrirse porque session not found
    expect(result).not.toBe("open");
  });

  afterAll(async () => {
    if (server) await server.close();
  });
});
