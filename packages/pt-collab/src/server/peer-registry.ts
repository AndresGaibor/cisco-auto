import type { PeerState, PeerCapability, CollabRole, CollabHashes } from "../protocol/messages.js";

export class PeerRegistry {
  private peersByRoom = new Map<string, Map<string, PeerState>>();
  private peerConnections = new Map<string, number>();

  addPeer(roomId: string, peer: PeerState): void {
    let roomPeers = this.peersByRoom.get(roomId);
    if (!roomPeers) {
      roomPeers = new Map();
      this.peersByRoom.set(roomId, roomPeers);
    }
    roomPeers.set(peer.peerId, peer);
  }

  removePeer(roomId: string, peerId: string): PeerState | undefined {
    const roomPeers = this.peersByRoom.get(roomId);
    if (!roomPeers) return undefined;
    const peer = roomPeers.get(peerId);
    roomPeers.delete(peerId);
    this.peerConnections.delete(peerId);
    if (roomPeers.size === 0) {
      this.peersByRoom.delete(roomId);
    }
    return peer;
  }

  getPeer(roomId: string, peerId: string): PeerState | undefined {
    return this.peersByRoom.get(roomId)?.get(peerId);
  }

  getPeers(roomId: string): PeerState[] {
    const roomPeers = this.peersByRoom.get(roomId);
    return roomPeers ? Array.from(roomPeers.values()) : [];
  }

  getPeerCount(roomId: string): number {
    return this.peersByRoom.get(roomId)?.size ?? 0;
  }

  updateLastSeen(roomId: string, peerId: string): void {
    const peer = this.getPeer(roomId, peerId);
    if (peer) {
      peer.lastSeenAt = new Date().toISOString();
    }
  }

  updateHashes(roomId: string, peerId: string, hashes: CollabHashes): void {
    const peer = this.getPeer(roomId, peerId);
    if (peer) {
      peer.hashes = hashes;
    }
  }

  updateVector(roomId: string, peerId: string, vector: Record<string, number>): void {
    const peer = this.getPeer(roomId, peerId);
    if (peer) {
      peer.vector = vector;
    }
  }

  trackConnection(peerId: string, socketId: number): void {
    this.peerConnections.set(peerId, socketId);
  }

  getConnectionSocketId(peerId: string): number | undefined {
    return this.peerConnections.get(peerId);
  }

  disconnectPeer(peerId: string): void {
    this.peerConnections.delete(peerId);
  }

  generatePeerId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "peer_";
    for (let i = 0; i < 16; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  createPeerState(params: {
    peerId: string;
    displayName: string;
    role?: CollabRole;
    capabilities?: PeerCapability[];
    packetTracerVersion?: string;
    activeFile?: string;
  }): PeerState {
    return {
      peerId: params.peerId,
      displayName: params.displayName,
      role: params.role ?? "peer",
      connectedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      capabilities: params.capabilities ?? [],
      packetTracerVersion: params.packetTracerVersion,
      activeFile: params.activeFile,
      vector: {},
      hashes: { deviceHashes: {} },
    };
  }
}
