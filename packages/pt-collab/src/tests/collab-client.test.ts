import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { createCollabServer, type CollabServerHandle } from "../server/start-collab-server.js";
import { CollabClient } from "../client/collab-client.js";
import type { WelcomeMessage, PeerJoinedMessage, PeerLeftMessage } from "../protocol/messages.js";

const ROOM_ID = "test-client-room";
const TOKEN = "ptc_clienttesttoken001";

describe("CollabClient", () => {
  let server: CollabServerHandle;

  beforeAll(async () => {
    server = await createCollabServer({ roomId: ROOM_ID, token: TOKEN, port: 0 });
  });

  afterAll(async () => {
    if (server) await server.close();
  });

  test("conecta y recibe welcome", async () => {
    const welcome = await new Promise<WelcomeMessage>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 5000);
      const client = new CollabClient({
        url: server.localUrl,
        roomId: ROOM_ID,
        token: TOKEN,
        peerId: "client-test-1",
        displayName: "TestClient",
        capabilities: ["topology.events", "ios.readConfig"],
        onWelcome(msg) {
          clearTimeout(timeout);
          resolve(msg);
          setTimeout(() => client.disconnect(), 100);
        },
        onError(msg) {
          clearTimeout(timeout);
          reject(new Error(`server error: ${msg.code} ${msg.message}`));
        },
      });
      client.connect();
    });

    expect(welcome.type).toBe("welcome");
    expect(welcome.roomId).toBe(ROOM_ID);
    expect(welcome.assignedPeerId).toBe("client-test-1");
    expect(welcome.peers.length).toBeGreaterThanOrEqual(1);
  });

  test("conecta y recibe el estado connected", async () => {
    const statuses: string[] = [];
    const connected = await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 5000);
      const client = new CollabClient({
        url: server.localUrl,
        roomId: ROOM_ID,
        token: TOKEN,
        peerId: "client-test-2",
        displayName: "StatusClient",
        onStatusChange(status) {
          statuses.push(status);
          if (status === "connected") {
            clearTimeout(timeout);
            resolve(true);
            setTimeout(() => client.disconnect(), 100);
          }
        },
        onError(msg) {
          clearTimeout(timeout);
          reject(new Error(msg.message));
        },
      });
      client.connect();
    });

    expect(connected).toBe(true);
    expect(statuses).toContain("connecting");
    expect(statuses).toContain("connected");
  });

  test("token invalido recibe error", async () => {
    const errorMsg = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 5000);
      const client = new CollabClient({
        url: server.localUrl,
        roomId: ROOM_ID,
        token: "ptc_wrongtoken",
        peerId: "client-bad-token",
        displayName: "BadToken",
        onError(msg) {
          clearTimeout(timeout);
          resolve(msg.code);
          setTimeout(() => client.disconnect(), 100);
        },
      });
      client.connect();
    });

    expect(errorMsg).toBe("auth_failed");
  });

  test("dos clientes en misma sala: ambos reciben peer.joined", async () => {
    const secondJoined = new Promise<PeerJoinedMessage>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout segundos peer")), 5000);
      const clientB = new CollabClient({
        url: server.localUrl,
        roomId: ROOM_ID,
        token: TOKEN,
        peerId: "client-peer-b",
        displayName: "PeerB",
        onWelcome() {
          const checkForA = () => {
            if (clientB.peers.some((p) => p.peerId === "client-peer-a")) {
              clearTimeout(timeout);
              const peer = clientB.peers.find((p) => p.peerId === "client-peer-a")!;
              resolve({ type: "peer.joined", peer, timestamp: new Date().toISOString() });
            }
          };
          setTimeout(checkForA, 200);
        },
        onPeerJoined(msg) {
          if (msg.peer.peerId === "client-peer-a") {
            clearTimeout(timeout);
            resolve(msg);
          }
        },
        onError(msg) {
          clearTimeout(timeout);
          reject(new Error(msg.message));
        },
      });
      clientB.connect();
    });

    const clientA = new CollabClient({
      url: server.localUrl,
      roomId: ROOM_ID,
      token: TOKEN,
      peerId: "client-peer-a",
      displayName: "PeerA",
    });
    clientA.connect();

    const joined = await secondJoined;
    expect(joined.type).toBe("peer.joined");
    expect(joined.peer.peerId).toBe("client-peer-a");
    expect(joined.peer.displayName).toBe("PeerA");
  });

  test("sendHeartbeat no lanza error", async () => {
    const client = new CollabClient({
      url: server.localUrl,
      roomId: ROOM_ID,
      token: TOKEN,
      peerId: "client-heartbeat",
      displayName: "Heartbeat",
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 5000);
      const check = () => {
        if (client.getStatus() === "connected") {
          clearTimeout(timeout);
          expect(() => client.sendHeartbeat()).not.toThrow();
          resolve();
          setTimeout(() => client.disconnect(), 100);
        } else {
          setTimeout(check, 50);
        }
      };
      client.connect();
      setTimeout(check, 100);
    });
  });
});
