import type { ServerWebSocket } from "bun";
import { RoomRegistry } from "./room-registry.js";
import { PeerRegistry } from "./peer-registry.js";
import { WebSocketHub } from "./websocket-hub.js";
import { CheckpointStore } from "../storage/checkpoint-store.js";

export interface CollabHttpServerConfig {
  host: string;
  port: number;
  path: string;
  roomRegistry: RoomRegistry;
  peerRegistry: PeerRegistry;
  websocketHub: WebSocketHub;
  checkpointStore: CheckpointStore;
  sessionSecrets?: string[];
  checkoutpointLatestUrl?: string;
}

export interface CollabHttpServerHandle {
  url: string;
  stop(): Promise<void>;
}

export async function startCollabHttpServer(config: CollabHttpServerConfig): Promise<CollabHttpServerHandle> {
  const { host, port, path, roomRegistry, peerRegistry, websocketHub, checkpointStore, sessionSecrets = [] } = config;

  return await new Promise<CollabHttpServerHandle>((resolve) => {
    const server = Bun.serve<{ sessionSecret?: string; roomId?: string }>({
      hostname: host,
      port,
      async fetch(req: Request): Promise<Response | undefined> {
        const url = new URL(req.url);
        const isWs = req.headers.get("upgrade") === "websocket";

        // Health
        if (url.pathname === "/healthz") {
          return Response.json({ ok: true, service: "pt-collab", uptime: new Date().toISOString() });
        }

        if (url.pathname === `${path}/healthz`) {
          return Response.json({ ok: true, service: "pt-collab" });
        }

        // Session-based routes: /collab/s/:sessionSecret/:action
        const sessionMatch = url.pathname.match(/^\/collab\/s\/([a-z0-9]+)\/(.+)$/);
        if (sessionMatch) {
          const sessionSecret = sessionMatch[1]!;
          const action = sessionMatch[2]!;

          if (!sessionSecrets.includes(sessionSecret)) {
            return Response.json({ ok: false, error: "session_not_found" }, { status: 404 });
          }

          if (action === "socket" && isWs) {
            if ((server as any).upgrade(req, {
              data: { sessionSecret, roomId: "default" },
            })) return;
            return new Response("upgrade failed", { status: 400 });
          }

          if (action === "health") {
            return Response.json({ ok: true, service: "pt-collab" });
          }

          if (action === "info") {
            return Response.json({
              ok: true,
              service: "pt-collab",
              mode: "simple",
              peers: peerRegistry.getPeerCount("default"),
              uptime: new Date().toISOString(),
            });
          }

          if (action === "peers") {
            const peers = peerRegistry.getPeers("default");
            return Response.json({ ok: true, peers, count: peers.length });
          }

          if (action === "checkpoint/latest") {
            const latest = checkpointStore.latest();
            return Response.json({ ok: true, checkpointId: latest?.checkpointId ?? null, sha256: latest?.sha256 ?? null, byteSize: latest?.byteSize ?? null });
          }

          const checkpointMatch = action.match(/^checkpoint\/([^/]+)$/);
          if (checkpointMatch) {
            const checkpointId = checkpointMatch[1]!;
            const bytes = checkpointStore.readPktData(checkpointId);
            if (!bytes) return Response.json({ ok: false, error: "checkpoint_not_found" }, { status: 404 });
            return new Response(bytes, { headers: { "content-type": "application/octet-stream" } });
          }

          return Response.json({ ok: false, error: "not_found" }, { status: 404 });
        }

        // Legacy room-based routes
        if (url.pathname === `${path}/socket` && isWs) {
          if ((server as any).upgrade(req)) return;
          return new Response("upgrade failed", { status: 400 });
        }

        if (url.pathname === `${path}/rooms`) {
          const roomIds = roomRegistry.getAllRoomIds();
          return Response.json({ ok: true, rooms: roomIds });
        }

        const roomsMatch = url.pathname.match(new RegExp(`^${path}/rooms/([^/]+)$`));
        if (roomsMatch) {
          const roomId = roomsMatch[1];
          if (!roomId) return Response.json({ ok: false, error: "invalid_room_id" }, { status: 400 });
          const room = roomRegistry.get(roomId);
          if (!room) return Response.json({ ok: false, error: "room_not_found" }, { status: 404 });
          return Response.json({ ok: true, room });
        }

        const peersMatch = url.pathname.match(new RegExp(`^${path}/rooms/([^/]+)/peers$`));
        if (peersMatch) {
          const roomId = peersMatch[1];
          if (!roomId) return Response.json({ ok: false, error: "invalid_room_id" }, { status: 400 });
          const peers = peerRegistry.getPeers(roomId);
          return Response.json({ ok: true, peers, count: peers.length });
        }

        const conflictsMatch = url.pathname.match(new RegExp(`^${path}/rooms/([^/]+)/conflicts$`));
        if (conflictsMatch) {
          return Response.json({ ok: true, conflicts: [] });
        }

        return Response.json({ ok: false, error: "not_found" }, { status: 404 });
      },
      websocket: {
        open(ws: ServerWebSocket<{ sessionSecret?: string; roomId?: string }>) {
          websocketHub.handleOpen(ws);
        },
        message(ws: ServerWebSocket<{ sessionSecret?: string; roomId?: string }>, message: string | Buffer) {
          const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
          websocketHub.handleMessage(ws, raw);
        },
        close(ws: ServerWebSocket<{ sessionSecret?: string; roomId?: string }>) {
          websocketHub.handleClose(ws);
        },
      },
    });

    const localUrl = `http://${host}:${server.port}${path}`;

    resolve({
      url: localUrl,
      async stop() {
        server.stop(true);
      },
    });
  });
}
