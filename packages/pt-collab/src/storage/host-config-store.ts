import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { getHostConfigPath, getCollabRoot } from "./collab-paths.js";

export interface HostConfig {
  schemaVersion: number;
  lastPort: number;
  lastPublicUrl?: string;
  lastStartedAt?: string;
  sessionSecret: string;
  funnelPort: number;
}

const SECRET_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateSessionSecret(): string {
  let secret = "";
  for (let i = 0; i < 12; i++) {
    secret += SECRET_CHARS[Math.floor(Math.random() * SECRET_CHARS.length)];
  }
  return secret;
}

export function readHostConfig(): HostConfig | null {
  const path = getHostConfigPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as HostConfig;
  } catch {
    return null;
  }
}

export function writeHostConfig(config: HostConfig): void {
  const path = getHostConfigPath();
  const root = getCollabRoot();
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
}

export function getOrCreateHostConfig(port?: number): HostConfig {
  const existing = readHostConfig();
  if (existing) {
    existing.lastPort = port ?? existing.lastPort;
    existing.lastStartedAt = new Date().toISOString();
    writeHostConfig(existing);
    return existing;
  }

  const config: HostConfig = {
    schemaVersion: 1,
    lastPort: port ?? 3937,
    sessionSecret: generateSessionSecret(),
    funnelPort: 443,
    lastStartedAt: new Date().toISOString(),
  };

  writeHostConfig(config);
  return config;
}

export function resetSessionSecret(): HostConfig {
  const existing: HostConfig = readHostConfig() ?? {
    schemaVersion: 1,
    lastPort: 3937,
    sessionSecret: generateSessionSecret(),
    funnelPort: 443,
  };
  existing.sessionSecret = generateSessionSecret();
  writeHostConfig(existing);
  return existing;
}
