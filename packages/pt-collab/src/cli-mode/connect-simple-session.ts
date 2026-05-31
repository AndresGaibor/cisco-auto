import { CollabClient } from "../client/collab-client.js";
import { AutoSyncService } from "../sync/auto-sync.js";
import { PTSyncCoordinator } from "../sync/pt-sync-coordinator.js";
import { bootstrapLatestCheckpoint, type BootstrapResult } from "../checkpoint/bootstrap-checkpoint.js";
import { readClientConfig, updateClientUrl, updatePeerId, resetClientUrl } from "../storage/client-config-store.js";
import { readSessionFile, writeSessionFile, deleteSessionFile } from "../storage/session-store.js";
import type { CollabClientOptions, CollabClientStatus } from "../client/collab-client.js";

export interface ConnectSimpleSessionOptions {
  url?: string;
  name?: string;
  controller?: {
    start(): Promise<void>;
    stop(): Promise<void>;
    snapshot(): Promise<unknown>;
    project?: {
      status(): Promise<{
        ok?: boolean;
        project?: {
          hasActiveFile?: boolean;
          activeFile?: string | null;
        };
      }>;
      open(path: string, options?: { wait?: boolean; waitTimeoutMs?: number }): Promise<unknown>;
      /** Disponible en PTController. Permite obtener el SHA256 del proyecto actual. */
      autosave?(options?: { dir?: string; keep?: number }): Promise<{
        ok: boolean;
        autosavePath: string;
        bytes: number;
        sha256: string;
      }>;
    };
    addDevice(name: string, model: string, options?: { x?: number; y?: number }): Promise<unknown>;
    removeDevice(name: string): Promise<void>;
    renameDevice(oldName: string, newName: string): Promise<void>;
    moveDevice(name: string, x: number, y: number): Promise<unknown>;
    addLink(device1: string, port1: string, device2: string, port2: string, linkType?: string): Promise<unknown>;
    removeLink(device: string, port: string): Promise<void>;
    configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<void>;
  };
  resetUrl?: boolean;
  json?: boolean;
  pollIntervalMs?: number;
  peerId?: string;
}

export interface ConnectSimpleSessionResult {
  client: CollabClient;
  sync?: AutoSyncService;
  coordinator?: PTSyncCoordinator;
  bootstrap?: BootstrapResult;
  peerId: string;
  url: string;
  close(): Promise<void>;
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

  let bootstrap: BootstrapResult | undefined;

  if (opts.controller) {
    await opts.controller.start();

    if (opts.controller.project?.open) {
      const clientConfig = readClientConfig();
      const sessionInfo = readSessionFile();
      const skipBootstrap = await shouldSkipCheckpointBootstrap({
        controller: opts.controller,
        url,
        clientConfig,
        sessionInfo,
      });

      if (skipBootstrap) {
        bootstrap = {
          checked: true,
          opened: false,
          downloaded: false,
          skippedExistingProject: true,
        };
      } else {
        bootstrap = await bootstrapLatestCheckpoint({
          checkpointBaseUrl: url,
          controller: opts.controller as { project?: { open(path: string, options?: { wait?: boolean; waitTimeoutMs?: number }): Promise<unknown> } },
        });

        if (!bootstrap.opened) {
          await opts.controller.stop().catch(() => {});
          const detail = bootstrap.error ?? "unknown";
          const tempInfo = bootstrap.tempPath ? `\nArchivo temporal: ${bootstrap.tempPath}` : "";
          throw new Error(
            `No se pudo abrir el checkpoint inicial.\n` +
            `Detalle: ${detail}${tempInfo}`,
          );
        }
      }
    }
  }

  const client = new CollabClient({
    url,
    peerId,
    displayName,
    capabilities: ["topology.events", "topology.apply", "ios.readConfig"],
    rejectUnauthorized: diagnosis.tlsWarning ? false : undefined,
  });

  const coordinator = opts.controller
    ? new PTSyncCoordinator({
        controller: opts.controller as never,
        client,
        peerId,
        roomId: "default",
        checkpointBaseUrl: url,
        pollIntervalMs: opts.pollIntervalMs,
        skipBootstrap: true,
        bootstrapResult: bootstrap,
      })
    : null;

  if (coordinator) {
    await coordinator.start();
  }

  // Esperar a que el cliente se conecte
  await new Promise<void>((resolve, reject) => {
    const timeoutMs = 15000;
    const timer = setTimeout(() => {
      client.disconnect();
      reject(new Error("Connection timeout"));
    }, timeoutMs);

    const offStatus = client.on("status.change", (status) => {
      if (status === "connected") {
        clearTimeout(timer);
        offStatus();
        resolve();
      }
      if (status === "disconnected" && client.getStatus() !== "connecting") {
        clearTimeout(timer);
        offStatus();
        const closeEvent = client.getLastCloseEvent();
        const detail = closeEvent
          ? `código=${closeEvent.code}, razón="${closeEvent.reason}"`
          : "sin detalle";
        if (closeEvent?.code === 1015) {
          reject(new Error(
            "Fallo TLS al conectar por WebSocket.\n" +
            "  Causa: el certificado HTTPS no es confiable en este sistema.\n" +
            "  Soluciones:\n" +
            "  1) Visita la URL en tu navegador y acepta el certificado:\n" +
            `     ${url!.replace(/\/?$/, "/health")}\n` +
            "  2) O configura Tailscale para usar HTTPS confiable.\n" +
            "  3) O usa un túnel alternativo (ngrok, cloudflared).",
          ));
        } else {
          reject(new Error(`Connection rejected (${detail})`));
        }
      }
    });

    const offError = client.on("error", (msg) => {
      clearTimeout(timer);
      offStatus();
      offError();
      reject(new Error(`${msg.code}: ${msg.message}`));
    });

    client.connect();
  });

  // Persistir peerId para identidad consistente en reconexiones
  if (client.peerId) {
    updatePeerId(client.peerId);
  }

  writeSessionFile({
    mode: "client",
    publicUrl: url,
    startedAt: new Date().toISOString(),
    pid: process.pid,
  });

  return {
    client,
    coordinator: coordinator ?? undefined,
    bootstrap,
    peerId: client.peerId,
    url,
    async close() {
      await coordinator?.stop().catch(() => undefined);
      client.disconnect();
      deleteSessionFile();
    },
  };
}

export function getSavedUrl(): string | undefined {
  const cfg = readClientConfig();
  return cfg?.lastUrl ?? undefined;
}

export async function shouldSkipCheckpointBootstrap(opts: {
  controller: ConnectSimpleSessionOptions["controller"];
  url: string;
  clientConfig?: ReturnType<typeof readClientConfig>;
  sessionInfo?: ReturnType<typeof readSessionFile>;
}): Promise<boolean> {
  if (!opts.controller?.project?.status) return false;

  const status = await opts.controller.project.status().catch(() => null);
  const hasActiveFile = status?.project?.hasActiveFile === true;
  const activeFile = status?.project?.activeFile ?? null;

  if (!hasActiveFile || !activeFile) return false;

  // Criterio 1 (rápido): misma URL de sesión ya conectada anteriormente
  const sameSession = opts.clientConfig?.lastUrl === opts.url || opts.sessionInfo?.publicUrl === opts.url;
  if (sameSession) return true;

  // Criterio 2: comparar SHA256 del checkpoint del servidor con el del proyecto actual
  // Esto evita recargar el .pkt aunque sea la primera vez con esta URL,
  // siempre que el archivo sea idéntico.
  if (opts.controller.project?.autosave) {
    try {
      // Consultar qué checkpoint tiene el servidor
      const latestUrl = opts.url.replace(/\/?$/, "") + "/checkpoint/latest";
      const serverRes = await fetch(latestUrl, { signal: AbortSignal.timeout(5000) }).catch(() => null);
      if (serverRes?.ok) {
        const serverBody = await serverRes.json() as { ok?: boolean; sha256?: string | null };
        const serverSha256 = serverBody?.ok ? (serverBody.sha256 ?? null) : null;

        if (serverSha256) {
          // Hacer autosave temporal para obtener el SHA256 del proyecto actual
          const localAutosave = await opts.controller.project.autosave({ keep: 1 }).catch(() => null);
          const localSha256 = localAutosave?.ok ? (localAutosave.sha256 ?? null) : null;

          if (localSha256 && localSha256 === serverSha256) {
            return true;
          }
        }
      }
    } catch {
      // Si falla la comparación, continuar con el bootstrap normal
    }
  }

  return false;
}

async function diagnoseUrl(url: string): Promise<{ tlsWarning?: string }> {
  const healthUrl = url.replace(/\/?$/, "/health");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(healthUrl, {
      signal: controller.signal,
      tls: { rejectUnauthorized: false },
    });
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
          if (closeEvent?.code === 1015) {
            reject(new Error(
              "Fallo TLS al conectar por WebSocket.\n" +
              "  Causa: el certificado HTTPS no es confiable en este sistema.\n" +
              "  Soluciones:\n" +
              "  1) Visita la URL en tu navegador y acepta el certificado:\n" +
              `     ${opts.url.replace(/\/?$/, "/health")}\n` +
              "  2) O configura Tailscale para usar HTTPS confiable.\n" +
              "  3) O usa un túnel alternativo (ngrok, cloudflared).",
            ));
          } else {
            reject(new Error(`Connection rejected (${detail})`));
          }
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
