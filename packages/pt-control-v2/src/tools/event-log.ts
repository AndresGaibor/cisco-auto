import { readFileSync, existsSync } from "node:fs";
import type { PTEvent } from "../types/index.js";
import { PTEventSchema } from "../types/events.js";

export interface EventReadOptions {
  /** Skip invalid lines instead of throwing */
  skipInvalid?: boolean;
}

export interface EventSummary {
  total: number;
  counts: Record<string, number>;
  latest: PTEvent | null;
}

export function parseEventLine(line: string): PTEvent | null {
  try {
    const parsed = JSON.parse(line);
    return PTEventSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function readEvents(filePath: string, options: EventReadOptions = {}): PTEvent[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").map((line) => line.trim()).filter(Boolean);
  const events: PTEvent[] = [];

  for (const line of lines) {
    const parsed = parseEventLine(line);
    if (parsed) {
      events.push(parsed);
    } else if (!options.skipInvalid) {
      throw new Error(`Invalid NDJSON line: ${line}`);
    }
  }

  return events;
}

export function summarizeEvents(events: PTEvent[]): EventSummary {
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
  }

  const latest = events.length ? events[events.length - 1] : null;
  return { total: events.length, counts, latest };
}

export function tailEvents(events: PTEvent[], limit: number): PTEvent[] {
  if (limit <= 0) return events;
  return events.slice(-limit);
}
