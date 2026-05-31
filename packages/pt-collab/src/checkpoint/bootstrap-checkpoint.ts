import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface BootstrapCheckpointOptions {
  checkpointBaseUrl: string;
  controller: {
    project?: {
      open(path: string, options?: { wait?: boolean; waitTimeoutMs?: number }): Promise<unknown>;
    };
  };
  tempDir?: string;
}

export interface BootstrapResult {
  checked: boolean;
  checkpointId?: string;
  downloaded?: boolean;
  opened?: boolean;
  skippedExistingProject?: boolean;
  tempPath?: string;
  sha256?: string;
  error?: string;
}

export async function bootstrapLatestCheckpoint(
  opts: BootstrapCheckpointOptions,
): Promise<BootstrapResult> {
  const baseUrl = opts.checkpointBaseUrl.replace(/\/?$/, "");
  const latestUrl = `${baseUrl}/checkpoint/latest`;

  let res: Response;
  try {
    res = await fetch(latestUrl);
  } catch {
    return { checked: true, error: `No se pudo acceder a ${latestUrl}` };
  }
  if (!res.ok) {
    return { checked: true, error: `HTTP ${res.status} al consultar checkpoint/latest` };
  }

  const body = await res.json() as { ok?: boolean; checkpointId?: string | null; sha256?: string; byteSize?: number };
  if (!body.ok || !body.checkpointId) {
    return { checked: true, error: "No hay checkpoint disponible en el servidor" };
  }

  const checkpointId = body.checkpointId;

  const pktRes = await fetch(`${baseUrl}/checkpoint/${checkpointId}`);
  if (!pktRes.ok) {
    return {
      checked: true,
      checkpointId,
      downloaded: false,
      error: `No se pudo descargar checkpoint ${checkpointId}: HTTP ${pktRes.status}`,
    };
  }

  const bytes = new Uint8Array(await pktRes.arrayBuffer());
  const tempDir = opts.tempDir ?? join(tmpdir(), "pt-collab-bootstrap");
  mkdirSync(tempDir, { recursive: true });
  const tempPath = join(tempDir, `${checkpointId}.pkt`);
  writeFileSync(tempPath, bytes);

  if (!opts.controller.project?.open) {
    return {
      checked: true,
      checkpointId,
      downloaded: true,
      opened: false,
      tempPath,
      sha256: body.sha256,
      error: "controller.project.open no disponible",
    };
  }

  const openResult = await opts.controller.project.open(tempPath, {
    wait: true,
    waitTimeoutMs: 60_000,
  }) as { ok?: boolean; error?: string } | undefined;

  if (!openResult?.ok) {
    return {
      checked: true,
      checkpointId,
      downloaded: true,
      opened: false,
      tempPath,
      sha256: body.sha256,
      error: `No se pudo abrir checkpoint ${checkpointId}: ${openResult?.error ?? "unknown"}`,
    };
  }

  return {
    checked: true,
    checkpointId,
    downloaded: true,
    opened: true,
    tempPath,
    sha256: body.sha256,
  };
}
