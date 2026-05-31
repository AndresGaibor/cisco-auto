import type { CollabClient } from "../client/collab-client.js";
import { AutoSyncService, type SnapshotFetcher } from "./auto-sync.js";
import type { PTControllerPort, DeltaApplyResult } from "../applier/delta-applier.js";
import { applyDelta } from "../applier/delta-applier.js";
import { toCollabSnapshot } from "../pt/pt-controller-snapshot-adapter.js";
import { bootstrapLatestCheckpoint, type BootstrapResult } from "../checkpoint/bootstrap-checkpoint.js";

export { type BootstrapResult };

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
  bootstrapResult?: BootstrapResult;
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
  private _bootstrap: BootstrapResult;

  constructor(private readonly opts: PTSyncCoordinatorOptions) {
    this._bootstrap = opts.bootstrapResult ?? { checked: false };
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    await this.opts.controller.start();

    if (!this.opts.skipBootstrap && this.opts.checkpointBaseUrl && this.opts.controller.project?.open) {
      if (this.opts.pullInitialCheckpoint !== false && !this.opts.bootstrapResult) {
        this._bootstrap = await bootstrapLatestCheckpoint({
          checkpointBaseUrl: this.opts.checkpointBaseUrl,
          controller: this.opts.controller as { project?: { open(path: string, options?: { wait?: boolean; waitTimeoutMs?: number }): Promise<unknown> } },
        }).catch((error) => ({
          checked: true,
          error: error instanceof Error ? error.message : String(error),
        } as BootstrapResult));
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
}
