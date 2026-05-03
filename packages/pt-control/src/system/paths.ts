import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function looksLikeWindowsAbsolutePath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value) || /^\\\\[^\\]+\\[^\\]+/.test(value);
}

export function isWindowsAbsolutePath(value: string): boolean {
  return looksLikeWindowsAbsolutePath(value);
}

export function isForeignWindowsPathOnThisHost(value: string): boolean {
  return process.platform !== "win32" && isWindowsAbsolutePath(value);
}

export function normalizeHostPath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (looksLikeWindowsAbsolutePath(trimmed)) {
    return trimmed.replace(/\\/g, "/").replace(/\/+$/g, "");
  }

  return resolve(trimmed);
}

export function resolvePtDevDir(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env.PT_DEV_DIR?.trim();

  if (fromEnv) {
    return normalizeHostPath(fromEnv);
  }

  return join(homedir(), "pt-dev");
}
