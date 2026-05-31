import type { CollabClient } from "../client/collab-client.js";
import { AutoSyncService, type SnapshotFetcher } from "./auto-sync.js";
import type { PTControllerPort, DeltaApplyResult } from "../applier/delta-applier.js";
import { applyDelta } from "../applier/delta-applier.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toCollabSnapshot } from "../pt/pt-controller-snapshot-adapter.js";

export interface BootstrapResult {
  checked: boolean;
  checkpointId?: string;
  downloaded?: boolean;
  opened?: boolean;
  tempPath?: string;
  sha256?: string;
  error?: string;
}

export interface PTSyncCoordinatorOptions {
  controller: PTControllerPort & {
    start(): Promise<void>;
    stop(): Promise<void>;
    snapshot(): Promise<unknown>;
    project?: {
      open(path: string, options?: { wait?: boolean; waitTimeoutMs?: number }): Promise<unknown>;
    };
  };
  client: CollabClient;
  peerId: string;
  roomId: string;
  checkpointBaseUrl?: string;
  pollIntervalMs?: number;
  fetchSnapshot?: SnapshotFetcher;
  onError?: (error: Error) => void;
  pullInitialCheckpoint?: boolean;
  skipBootstrap?: boolean;
}

export interface PTSyncCoordinatorStatus {
  running: boolean;
  connected: boolean;
  peerId: string;
  roomId: string;
}

export class PTSyncCoordinator {
  private sync: AutoSyncService | null = null;
  private started = false;
  private _bootstrap: BootstrapResult = { checked: false };

  constructor(private readonly opts: PTSyncCoordinatorOptions) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await this.opts.controller.start();

    if (!this.opts.skipBootstrap && this.opts.checkpointBaseUrl && this.opts.controller.project?.open) {
      if (this.opts.pullInitialCheckpoint !== false) {
        await this.bootstrapLatestCheckpoint().catch((error) => {
          this.opts.onError?.(error instanceof Error ? error : new Error(String(error)));
        });
      }
    }

    this.opts.client.connect();

    const fetchSnapshot = this.opts.fetchSnapshot ?? (async () => toCollabSnapshot(await this.opts.controller.snapshot()));
    this.sync = new AutoSyncService({
      client: this.opts.client,
      fetchSnapshot,
      applyDelta: async (delta) => applyDelta(delta, this.opts.controller as PTControllerPort) as Promise<DeltaApplyResult>,
      roomId: this.opts.roomId,
      peerId: this.opts.peerId,
      pollIntervalMs: this.opts.pollIntervalMs,
      onError: this.opts.onError,
    });

    await this.sync.start();
  }

  async stop(): Promise<void> {
    this.sync?.stop();
    this.opts.client.disconnect();
    await this.opts.controller.stop();
    this.started = false;
  }

  getStatus(): PTSyncCoordinatorStatus {
    return {
      running: this.sync?.status.running ?? false,
      connected: this.sync?.status.connected ?? false,
      peerId: this.opts.peerId,
      roomId: this.opts.roomId,
    };
  }

  getBootstrapResult(): BootstrapResult {
    return { ...this._bootstrap };
  }

  private async bootstrapLatestCheckpoint(): Promise<void> {
    if (!this.opts.checkpointBaseUrl || !this.opts.controller.project?.open) return;

    const latestUrl = `${this.opts.checkpointBaseUrl.replace(/\/?$/, "")}/checkpoint/latest`;
    let res: Response;
    try {
      res = await fetch(latestUrl);
    } catch {
      this._bootstrap = { checked: true, error: `No se pudo acceder a ${latestUrl}` };
      return;
    }
    if (!res.ok) {
      this._bootstrap = { checked: true, error: `HTTP ${res.status} al consultar checkpoint/latest` };
      return;
    }

    const body = await res.json() as { ok?: boolean; checkpointId?: string | null; sha256?: string; byteSize?: number };
    if (!body.ok || !body.checkpointId) {
      this._bootstrap = { checked: true, error: "No hay checkpoint disponible en el servidor" };
      return;
    }

    this._bootstrap = { checked: true, checkpointId: body.checkpointId, sha256: body.sha256 ?? undefined };

    const pktRes = await fetch(`${this.opts.checkpointBaseUrl.replace(/\/?$/, "")}/checkpoint/${body.checkpointId}`);
    if (!pktRes.ok) {
      this._bootstrap.downloaded = false;
      this._bootstrap.error = `No se pudo descargar checkpoint ${body.checkpointId}: HTTP ${pktRes.status}`;
      return;
    }

    this._bootstrap.downloaded = true;
    const bytes = new Uint8Array(await pktRes.arrayBuffer());
    const tempDir = join(tmpdir(), "pt-collab-bootstrap");
    mkdirSync(tempDir, { recursive: true });
    const tempPath = join(tempDir, `${body.checkpointId}.pkt`);
    writeFileSync(tempPath, bytes);
    this._bootstrap.tempPath = tempPath;

    const openResult = await this.opts.controller.project.open(tempPath, { wait: true, waitTimeoutMs: 60_000 }) as { ok?: boolean; error?: string } | undefined;
    if (!openResult?.ok) {
      this._bootstrap.opened = false;
      this._bootstrap.error = `No se pudo abrir checkpoint ${body.checkpointId}: ${openResult?.error ?? "unknown"}`;
      return;
    }

    this._bootstrap.opened = true;
  }
}
