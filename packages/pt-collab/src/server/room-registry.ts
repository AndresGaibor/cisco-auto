import type { CollabRoomState, PeerState } from "../protocol/messages.js";
import { createVectorClock } from "../protocol/vector-clock.js";

export class RoomRegistry {
  private rooms = new Map<string, CollabRoomState>();

  getOrCreate(roomId: string, token?: string): CollabRoomState {
    const existing = this.rooms.get(roomId);
    if (existing) return existing;

    const room: CollabRoomState = {
      roomId,
      createdAt: new Date().toISOString(),
      currentEpoch: `epoch_${Date.now()}`,
      peers: {},
      vector: createVectorClock(),
      semanticHashes: {},
    };

    this.rooms.set(roomId, room);
    return room;
  }

  get(roomId: string): CollabRoomState | undefined {
    return this.rooms.get(roomId);
  }

  has(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  addPeer(roomId: string, peer: PeerState): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    room.peers[peer.peerId] = peer;
    room.vector[peer.peerId] = 0;
    return true;
  }

  removePeer(roomId: string, peerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    delete room.peers[peerId];
    return true;
  }

  getPeers(roomId: string): PeerState[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Object.values(room.peers);
  }

  getPeer(roomId: string, peerId: string): PeerState | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    return room.peers[peerId];
  }

  getVector(roomId: string): Record<string, number> {
    const room = this.rooms.get(roomId);
    if (!room) return {};
    return { ...room.vector };
  }

  incrementVector(roomId: string, peerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.vector[peerId] = (room.vector[peerId] ?? 0) + 1;
  }

  setLatestCheckpoint(roomId: string, checkpointId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.latestCheckpointId = checkpointId;
  }

  getAllRoomIds(): string[] {
    return Array.from(this.rooms.keys());
  }

  removeRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }
}
