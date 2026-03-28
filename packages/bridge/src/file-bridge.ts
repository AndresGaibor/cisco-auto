import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export interface BridgeCommandFile {
  id: string;
  tipo: 'agregarDispositivo' | 'conectar' | 'configurar' | 'eliminarDispositivo' 
    | 'listarDispositivos' | 'obtenerDispositivo' | 'obtenerEnlaces' 
    | 'ping' | 'test';
  args: unknown[];
  timestamp: number;
}

export interface BridgeResponseFile {
  id: string;
  tipo: string;
  ok: boolean;
  message: string;
  data?: unknown;
  timestamp: string;
}

export const BRIDGE_DIR = process.env.BRIDGE_DIR || '/tmp/cisco-auto-bridge';
export const COMMAND_FILE = join(BRIDGE_DIR, 'bridge-command.json');
export const RESPONSE_FILE = join(BRIDGE_DIR, 'bridge-response.json');

function ensureDir(): void {
  mkdirSync(dirname(COMMAND_FILE), { recursive: true });
}

export function writeCommandFile(command: BridgeCommandFile): void {
  ensureDir();

  const tempFile = `${COMMAND_FILE}.tmp`;
  writeFileSync(tempFile, JSON.stringify(command, null, 2), 'utf-8');
  renameSync(tempFile, COMMAND_FILE);
}

export function readCommandFile(): BridgeCommandFile | null {
  try {
    const raw = readFileSync(COMMAND_FILE, 'utf-8');
    if (!raw.trim()) return null;
    return JSON.parse(raw) as BridgeCommandFile;
  } catch {
    return null;
  }
}

export function removeCommandFile(): void {
  try {
    unlinkSync(COMMAND_FILE);
  } catch {
  }
}

export function writeResponseFile(response: BridgeResponseFile): void {
  ensureDir();
  const tempFile = `${RESPONSE_FILE}.tmp`;
  writeFileSync(tempFile, JSON.stringify(response, null, 2), 'utf-8');
  renameSync(tempFile, RESPONSE_FILE);
}

export function readResponseFile(): BridgeResponseFile | null {
  try {
    const raw = readFileSync(RESPONSE_FILE, 'utf-8');
    if (!raw.trim()) return null;
    return JSON.parse(raw) as BridgeResponseFile;
  } catch {
    return null;
  }
}
