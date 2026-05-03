import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function looksLikeWindowsAbsolutePath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value) || /^\\\\[^\\]+\\[^\\]+/.test(value);
}

export function normalizeHostPath(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  if (looksLikeWindowsAbsolutePath(trimmed)) {
    return trimmed.replace(/\\/g, "/").replace(/\/+$/g, "");
  }

  return resolve(trimmed).replace(/\/+$/g, "");
}

export function getDefaultDevDir(): string {
  const fromEnv = process.env.PT_DEV_DIR?.trim();

  if (fromEnv) {
    return normalizeHostPath(fromEnv);
  }

  return normalizeHostPath(join(homedir(), "pt-dev"));
}
