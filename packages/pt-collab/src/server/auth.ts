export interface CollabAuthStore {
  getRoomToken(roomId: string): string | undefined;
  setRoomToken(roomId: string, token: string): void;
  validateToken(roomId: string, token: string): boolean;
}

export class InMemoryAuthStore implements CollabAuthStore {
  private tokens = new Map<string, string>();

  getRoomToken(roomId: string): string | undefined {
    return this.tokens.get(roomId);
  }

  setRoomToken(roomId: string, token: string): void {
    this.tokens.set(roomId, token);
  }

  validateToken(roomId: string, token: string): boolean {
    const stored = this.tokens.get(roomId);
    if (!stored) return false;
    return stored === token;
  }
}
