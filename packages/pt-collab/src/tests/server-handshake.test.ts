import { describe, expect, test, afterAll } from "bun:test";
import { createCollabServer, type CollabServerHandle } from "../server/start-collab-server.js";
import type { WelcomeMessage, ErrorMessage } from "../protocol/messages.js";

const ROOM_ID = "test-room-handshake";
const TOKEN = "ptc_testtokenhandshake001";

describe("servidor collab handshake WebSocket", () => {
  let server: CollabServerHandle;
  const port = 0;

  test("createCollabServer inicia y responde healthz", async () => {
    server = await createCollabServer({ roomId: ROOM_ID, token: TOKEN, port: 0 });

    expect(server).toBeDefined();
    expect(server.localUrl).toBeTruthy();
    expect(server.roomId).toBe(ROOM_ID);
    expect(server.token).toBe(TOKEN);

    const res = await fetch(`${server.localUrl}/healthz`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.service).toBe("pt-collab");
  });

  test("WebSocket handshake exitoso con hello/welcome", async () => {
    const wsUrl = server.localUrl.replace("http://", "ws://") + "/socket";
    const ws = new WebSocket(wsUrl);

    const messages: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout en handshake")), 5000);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "hello",
          protocolVersion: 1,
          roomId: ROOM_ID,
          peerId: "peer-test-1",
          displayName: "TestPeer",
          token: TOKEN,
          capabilities: ["topology.events", "ios.readConfig"],
        }));
      };

      ws.onmessage = (event: MessageEvent) => {
        messages.push(event.data as string);
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        clearTimeout(timeout);
        resolve();
      };

      setTimeout(() => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }, 3000);
    });

    const parsed = messages.map((m) => JSON.parse(m) as Record<string, unknown>);
    const welcomeMsg = parsed.find((m) => m.type === "welcome") as WelcomeMessage | undefined;

    expect(welcomeMsg).toBeDefined();
    expect(welcomeMsg!.type).toBe("welcome");
    expect(welcomeMsg!.roomId).toBe(ROOM_ID);
    expect(welcomeMsg!.assignedPeerId).toBe("peer-test-1");
    expect(welcomeMsg!.peers).toBeDefined();
    expect(Array.isArray(welcomeMsg!.peers)).toBe(true);
  });

  test("WebSocket handshake con token inválido devuelve error", async () => {
    const wsUrl = server.localUrl.replace("http://", "ws://") + "/socket";
    const ws = new WebSocket(wsUrl);

    const messages: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "hello",
          protocolVersion: 1,
          roomId: ROOM_ID,
          peerId: "peer-bad-token",
          displayName: "BadToken",
          token: "ptc_wrongtoken",
          capabilities: [],
        }));
      };

      ws.onmessage = (event: MessageEvent) => {
        messages.push(event.data as string);
      };

      ws.onerror = () => {};
      ws.onclose = () => {
        clearTimeout(timeout);
        resolve();
      };

      setTimeout(() => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      }, 3000);
    });

    const parsed = messages.map((m) => JSON.parse(m) as Record<string, unknown>);
    const errorMsg = parsed.find((m) => m.type === "error") as ErrorMessage | undefined;

    expect(errorMsg).toBeDefined();
    expect(errorMsg!.code).toBe("auth_failed");
  });

  test("GET /collab/rooms devuelve la sala", async () => {
    const res = await fetch(`${server.localUrl}/rooms`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; rooms: string[] };
    expect(body.ok).toBe(true);
    expect(body.rooms).toContain(ROOM_ID);
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });
});
