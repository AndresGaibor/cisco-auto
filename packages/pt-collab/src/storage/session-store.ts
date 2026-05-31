import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { getSessionFilePath, getPidFilePath, getCollabRoot } from "./collab-paths.js";

export interface SessionInfo {
  schemaVersion: number;
  mode: "host" | "client";
  localPort?: number;
  publicUrl?: string;
  sessionSecret?: string;
  startedAt: string;
  pid: number;
}

export function readSessionFile(): SessionInfo | null {
  const path = getSessionFilePath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as SessionInfo;
  } catch {
    return null;
  }
}

export function writeSessionFile(info: Omit<SessionInfo, "schemaVersion">): void {
  const path = getSessionFilePath();
  const root = getCollabRoot();
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  const data: SessionInfo = { schemaVersion: 1, ...info };
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

export function deleteSessionFile(): void {
  const path = getSessionFilePath();
  if (existsSync(path)) unlinkSync(path);
}

export function readPidFile(): number | null {
  const path = getPidFilePath();
  if (!existsSync(path)) return null;
  try {
    const val = Number(readFileSync(path, "utf-8").trim());
    return Number.isNaN(val) ? null : val;
  } catch {
    return null;
  }
}

export function writePidFile(): void {
  const path = getPidFilePath();
  const root = getCollabRoot();
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  writeFileSync(path, String(process.pid) + "\n");
}

export function deletePidFile(): void {
  const path = getPidFilePath();
  if (existsSync(path)) unlinkSync(path);
}

export function isSessionActive(): boolean {
  return existsSync(getSessionFilePath());
}
