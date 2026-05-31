import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { getClientConfigPath, getCollabRoot } from "./collab-paths.js";

export interface ClientConfig {
  schemaVersion: number;
  lastUrl?: string;
  peerId?: string;
  displayName?: string;
  lastConnectedAt?: string;
  autoReconnect?: boolean;
}

export function readClientConfig(): ClientConfig | null {
  const path = getClientConfigPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as ClientConfig;
  } catch {
    return null;
  }
}

export function writeClientConfig(config: ClientConfig): void {
  const path = getClientConfigPath();
  const root = getCollabRoot();
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
}

export function updateClientUrl(url: string, displayName?: string): ClientConfig {
  const existing = readClientConfig() ?? {
    schemaVersion: 1,
    autoReconnect: true,
  };
  existing.lastUrl = url;
  existing.lastConnectedAt = new Date().toISOString();
  if (displayName) existing.displayName = displayName;
  writeClientConfig(existing);
  return existing;
}

export function resetClientUrl(): void {
  const existing = readClientConfig();
  if (existing) {
    delete existing.lastUrl;
    writeClientConfig(existing);
  }
}
