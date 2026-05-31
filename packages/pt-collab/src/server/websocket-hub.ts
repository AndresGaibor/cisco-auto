import type { ServerWebSocket } from "bun";
import type { CollabWireMessage, WelcomeMessage, PeerState, PeerJoinedMessage, PeerLeftMessage, ErrorMessage, DeltaSubmitMessage, CheckpointOfferMessage } from "../protocol/messages.js";
import { RoomRegistry } from "./room-registry.js";
import { PeerRegistry } from "./peer-registry.js";
import { InMemoryAuthStore } from "./auth.js";

export interface WebSocketPeerInfo {
  peerId: string;
  roomId: string;
  displayName: string;
}

export class WebSocketHub {
  private connections = new Map<string, { ws: ServerWebSocket<unknown>; info: WebSocketPeerInfo }>();
  private roomConnections = new Map<string, Set<string>>();

  constructor(
    private roomRegistry: RoomRegistry,
    private peerRegistry: PeerRegistry,
    private authStore: InMemoryAuthStore,
  ) {}

  handleOpen(ws: ServerWebSocket<unknown>): void {
  }

  handleMessage(ws: ServerWebSocket<unknown>, raw: string): void {
    let msg: CollabWireMessage;

    try {
      msg = JSON.parse(raw) as CollabWireMessage;
    } catch {
      this.sendTo(ws, { type: "error", code: "parse_error", message: "Mensaje inválido", timestamp: new Date().toISOString() } as ErrorMessage);
      return;
    }

    const roomId = this.getRoomIdForMessage(ws, msg);
    if (!roomId) {
      this.sendTo(ws, { type: "error", code: "no_room", message: "No se pudo determinar la sala", timestamp: new Date().toISOString() } as ErrorMessage);
      return;
    }

    switch (msg.type) {
      case "hello":
        this.handleHello(ws, msg);
        return;
      case "heartbeat":
        this.handleHeartbeat(ws, msg);
        return;
      case "delta.submit":
        this.broadcastToRoom(roomId, {
          type: "delta.commit",
          delta: msg.delta,
          committedAt: new Date().toISOString(),
        } as CollabWireMessage, ws);
        // Acknowledge the submit immediately back to the sender
        this.sendTo(ws, {
          type: "delta.ack",
          deltaId: msg.delta.id,
          peerId: "server",
          accepted: true,
        });
        return;
      case "delta.commit":
      case "delta.ack":
        this.broadcastToRoom(roomId, msg, ws);
        return;
      case "checkpoint.offer":
      case "checkpoint.request":
      case "checkpoint.chunk":
      case "conflict.created":
      case "conflict.resolved":
        this.broadcastToRoom(roomId, msg, ws);
        return;
      default:
        this.sendTo(ws, { type: "error", code: "unknown_type", message: `Tipo desconocido: ${(msg as CollabWireMessage).type}`, timestamp: new Date().toISOString() } as ErrorMessage);
    }
  }

  handleClose(ws: ServerWebSocket<unknown>): void {
    const entry = this.findEntryByWs(ws);
    if (!entry) return;

    const { peerId, roomId, displayName } = entry.info;
    this.connections.delete(peerId);
    this.removeFromRoom(roomId, peerId);

    this.peerRegistry.removePeer(roomId, peerId);
    this.roomRegistry.removePeer(roomId, peerId);

    const leaveMsg: PeerLeftMessage = {
      type: "peer.left",
      peerId,
      timestamp: new Date().toISOString(),
    };
    this.broadcastToRoom(roomId, leaveMsg);
  }

  private handleHello(ws: ServerWebSocket<unknown>, msg: CollabWireMessage & { type: "hello" }): void {
    const wsData = (ws as any).data as { sessionSecret?: string; roomId?: string } | undefined;

    // Si viene por path-based session (modo simple), resolver roomId desde ws.data
    const resolvedRoomId = msg.roomId ?? wsData?.roomId ?? "default";
    const resolvedToken = msg.token ?? wsData?.sessionSecret ?? "";

    if (!msg.token && wsData?.sessionSecret) {
      // Path-based auth: el sessionSecret se usó como token
      // No validar contra authStore, confiar en path auth
    } else {
      if (!this.authStore.validateToken(resolvedRoomId, resolvedToken)) {
        this.sendTo(ws, { type: "error", code: "auth_failed", message: "Token inválido", timestamp: new Date().toISOString() } as ErrorMessage);
        return;
      }
    }

    const room = this.roomRegistry.getOrCreate(resolvedRoomId);
    const peerState = this.peerRegistry.createPeerState({
      peerId: msg.peerId,
      displayName: msg.displayName,
      capabilities: msg.capabilities,
      packetTracerVersion: msg.packetTracerVersion,
      activeFile: msg.activeFile,
    });

    this.roomRegistry.addPeer(resolvedRoomId, peerState);
    this.peerRegistry.addPeer(resolvedRoomId, peerState);

    const info: WebSocketPeerInfo = { peerId: msg.peerId, roomId: resolvedRoomId, displayName: msg.displayName };
    this.connections.set(msg.peerId, { ws, info });
    this.addToRoom(resolvedRoomId, msg.peerId);

    const welcome: WelcomeMessage = {
      type: "welcome",
      roomId: resolvedRoomId,
      assignedPeerId: msg.peerId,
      serverTime: new Date().toISOString(),
      currentVector: { ...room.vector },
      latestCheckpointId: room.latestCheckpointId,
      peers: this.peerRegistry.getPeers(resolvedRoomId),
    };

    this.sendTo(ws, welcome);

    const joined: PeerJoinedMessage = {
      type: "peer.joined",
      peer: peerState,
      timestamp: new Date().toISOString(),
    };
    this.broadcastToRoom(resolvedRoomId, joined, ws);
  }

  private handleHeartbeat(ws: ServerWebSocket<unknown>, msg: CollabWireMessage & { type: "heartbeat" }): void {
    this.peerRegistry.updateLastSeen(msg.peerId, msg.peerId);
    this.peerRegistry.updateVector(msg.peerId, msg.peerId, msg.vector);
  }

  private sendTo(ws: ServerWebSocket<unknown>, msg: CollabWireMessage): void {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  }

  private broadcastToRoom(roomId: string, msg: CollabWireMessage, exclude?: ServerWebSocket<unknown>): void {
    const peerIds = this.roomConnections.get(roomId);
    if (!peerIds) return;

    const payload = JSON.stringify(msg);

    for (const peerId of peerIds) {
      const conn = this.connections.get(peerId);
      if (!conn) continue;
      if (exclude && conn.ws === exclude) continue;
      if (conn.ws.readyState === 1) {
        conn.ws.send(payload);
      }
    }
  }

  private addToRoom(roomId: string, peerId: string): void {
    let peers = this.roomConnections.get(roomId);
    if (!peers) {
      peers = new Set();
      this.roomConnections.set(roomId, peers);
    }
    peers.add(peerId);
  }

  private removeFromRoom(roomId: string, peerId: string): void {
    const peers = this.roomConnections.get(roomId);
    if (!peers) return;
    peers.delete(peerId);
    if (peers.size === 0) {
      this.roomConnections.delete(roomId);
    }
  }

  private findEntryByWs(ws: ServerWebSocket<unknown>): { ws: ServerWebSocket<unknown>; info: WebSocketPeerInfo } | undefined {
    for (const entry of this.connections.values()) {
      if (entry.ws === ws) return entry;
    }
    return undefined;
  }

  private getRoomIdForMessage(ws: ServerWebSocket<unknown>, msg: CollabWireMessage): string | undefined {
    if (msg.type === "hello") return msg.roomId ?? (ws as any).data?.roomId ?? "default";
    if (msg.type === "delta.submit") return (msg as DeltaSubmitMessage).delta.roomId;
    if (msg.type === "checkpoint.offer") return (msg as CheckpointOfferMessage).roomId;
    const entry = this.findEntryByWs(ws);
    return entry?.info.roomId;
  }

  getConnectedRoomIds(): string[] {
    return Array.from(this.roomConnections.keys());
  }

  getConnectedPeerCount(roomId: string): number {
    return this.roomConnections.get(roomId)?.size ?? 0;
  }
}
