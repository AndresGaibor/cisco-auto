import { createCollabServer } from "../server/start-collab-server.js";
import { getOrCreateHostConfig } from "../storage/host-config-store.js";
import { writeSessionFile, writePidFile, deleteSessionFile, deletePidFile } from "../storage/session-store.js";
import { startFunnelSession } from "../tailscale/funnel-session.js";
import { resolvePublicUrl } from "../tailscale/resolve-public-url.js";

export interface StartSimpleSessionOptions {
  port?: number;
  host?: string;
  path?: string;
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

  const publicUrlBase = await resolvePublicUrl();
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

  let funnel;
  try {
    funnel = await startFunnelSession({
      localPort: port,
      localHost: host,
      publicPort: opts.publicPort ?? 443,
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
    async close() {
      cleanup();
      await funnel.close().catch(() => {});
      await handle.close().catch(() => {});
    },
  };
}
