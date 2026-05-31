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

export interface IOSHistoryEntry {
  device: string;
  command: string;
  seq: number;
  timestamp: number;
}

export interface SyncDeviceState {
  baseRunningConfig?: string;
  baseStartupConfig?: string;
  hash: string;
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
  private offPeerJoined?: () => void;
  private offWelcome?: () => void;
  private applyingRemote = false;
  private seenDeltaIds = new Set<string>();

  // Comandos acumulados para state sync de nuevos peers
  private accumulatedCommands: { device: string; command: string }[] = [];

  // Deltas no enviados por desconexión
  private pendingDeltas: CollabDelta[] = [];

  // Peers que ya conocemos (para evitar state sync en reconexiones)
  private knownPeerIds = new Set<string>();

  // Ledger ordenado de cambios IOS por dispositivo
  private iosLedger: IOSHistoryEntry[] = [];

  // Cursor por peer: último seq del ledger que el peer ya recibió
  private peerCursors: Record<string, number> = {};

  // Hash base por dispositivo capturado al iniciar la sesión
  private baseDeviceHashes: Record<string, string> = {};

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

    // Poblar knownPeerIds con peers actuales al conectar/reconectar
    this.offWelcome = this.opts.client.on("welcome", () => {
      this.knownPeerIds.clear();
      for (const peer of this.opts.client.peers) {
        if (peer.peerId !== this.opts.peerId) {
          this.knownPeerIds.add(peer.peerId);
        }
      }
      // Enviar deltas que quedaron pendientes durante desconexión
      this.flushPendingDeltas();
    });

    this.offPeerJoined = this.opts.client.on("peer.joined", (msg) => {
      const peerId = msg.peer.peerId;
      // Si ya conocemos al peer, es una reconexión → no hacer state sync
      if (this.knownPeerIds.has(peerId)) return;
      this.knownPeerIds.add(peerId);
      this.syncStateToPeer(peerId).catch((e: unknown) => {
        console.warn("[Sync] Error en state sync para peer", peerId, e);
      });
    });

    // Nota: NO limpiar knownPeerIds en peer.left.
    // Si el peer reconecta, sigue siendo "conocido" y no necesita state sync.
    // Si es un peer nuevo, tendrá un peerId diferente y recibirá state sync.

    try {
      this.lastSnapshot = await this.opts.fetchSnapshot();
      this._lastPollAt = Date.now();
      this.captureBaseHashes(this.lastSnapshot);
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
    this.offPeerJoined?.();
    this.offWelcome?.();
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

      if (diff.manualCommands && diff.manualCommands.length > 0) {
        for (const cmd of diff.manualCommands) {
          this.accumulatedCommands.push(cmd);
          this.iosLedger.push({
            device: cmd.device,
            command: cmd.command,
            seq: this.seqCounter,
            timestamp: Date.now(),
          });
        }
        if (this.iosLedger.length > 200) {
          this.iosLedger = this.iosLedger.slice(-200);
        }
        if (this.accumulatedCommands.length > 50) {
          this.accumulatedCommands = this.accumulatedCommands.slice(-50);
        }
      }

      const deltas = diffToDeltas(
        diff,
        this.opts.roomId,
        this.opts.peerId,
        this.seqCounter,
        this.lamportClock,
        { ...this.vector },
      );

      if (deltas.length > 0) {
        // Si no estamos conectados, bufferear en lugar de enviar
        if (this.opts.client.getStatus() !== "connected") {
          for (const delta of deltas) {
            this.pendingDeltas.push(delta);
            this.seqCounter++;
            this.lamportClock++;
          }

        } else {
          for (const delta of deltas) {
            this.opts.client.sendMessage({ type: "delta.submit", delta, timestamp: new Date().toISOString() });
            this.seqCounter++;
            this.lamportClock++;
            this._deltasSubmitted++;
          }
          this._lastSyncAt = Date.now();
          this.opts.onSync?.(deltas.length);
        }
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

    // No consumir deltas si estamos desconectados o reconectando
    if (this.opts.client.getStatus() !== "connected") {
      console.warn("[Sync] Ignorando delta remoto — no conectado:", delta.id.slice(0, 8));
      return;
    }

    const payload = (delta.payload ?? {}) as Record<string, unknown>;

    this.seenDeltaIds.add(delta.id);
    this.applyingRemote = true;

    try {
      const result = await this.opts.applyDelta(delta);

      if (result.ok) {
        this._deltasApplied++;
        this.lamportClock = Math.max(this.lamportClock, delta.lamport) + 1;
        this.vector[delta.peerId] = (this.vector[delta.peerId] ?? 0) + 1;

        try {
          const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000));
          this.lastSnapshot = await Promise.race([this.opts.fetchSnapshot(), timeout]);
        } catch {
          console.warn("[Sync] Snapshot post-delta timeout, manteniendo snapshot anterior");
        }

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

  private async syncStateToPeer(peerId: string): Promise<void> {
    if (!this.lastSnapshot) return;

    const peerCursor = this.peerCursors[peerId] ?? -1;
    const incremental = this.ledgerEntriesSince(peerCursor);

    // Enviar estado base de cada dispositivo: la config actual del snapshot
    for (const [deviceName, config] of Object.entries(this.lastSnapshot.deviceConfigs ?? {})) {
      const runningConfig = config.runningConfig ?? "";
      if (runningConfig.length === 0) continue;

      const lines = runningConfig.split("\n").filter(l => l.trim().length > 0);
      if (lines.length === 0) continue;

      const delta: CollabDelta = {
        id: cryptoRandomUUID(),
        roomId: this.opts.roomId,
        peerId: this.opts.peerId,
        seq: this.seqCounter++,
        lamport: this.lamportClock++,
        createdAt: new Date().toISOString(),
        baseVector: { ...this.vector },
        scope: `device:${deviceName}:running-config` as any,
        kind: "device.cli.runningConfig.changed",
        beforeHash: this.baseDeviceHashes[deviceName],
        afterHash: simpleHash(runningConfig),
        payload: { device: deviceName, configLines: lines },
      };
      this.vector[this.opts.peerId] = this.seqCounter;
      this.opts.client.sendMessage({ type: "delta.submit", delta, timestamp: new Date().toISOString() });
      this._deltasSubmitted++;
    }

    // Replay de comandos incrementales del ledger que el peer aún no ha recibido
    const deviceIncrementalCmds = new Map<string, string[]>();
    for (const entry of incremental) {
      const cmds = deviceIncrementalCmds.get(entry.device) ?? [];
      cmds.push(entry.command);
      deviceIncrementalCmds.set(entry.device, cmds);
    }

    for (const [device, commands] of deviceIncrementalCmds) {
      const delta: CollabDelta = {
        id: cryptoRandomUUID(),
        roomId: this.opts.roomId,
        peerId: this.opts.peerId,
        seq: this.seqCounter++,
        lamport: this.lamportClock++,
        createdAt: new Date().toISOString(),
        baseVector: { ...this.vector },
        scope: `device:${device}:running-config` as any,
        kind: "device.cli.runningConfig.changed",
        payload: { device, configLines: commands },
      };
      this.vector[this.opts.peerId] = this.seqCounter;
      this.opts.client.sendMessage({ type: "delta.submit", delta, timestamp: new Date().toISOString() });
      this._deltasSubmitted++;
    }

    this.peerCursors[peerId] = this.seqCounter;
    console.log("[Sync] State sync para peer", peerId, ":", Object.keys(this.lastSnapshot.deviceConfigs ?? {}).length, "bases,", incremental.length, "incremental");
  }

  private flushPendingDeltas(): void {
    if (this.pendingDeltas.length === 0) return;

    const count = this.pendingDeltas.length;
    for (const delta of this.pendingDeltas) {
      this.opts.client.sendMessage({ type: "delta.submit", delta, timestamp: new Date().toISOString() });
      this._deltasSubmitted++;
    }
    this.pendingDeltas = [];
    this._lastSyncAt = Date.now();
    this.opts.onSync?.(count);
  }

  private syncVector(): void {
    this.vector[this.opts.peerId] = this.seqCounter;
  }

  private captureBaseHashes(snapshot: TopologySnapshot): void {
    this.baseDeviceHashes = {};
    for (const [deviceName, config] of Object.entries(snapshot.deviceConfigs ?? {})) {
      const running = config.runningConfig ?? "";
      const startup = config.startupConfig ?? "";
      this.baseDeviceHashes[deviceName] = simpleHash(running + "|" + startup);
    }
  }

  private ledgerEntriesSince(cursor: number): IOSHistoryEntry[] {
    return this.iosLedger.filter(e => e.seq > cursor);
  }
}

function cryptoRandomUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
