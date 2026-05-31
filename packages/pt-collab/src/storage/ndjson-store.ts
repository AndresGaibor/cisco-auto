import { appendFileSync, existsSync, readFileSync } from "node:fs";

export function appendToNdjson<T>(path: string, entry: T): void {
  appendFileSync(path, JSON.stringify(entry) + "\n", "utf-8");
}

export function readNdjson<T>(path: string): T[] {
  if (!existsSync(path)) return [];

  const content = readFileSync(path, "utf-8").trim();
  if (!content) return [];

  return content.split("\n").filter(Boolean).map((line) => JSON.parse(line) as T);
}
