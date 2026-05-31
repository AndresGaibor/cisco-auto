import { join } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

export function getCollabRoot(): string {
  return process.env.PT_COLLAB_DIR ?? join(getHomeDir(), ".pt-cli", "collab");
}

export function getClientConfigPath(): string {
  return join(getCollabRoot(), "client.json");
}

export function getHostConfigPath(): string {
  return join(getCollabRoot(), "host.json");
}

export function getSessionFilePath(): string {
  return join(getCollabRoot(), "current-session.json");
}

export function getPidFilePath(): string {
  return join(getCollabRoot(), "pt-collab.pid");
}

export function getRoomDir(roomId: string): string {
  return join(getCollabRoot(), "rooms", roomId);
}

export function getIdentityPath(): string {
  return join(getCollabRoot(), "identity.json");
}

export function getOpLogPath(roomId: string): string {
  return join(getRoomDir(roomId), "op-log.ndjson");
}

export function getConflictsPath(roomId: string): string {
  return join(getRoomDir(roomId), "conflicts.ndjson");
}

export function getCheckpointsDir(roomId: string): string {
  return join(getRoomDir(roomId), "checkpoints");
}

export function getCheckpointIndexPath(roomId: string): string {
  return join(getRoomDir(roomId), "checkpoints.index.json");
}

export function getRoomStatePath(roomId: string): string {
  return join(getRoomDir(roomId), "room.json");
}

export function getPeersPath(roomId: string): string {
  return join(getRoomDir(roomId), "peers.json");
}

export function ensureCollabDirs(roomId: string): void {
  const dirs = [
    getCollabRoot(),
    join(getCollabRoot(), "rooms"),
    getRoomDir(roomId),
    getCheckpointsDir(roomId),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

function getHomeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || "~";
}
