import { createCollabServer } from "../server/start-collab-server.js";
import { CollabClient } from "../client/collab-client.js";
import { getOrCreateHostConfig } from "../storage/host-config-store.js";
import { writeSessionFile, writePidFile, deleteSessionFile, deletePidFile } from "../storage/session-store.js";
import { startFunnelSession } from "../tailscale/funnel-session.js";
import { resolvePublicUrl } from "../tailscale/resolve-public-url.js";
import { PTSyncCoordinator } from "../sync/pt-sync-coordinator.js";
import { readFileSync } from "node:fs";

export interface StartSimpleSessionOptions {
  port?: number;
  host?: string;
  path?: string;
  controller?: {
    start(): Promise<void>;
    stop(): Promise<void>;
    snapshot(): Promise<unknown>;
    project?: {
      autosave(options?: { dir?: string; keep?: number; chunkSize?: number }): Promise<{
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
  noOpen?: boolean;
  noClipboard?: boolean;
  noCheckpoint?: boolean;
  debug?: boolean;
  publicPort?: 443 | 8443 | 10000;
}

export interface StartSimpleSessionResult {
  publicUrl: string;
  localUrl: string;
  sessionSecret: string;
  coordinator?: PTSyncCoordinator;
  client?: CollabClient;
  close(): Promise<void>;
}

export async function startSimpleSession(
  opts: StartSimpleSessionOptions = {},
): Promise<StartSimpleSessionResult> {
  const port = opts.port ?? 3937;
  const host = opts.host ?? "127.0.0.1";
  const path = opts.path ?? "/collab";

  const hostConfig = getOrCreateHostConfig(port);
  const sessionSecret = hostConfig.sessionSecret;

  const publicUrlBase = await resolvePublicUrl(opts.publicPort);
  if (!publicUrlBase) {
    throw new Error(
      "No se pudo determinar la URL pública de Tailscale.\n" +
      "Asegúrate de que Tailscale esté instalado, autenticado y conectado.",
    );
  }

  const publicUrl = `${publicUrlBase}${path}/s/${sessionSecret}`;

  const handle = await createCollabServer({
    host,
    port,
    path,
    roomId: "default",
    token: sessionSecret,
    autoTailscale: "off",
    sessionSecret,
  });

  if (opts.controller?.project?.autosave) {
    try {
      const autosave = await opts.controller.project.autosave({ keep: 5 });
      if (autosave.ok) {
        const bytes = new Uint8Array(readFileSync(autosave.autosavePath));
        handle.publishCheckpoint({
          checkpointId: `cp_${Date.now()}`,
          roomId: "default",
          peerId: "host",
          sha256: autosave.sha256,
          byteSize: autosave.bytes,
          chunkCount: 1,
          createdAt: new Date().toISOString(),
        }, bytes);
      }
    } catch {
      // Bootstrap opcional: si falla, la sesión sigue viva.
    }
  }

  const hostClient = opts.controller
    ? new CollabClient({
        url: `${handle.localUrl}/s/${sessionSecret}`,
        peerId: `host_${sessionSecret}`,
        displayName: "Host",
        capabilities: ["project.snapshot", "topology.events", "topology.apply", "ios.readConfig", "ios.applyConfig", "xml.read"],
      })
    : null;

  const coordinator = opts.controller && hostClient
    ? new PTSyncCoordinator({
        controller: opts.controller as never,
        client: hostClient,
        peerId: hostClient.peerId,
        roomId: "default",
        checkpointBaseUrl: `${handle.localUrl}/s/${sessionSecret}`,
        pollIntervalMs: 1500,
        pullInitialCheckpoint: false,
        skipBootstrap: true,
      })
    : null;

  if (coordinator) {
    await coordinator.start();
  }

  let funnel;
  try {
    funnel = await startFunnelSession({
      localPort: port,
      localHost: host,
      publicPort: opts.publicPort ?? 8443,
      pathPrefix: path,
    });
  } catch (error) {
    await handle.close().catch(() => {});
    throw error;
  }

  writeSessionFile({
    mode: "host",
    localPort: port,
    publicUrl,
    sessionSecret,
    startedAt: new Date().toISOString(),
    pid: process.pid,
  });
  writePidFile();

  let closed = false;

  function cleanup() {
    if (closed) return;
    closed = true;
    deleteSessionFile();
    deletePidFile();
  }

  return {
    publicUrl,
    localUrl: handle.localUrl,
    sessionSecret,
    coordinator: coordinator ?? undefined,
    client: hostClient ?? undefined,
    async close() {
      await coordinator?.stop().catch(() => undefined);
      cleanup();
      await funnel.close().catch(() => {});
      await handle.close().catch(() => {});
    },
  };
}
