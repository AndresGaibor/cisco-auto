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

  const diagnosis = await diagnoseUrl(url);
  if (diagnosis.tlsWarning) {
    process.stderr.write(
      `Advertencia TLS: ${diagnosis.tlsWarning}\n` +
      `  Intentando conectar de todas formas...\n`,
    );
  }

  const client = await connectWithTimeout({
    url,
    peerId,
    displayName,
    capabilities: ["topology.events", "topology.apply", "ios.readConfig"],
    timeoutMs: 15000,
    rejectUnauthorized: diagnosis.tlsWarning ? false : undefined,
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

async function diagnoseUrl(url: string): Promise<{ tlsWarning?: string }> {
  const healthUrl = url.replace(/\/?$/, "/health");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(healthUrl, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const body = await res.json() as { ok?: boolean; service?: string };
    if (!body.ok || body.service !== "pt-collab") {
      throw new Error(`respuesta inesperada: ${JSON.stringify(body)}`);
    }
    return {};
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Server timeout (5s)");
    }
    const msg = err instanceof Error ? err.message : String(err);
    const isTls = /certificate|TLS|SSL|cert/i.test(msg);
    if (isTls) {
      return { tlsWarning: msg };
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
          const closeEvent = client.getLastCloseEvent();
          const detail = closeEvent
            ? `código=${closeEvent.code}, razón="${closeEvent.reason}"`
            : "sin detalle";
          reject(new Error(`Connection rejected (${detail})`));
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
