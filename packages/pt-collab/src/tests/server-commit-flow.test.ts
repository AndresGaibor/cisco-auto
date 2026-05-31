import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { createCollabServer, type CollabServerHandle } from "../server/start-collab-server.js";

const ROOM_ID = "test-commit-flow-room";
const TOKEN = "ptc_commitflowtok001";

describe("server commit flow", () => {
  let server: CollabServerHandle;

  beforeAll(async () => {
    server = await createCollabServer({ roomId: ROOM_ID, token: TOKEN, port: 0 });
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  test("delta.submit se convierte en delta.commit", async () => {
    const clientA = new WebSocket(server.localUrl.replace("http://", "ws://") + "/socket");
    const clientB = new WebSocket(server.localUrl.replace("http://", "ws://") + "/socket");

    const received = new Promise<Record<string, unknown>>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 5000);

      clientB.onopen = () => {
        clientB.send(JSON.stringify({
          type: "hello",
          protocolVersion: 1,
          roomId: ROOM_ID,
          token: TOKEN,
          peerId: "peer-b",
          displayName: "PeerB",
          capabilities: ["topology.events"],
        }));
      };

      clientB.onmessage = (event) => {
        const msg = JSON.parse(String(event.data)) as Record<string, unknown>;
        if (msg.type === "welcome") return;
        if (msg.type === "delta.commit") {
          clearTimeout(timeout);
          resolve(msg);
        }
      };

      clientA.onopen = () => {
        clientA.send(JSON.stringify({
          type: "hello",
          protocolVersion: 1,
          roomId: ROOM_ID,
          token: TOKEN,
          peerId: "peer-a",
          displayName: "PeerA",
          capabilities: ["topology.events"],
        }));

        setTimeout(() => {
          clientA.send(JSON.stringify({
            type: "delta.submit",
            timestamp: new Date().toISOString(),
            delta: {
              id: "delta-commit-1",
              roomId: ROOM_ID,
              peerId: "peer-a",
              seq: 1,
              lamport: 1,
              createdAt: new Date().toISOString(),
              baseVector: {},
              scope: "topology",
              kind: "topology.device.added",
              payload: { name: "R1", model: "2911" },
            },
          }));
        }, 100);
      };

      clientA.onerror = clientB.onerror = () => reject(new Error("websocket error"));
    });

    const msg = await received;
    expect(msg.type).toBe("delta.commit");
    expect((msg as { delta: { id: string } }).delta.id).toBe("delta-commit-1");

    clientA.close();
    clientB.close();
  });
});
