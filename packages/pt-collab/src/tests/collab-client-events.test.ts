import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { createCollabServer, type CollabServerHandle } from "../server/start-collab-server.js";
import { CollabClient } from "../client/collab-client.js";

const ROOM_ID = "test-client-events-room";
const TOKEN = "ptc_clientevents001";

describe("CollabClient events", () => {
  let server: CollabServerHandle;

  beforeAll(async () => {
    server = await createCollabServer({ roomId: ROOM_ID, token: TOKEN, port: 0 });
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  test("on('delta.commit') recibe mensajes reales", async () => {
    const received = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 5000);
      const clientA = new CollabClient({
        url: server.localUrl,
        roomId: ROOM_ID,
        token: TOKEN,
        peerId: "client-event-a",
        displayName: "ClientA",
        onWelcome() {
          setTimeout(() => {
            clientB.sendDelta({
              id: "delta-1",
              roomId: ROOM_ID,
              peerId: clientB.peerId,
              seq: 1,
              lamport: 1,
              createdAt: new Date().toISOString(),
              baseVector: {},
              scope: "topology",
              kind: "topology.device.added",
              payload: { name: "R1", model: "2911" },
            } as never);
          }, 50);
        },
        onError(msg) {
          clearTimeout(timeout);
          reject(new Error(msg.message));
        },
      });

      const clientB = new CollabClient({
        url: server.localUrl,
        roomId: ROOM_ID,
        token: TOKEN,
        peerId: "client-event-b",
        displayName: "ClientB",
        onError(msg) {
          clearTimeout(timeout);
          reject(new Error(msg.message));
        },
      });

      clientA.connect();
      clientB.connect();

      const off = clientA.on("delta.commit", (msg) => {
        clearTimeout(timeout);
        off();
        clientA.disconnect();
        clientB.disconnect();
        resolve(msg.delta.id);
      });
    });

    expect(received).toBe("delta-1");
  });
});
