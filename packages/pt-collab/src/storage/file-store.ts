import { readFileSync, writeFileSync, existsSync } from "node:fs";

export function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(path: string, data: T): void {
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}
