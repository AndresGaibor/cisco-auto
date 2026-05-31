import { readSessionFile, deleteSessionFile, deletePidFile, readPidFile } from "../storage/session-store.js";

export interface StopSimpleSessionResult {
  hadSession: boolean;
  mode?: "host" | "client";
}

export async function stopSimpleSession(): Promise<StopSimpleSessionResult> {
  const session = readSessionFile();
  if (!session) {
    return { hadSession: false };
  }

  deleteSessionFile();
  deletePidFile();

  return {
    hadSession: true,
    mode: session.mode,
  };
}

export function isSessionActive(): boolean {
  return readSessionFile() !== null;
}
