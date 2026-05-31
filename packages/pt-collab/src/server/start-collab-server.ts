import { RoomRegistry } from "./room-registry.js";
import { PeerRegistry } from "./peer-registry.js";
import { InMemoryAuthStore } from "./auth.js";
import { WebSocketHub } from "./websocket-hub.js";
import { startCollabHttpServer } from "./collab-http-server.js";
import { startServeOrFunnel } from "../tailscale/start-serve-or-funnel.js";
import { CheckpointStore } from "../storage/checkpoint-store.js";

export interface StartCollabServerOptions {
  host?: string;
  port?: number;
  path?: string;
  roomId: string;
  token?: string;
  storageDir?: string;
  autoTailscale?: "off" | "serve" | "funnel";
  funnelBg?: boolean;
  sessionSecret?: string;
}

export interface CollabServerHandle {
  localUrl: string;
  publicUrl: string | null;
  roomId: string;
  token: string;
  checkpointStore: CheckpointStore;
  close(): Promise<void>;
  sessionSecret?: string;
  publishCheckpoint(record: { checkpointId: string; roomId: string; peerId: string; sha256: string; byteSize: number; chunkCount: number; createdAt: string }, bytes: Uint8Array): void;
}

export async function createCollabServer(options: StartCollabServerOptions): Promise<CollabServerHandle> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3937;
  const path = options.path ?? "/collab";
  const roomId = options.roomId;
  const token = options.token ?? generateToken();
  const autoTailscale = options.autoTailscale ?? "off";
  const sessionSecret = options.sessionSecret;

  const roomRegistry = new RoomRegistry();
  const peerRegistry = new PeerRegistry();
  const authStore = new InMemoryAuthStore();
  const checkpointStore = new CheckpointStore(roomId);
  const websocketHub = new WebSocketHub(roomRegistry, peerRegistry, authStore);

  roomRegistry.getOrCreate(roomId, token);
  authStore.setRoomToken(roomId, token);

  const success = await startCollabHttpServer({
    host,
    port,
    path,
    roomRegistry,
    peerRegistry,
      websocketHub,
      checkpointStore,
      sessionSecrets: sessionSecret ? [sessionSecret] : undefined,
    });

  let publicUrl: string | null = null;

  if (autoTailscale !== "off") {
    const actualPort = success.url ? String(new URL(success.url).port) : String(port);
    const tailscaleResult = await startServeOrFunnel(Number(actualPort), autoTailscale);
    publicUrl = tailscaleResult.publicUrl;
  }

  const fullPublicUrl = publicUrl && sessionSecret
    ? `${publicUrl}/collab/s/${sessionSecret}`
    : publicUrl;

  return {
    localUrl: success.url,
    publicUrl: fullPublicUrl,
    roomId,
    token,
    checkpointStore,
    sessionSecret,
    publishCheckpoint(record, bytes) {
      checkpointStore.save(record);
      checkpointStore.writePktData(record.checkpointId, bytes);
      roomRegistry.setLatestCheckpoint(roomId, record.checkpointId);
    },
    async close() {
      await success.stop();
    },
  };
}

function generateToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ptc_${token}`;
}
