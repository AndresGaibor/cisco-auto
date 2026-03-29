import { appendFileSync, writeFileSync } from "node:fs";

/**
 * Write a single NDJSON event to a file.
 */
export function writeEvent(file: string, seq: number, type: string, extra: Record<string, unknown> = {}): void {
  const event = { seq, ts: seq * 1000, type, ...extra };
  appendFileSync(file, JSON.stringify(event) + "\n", "utf8");
}
