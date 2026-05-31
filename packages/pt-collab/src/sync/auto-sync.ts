import type { CollabClient } from "../client/collab-client.js";
import type { CollabDelta } from "../protocol/messages.js";
import type { DeltaApplyResult } from "../applier/delta-applier.js";
import { diffSnapshots, diffToDeltas, type TopologySnapshot } from "../detector/change-detector.js";

export type SnapshotFetcher = () => Promise<TopologySnapshot>;

export interface AutoSyncOptions {
  client: CollabClient;
  fetchSnapshot: SnapshotFetcher;
  applyDelta: (delta: CollabDelta) => Promise<DeltaApplyResult>;
  roomId: string;
  peerId: string;
  pollIntervalMs?: number;
  onError?: (error: Error) => void;
  onSync?: (deltaCount: number) => void;
}

export interface AutoSyncStatus {
  running: boolean;
  connected: boolean;
  lastPollAt: number | null;
  lastSyncAt: number | null;
  deltasSubmitted: number;
  deltasApplied: number;
  errors: number;
}

export class AutoSyncService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot: TopologySnapshot | null = null;
  private seqCounter = 0;
  private lamportClock = 0;
  private vector: Record<string, number> = {};

  private _deltasSubmitted = 0;
  private _deltasApplied = 0;
  private _errors = 0;
  private _lastPollAt: number | null = null;
  private _lastSyncAt: number | null = null;

  private offDeltaCommit?: () => void;
  private offDeltaAck?: () => void;
  private applyingRemote = false;
  private seenDeltaIds = new Set<string>();

  constructor(private readonly opts: AutoSyncOptions) {}

  get status(): AutoSyncStatus {
    return {
      running: this.timer !== null,
      connected: this.opts.client.getStatus() === "connected",
      lastPollAt: this._lastPollAt,
      lastSyncAt: this._lastSyncAt,
      deltasSubmitted: this._deltasSubmitted,
      deltasApplied: this._deltasApplied,
      errors: this._errors,
    };
  }

  async start(): Promise<void> {
    if (this.timer) return;

    this.syncVector();

    this.offDeltaCommit = this.opts.client.on("delta.commit", (msg) => {
      this.handleIncomingDelta(msg.delta).catch((e) => {
        this._errors++;
        this.opts.onError?.(e);
      });
    });

    this.offDeltaAck = this.opts.client.on("delta.ack", (msg) => {
      if (msg.accepted) {
        this.vector[msg.peerId] = (this.vector[msg.peerId] ?? 0) + 1;
      }
    });

    try {
      this.lastSnapshot = await this.opts.fetchSnapshot();
      this._lastPollAt = Date.now();
    } catch {
      // primera poll puede fallar si PT no está listo
    }

    const interval = this.opts.pollIntervalMs ?? 2000;
    this.timer = setInterval(() => this.poll(), interval);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.offDeltaCommit?.();
    this.offDeltaAck?.();
  }

  private async poll(): Promise<void> {
    if (this.applyingRemote) return;

    try {
      const current = await this.opts.fetchSnapshot();
      this._lastPollAt = Date.now();

      if (!this.lastSnapshot) {
        this.lastSnapshot = current;
        return;
      }

      const diff = diffSnapshots(this.lastSnapshot, current);
      const deltas = diffToDeltas(
        diff,
        this.opts.roomId,
        this.opts.peerId,
        this.seqCounter,
        this.lamportClock,
        { ...this.vector },
      );

      if (deltas.length > 0) {
        for (const delta of deltas) {
          this.opts.client.sendMessage({ type: "delta.submit", delta, timestamp: new Date().toISOString() });
          this.seqCounter++;
          this.lamportClock++;
          this._deltasSubmitted++;
        }
        this._lastSyncAt = Date.now();
        this.opts.onSync?.(deltas.length);
      }

      this.lastSnapshot = current;
      this.syncVector();
    } catch (error) {
      this._errors++;
      this.opts.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async handleIncomingDelta(delta: CollabDelta): Promise<void> {
    if (delta.peerId === this.opts.peerId) return;
    if (this.seenDeltaIds.has(delta.id)) return;

    this.seenDeltaIds.add(delta.id);
    this.applyingRemote = true;

    try {
      const result = await this.opts.applyDelta(delta);

      if (result.ok) {
        this._deltasApplied++;
        this.lamportClock = Math.max(this.lamportClock, delta.lamport) + 1;
        this.vector[delta.peerId] = (this.vector[delta.peerId] ?? 0) + 1;
        this.lastSnapshot = await this.opts.fetchSnapshot();

        this.opts.client.sendMessage({
          type: "delta.ack",
          deltaId: delta.id,
          peerId: this.opts.peerId,
          accepted: true,
        });
      } else {
        this.opts.client.sendMessage({
          type: "delta.ack",
          deltaId: delta.id,
          peerId: this.opts.peerId,
          accepted: false,
          reason: result.error,
        });
      }
    } finally {
      this.applyingRemote = false;
    }
  }

  private syncVector(): void {
    this.vector[this.opts.peerId] = this.seqCounter;
  }
}

function cryptoRandomUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}
