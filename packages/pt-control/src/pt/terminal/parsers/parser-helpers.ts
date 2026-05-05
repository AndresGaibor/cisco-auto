import type { ParsedTerminalEvidence } from "../terminal-output-parsers.js";

export function linesOf(raw: string): string[] {
  return String(raw ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export type LineRecordParser<T> = {
  skip?: (line: string) => boolean;
  parse: (line: string) => T | null;
};

export function parseLineRecords<T>(raw: string, parser: LineRecordParser<T>): T[] {
  const records: T[] = [];

  for (const line of linesOf(raw)) {
    if (parser.skip?.(line)) {
      continue;
    }

    const record = parser.parse(line);
    if (record) {
      records.push(record);
    }
  }

  return records;
}

export function splitCsvList(raw: string | undefined): string[] {
  return raw
    ? raw.split(",").map((part) => part.trim()).filter(Boolean)
    : [];
}

export function createRawEvidence(parserId: string, raw: string): ParsedTerminalEvidence {
  return {
    parserId,
    facts: { raw: String(raw ?? "") },
  };
}