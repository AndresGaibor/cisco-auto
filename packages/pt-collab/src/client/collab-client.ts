import type {
  CollabWireMessage,
  WelcomeMessage,
  PeerState,
  PeerJoinedMessage,
  PeerLeftMessage,
  ErrorMessage,
  CollabHashes,
  CollabDelta,
  DeltaSubmitMessage,
  DeltaAckMessage,
  DeltaCommitMessage,
  CheckpointOfferMessage,
  CheckpointRequestMessage,
  ConflictCreatedMessage,
  ConflictResolvedMessage,
  DriftDetectedMessage,
  HeartbeatMessage,
  PeerCapability,
} from "../protocol/messages.js";

export type CollabClientStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

type CollabClientEventMap = {
  welcome: WelcomeMessage;
  "peer.joined": PeerJoinedMessage;
  "peer.left": PeerLeftMessage;
  "delta.submit": DeltaSubmitMessage;
  "delta.commit": DeltaCommitMessage;
  "delta.ack": DeltaAckMessage;
  "checkpoint.offer": CheckpointOfferMessage;
  "checkpoint.request": CheckpointRequestMessage;
  "conflict.created": ConflictCreatedMessage;
  "conflict.resolved": ConflictResolvedMessage;
  "drift.detected": DriftDetectedMessage;
  error: ErrorMessage;
};

export interface CollabClientOptions {
  url: string;
  roomId?: string;
  token?: string;
  peerId?: string;
  displayName?: string;
  capabilities?: PeerCapability[];
  packetTracerVersion?: string;
  activeFile?: string;
  hashes?: CollabHashes;
  heartbeatIntervalMs?: number;
  reconnectDelayMs?: number;
  maxReconnects?: number;
  rejectUnauthorized?: boolean;
  onWelcome?: (msg: WelcomeMessage) => void;
  onPeerJoined?: (msg: PeerJoinedMessage) => void;
  onPeerLeft?: (msg: PeerLeftMessage) => void;
  onDeltaSubmit?: (msg: DeltaSubmitMessage) => void;
  onDeltaCommit?: (msg: DeltaCommitMessage) => void;
  onDeltaAck?: (msg: DeltaAckMessage) => void;
  onCheckpointOffer?: (msg: CheckpointOfferMessage) => void;
  onCheckpointRequest?: (msg: CheckpointRequestMessage) => void;
  onConflictCreated?: (msg: ConflictCreatedMessage) => void;
  onConflictResolved?: (msg: ConflictResolvedMessage) => void;
  onDriftDetected?: (msg: DriftDetectedMessage) => void;
  onError?: (msg: ErrorMessage) => void;
  onStatusChange?: (status: CollabClientStatus) => void;
}

export class CollabClient {
  private ws: WebSocket | null = null;
  private status: CollabClientStatus = "disconnected";
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Map<string, Set<(msg: unknown) => void>>();

  peerId: string = "";
  roomId: string;
  displayName: string;
  peers: PeerState[] = [];
  serverTime: string = "";
  currentVector: Record<string, number> = {};

  private opts: CollabClientOptions;
  private wsUrl: string;

  constructor(opts: CollabClientOptions) {
    this.opts = opts;
    this.roomId = opts.roomId ?? "default";
    this.displayName = opts.displayName ?? `peer_${Math.random().toString(36).slice(2, 6)}`;
    this.wsUrl = opts.url.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
    if (!this.wsUrl.endsWith("/socket")) {
      this.wsUrl = this.wsUrl.replace(/\/?$/, "/socket");
    }
  }

  connect(): void {
    if (this.status === "connecting" || this.status === "connected") return;
    this.setStatus("connecting");
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnect();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
    this.peerId = "";
    this.peers = [];
  }

  sendDelta(delta: CollabDelta): void {
    const msg: DeltaSubmitMessage = {
      type: "delta.submit",
      delta,
      timestamp: new Date().toISOString(),
    };
    this.sendMessage(msg);
  }

  sendHeartbeat(): void {
    const msg: HeartbeatMessage = {
      type: "heartbeat",
      peerId: this.peerId,
      timestamp: new Date().toISOString(),
      vector: { ...this.currentVector },
    };
    this.sendMessage(msg);
  }

  requestCheckpoint(checkpointId: string): void {
    const msg: CheckpointRequestMessage = {
      type: "checkpoint.request",
      checkpointId,
      peerId: this.peerId,
    };
    this.sendMessage(msg);
  }

  getStatus(): CollabClientStatus {
    return this.status;
  }

  getLastCloseEvent(): { code: number; reason: string } | null {
    return this.lastCloseEvent;
  }

  on<K extends keyof CollabClientEventMap>(event: K, handler: (msg: CollabClientEventMap[K]) => void): () => void {
    const key = String(event);
    const set = this.listeners.get(key) ?? new Set<(msg: unknown) => void>();
    set.add(handler as (msg: unknown) => void);
    this.listeners.set(key, set);
    return () => {
      this.listeners.get(key)?.delete(handler as (msg: unknown) => void);
    };
  }

  private doConnect(): void {
    try {
      if (this.opts.rejectUnauthorized === false) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }
      this.ws = new WebSocket(this.wsUrl);
      const w = this.ws!;
      w.onopen = () => this.handleOpen();
      w.onmessage = (event: MessageEvent) => this.handleMessage(event.data as string);
      w.onerror = () => {};
      w.onclose = (event: CloseEvent) => this.handleClose(event);
    } catch {
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    this.peerId = this.opts.peerId ?? `peer_${Math.random().toString(36).slice(2, 10)}`;

    const hello: Record<string, unknown> = {
      type: "hello",
      protocolVersion: 1,
      peerId: this.peerId,
      displayName: this.displayName,
      capabilities: this.opts.capabilities ?? ["topology.events", "ios.readConfig"],
    };

    if (this.opts.roomId) hello.roomId = this.opts.roomId;
    if (this.opts.token) hello.token = this.opts.token;
    if (this.opts.packetTracerVersion) hello.packetTracerVersion = this.opts.packetTracerVersion;
    if (this.opts.activeFile) hello.activeFile = this.opts.activeFile;
    if (this.opts.hashes) hello.hashes = this.opts.hashes;

    this.sendMessage(hello as unknown as CollabWireMessage);
    this.startHeartbeat();
  }

  private handleMessage(raw: string): void {
    let msg: CollabWireMessage;
    try {
      msg = JSON.parse(raw) as CollabWireMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case "welcome":
        this.setStatus("connected");
        this.peerId = msg.assignedPeerId;
        this.serverTime = msg.serverTime;
        this.currentVector = msg.currentVector;
        this.peers = msg.peers;
        this.emit("welcome", msg);
        this.opts.onWelcome?.(msg);
        break;
      case "peer.joined":
        this.peers = this.peers.filter((p) => p.peerId !== msg.peer.peerId);
        this.peers.push(msg.peer);
        this.emit("peer.joined", msg);
        this.opts.onPeerJoined?.(msg);
        break;
      case "peer.left":
        this.peers = this.peers.filter((p) => p.peerId !== msg.peerId);
        this.emit("peer.left", msg);
        this.opts.onPeerLeft?.(msg);
        break;
      case "delta.submit":
        this.emit("delta.submit", msg);
        this.opts.onDeltaSubmit?.(msg);
        break;
      case "delta.commit":
        this.emit("delta.commit", msg);
        this.opts.onDeltaCommit?.(msg);
        break;
      case "delta.ack":
        this.emit("delta.ack", msg);
        this.opts.onDeltaAck?.(msg);
        break;
      case "checkpoint.offer":
        this.emit("checkpoint.offer", msg);
        this.opts.onCheckpointOffer?.(msg);
        break;
      case "checkpoint.request":
        this.emit("checkpoint.request", msg);
        this.opts.onCheckpointRequest?.(msg);
        break;
      case "conflict.created":
        this.emit("conflict.created", msg);
        this.opts.onConflictCreated?.(msg);
        break;
      case "conflict.resolved":
        this.emit("conflict.resolved", msg);
        this.opts.onConflictResolved?.(msg);
        break;
      case "drift.detected":
        this.emit("drift.detected", msg);
        this.opts.onDriftDetected?.(msg);
        break;
      case "error":
        this.emit("error", msg);
        this.opts.onError?.(msg);
        break;
      case "heartbeat":
        break;
    }
  }

  private lastCloseEvent: { code: number; reason: string } | null = null;

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat();
    this.ws = null;
    this.lastCloseEvent = { code: event.code, reason: event.reason || "no_reason" };

    if (event.code === 1000 || event.code === 1001) {
      this.setStatus("disconnected");
      return;
    }

    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    const max = this.opts.maxReconnects ?? 5;
    if (this.reconnectAttempts >= max) {
      this.setStatus("disconnected");
      return;
    }

    this.setStatus("reconnecting");
    this.reconnectAttempts++;
    const delay = this.opts.reconnectDelayMs ?? 2000;
    this.reconnectTimer = setTimeout(() => this.doConnect(), delay * this.reconnectAttempts);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    const interval = this.opts.heartbeatIntervalMs ?? 5000;
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  sendMessage(msg: CollabWireMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private setStatus(status: CollabClientStatus): void {
    this.status = status;
    this.opts.onStatusChange?.(status);
  }

  private emit<K extends keyof CollabClientEventMap>(event: K, msg: CollabClientEventMap[K]): void {
    for (const handler of this.listeners.get(String(event)) ?? []) {
      handler(msg);
    }
  }
}
