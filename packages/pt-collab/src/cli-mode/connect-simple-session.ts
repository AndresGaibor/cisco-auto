import { CollabClient } from "../client/collab-client.js";
import { AutoSyncService } from "../sync/auto-sync.js";
import { readClientConfig, updateClientUrl, resetClientUrl } from "../storage/client-config-store.js";
import { writeSessionFile, deleteSessionFile } from "../storage/session-store.js";
import type { CollabClientOptions, CollabClientStatus } from "../client/collab-client.js";
import type { TopologySnapshot } from "../detector/change-detector.js";

export interface ConnectSimpleSessionOptions {
  url?: string;
  name?: string;
  resetUrl?: boolean;
  json?: boolean;
  pollIntervalMs?: number;
  peerId?: string;
}

export interface ConnectSimpleSessionResult {
  client: CollabClient;
  sync?: AutoSyncService;
  peerId: string;
  url: string;
  close(): void;
}

export async function connectSimpleSession(
  opts: ConnectSimpleSessionOptions,
): Promise<ConnectSimpleSessionResult> {
  let url = opts.url;

  if (opts.resetUrl) {
    resetClientUrl();
  }

  if (!url) {
    const cfg = readClientConfig();
    url = cfg?.lastUrl;
  }

  if (!url) {
    throw new Error("NO_URL");
  }

  const cfg = readClientConfig();
  const displayName = opts.name ?? cfg?.displayName ?? `peer_${Math.random().toString(36).slice(2, 6)}`;
  const peerId = opts.peerId ?? cfg?.peerId ?? `peer_${Math.random().toString(36).slice(2, 10)}`;

  updateClientUrl(url, displayName);

  const client = await connectWithTimeout({
    url,
    peerId,
    displayName,
    capabilities: ["topology.events", "topology.apply", "ios.readConfig"],
    timeoutMs: 15000,
  });

  writeSessionFile({
    mode: "client",
    publicUrl: url,
    startedAt: new Date().toISOString(),
    pid: process.pid,
  });

  return {
    client,
    peerId: client.peerId,
    url,
    close() {
      client.disconnect();
      deleteSessionFile();
    },
  };
}

export function getSavedUrl(): string | undefined {
  const cfg = readClientConfig();
  return cfg?.lastUrl ?? undefined;
}

function connectWithTimeout(
  opts: CollabClientOptions & { timeoutMs?: number },
): Promise<CollabClient> {
  return new Promise((resolve, reject) => {
    const timeoutMs = opts.timeoutMs ?? 15000;
    const client = new CollabClient({
      ...opts,
      onStatusChange(status: CollabClientStatus) {
        if (status === "connected") {
          clearTimeout(timer);
          resolve(client);
        }
        if (status === "disconnected" && client.getStatus() !== "connecting") {
          clearTimeout(timer);
          reject(new Error("Connection rejected"));
        }
      },
      onError(msg) {
        clearTimeout(timer);
        reject(new Error(`${msg.code}: ${msg.message}`));
      },
    });
    const timer = setTimeout(() => {
      client.disconnect();
      reject(new Error("Connection timeout"));
    }, timeoutMs);
    client.connect();
  });
}

export function formatPeerCount(client: CollabClient): number {
  return client.peers.length;
}
