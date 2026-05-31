import type { CollabClient } from "../client/collab-client.js";
import { AutoSyncService, type SnapshotFetcher } from "./auto-sync.js";
import type { PTControllerPort, DeltaApplyResult } from "../applier/delta-applier.js";
import { applyDelta } from "../applier/delta-applier.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

  constructor(private readonly opts: PTSyncCoordinatorOptions) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await this.opts.controller.start();
    await this.bootstrapLatestCheckpoint().catch((error) => {
      this.opts.onError?.(error instanceof Error ? error : new Error(String(error)));
    });
    this.opts.client.connect();

    const fetchSnapshot = this.opts.fetchSnapshot ?? (async () => this.opts.controller.snapshot() as never);
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

  private async bootstrapLatestCheckpoint(): Promise<void> {
    if (!this.opts.checkpointBaseUrl || !this.opts.controller.project?.open) return;

    const latestUrl = `${this.opts.checkpointBaseUrl.replace(/\/?$/, "")}/checkpoint/latest`;
    const res = await fetch(latestUrl);
    if (!res.ok) return;

    const body = await res.json() as { ok?: boolean; checkpointId?: string | null; sha256?: string; byteSize?: number };
    if (!body.ok || !body.checkpointId) return;

    const pktRes = await fetch(`${this.opts.checkpointBaseUrl.replace(/\/?$/, "")}/checkpoint/${body.checkpointId}`);
    if (!pktRes.ok) return;

    const bytes = new Uint8Array(await pktRes.arrayBuffer());
    const tempDir = join(tmpdir(), "pt-collab-bootstrap");
    mkdirSync(tempDir, { recursive: true });
    const tempPath = join(tempDir, `${body.checkpointId}.pkt`);
    writeFileSync(tempPath, bytes);

    await this.opts.controller.project.open(tempPath, { wait: true }).catch(() => undefined);
  }
}
