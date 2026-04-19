// packages/pt-runtime/src/pt/kernel/queue-index.ts
// Índice auxiliar _queue.json.
// NO es la fuente primaria de verdad.
// Si contradice a commands/*.json, gana commands/*.json.

import { safeFM } from "./safe-fm";

export interface QueueIndex {
  read(): string[];
  remove(filename: string): void;
  add(filename: string): void;
  rebuildFromFiles(files: string[]): void;
}

function normalizeFileList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const out: string[] = [];
  const seen: Record<string, boolean> = {};

  for (const item of value) {
    const name = String(item || "").trim();
    if (!name) continue;
    if (name === "_queue.json") continue;
    if (name.indexOf(".json") === -1) continue;
    if (seen[name]) continue;
    seen[name] = true;
    out.push(name);
  }

  out.sort();
  return out;
}

export function createQueueIndex(commandsDir: string): QueueIndex {
  const queuePath = commandsDir + "/_queue.json";

  function readRaw(): string[] {
    const s = safeFM();
    if (!s.available || !s.fm) return [];

    try {
      if (!s.fm.fileExists(queuePath)) return [];

      const content = s.fm.getFileContents(queuePath);
      if (!content || content.trim().length === 0) return [];

      const parsed = JSON.parse(content);
      return normalizeFileList(parsed);
    } catch (e) {
      dprint("[queue-index] read error: " + String(e));
      return [];
    }
  }

  function writeRaw(files: string[]): void {
    const s = safeFM();
    if (!s.available || !s.fm) return;

    try {
      const normalized = normalizeFileList(files);
      s.fm.writePlainTextToFile(queuePath, JSON.stringify(normalized));
    } catch (e) {
      dprint("[queue-index] write error: " + String(e));
    }
  }

  function read(): string[] {
    return readRaw();
  }

  function remove(filename: string): void {
    try {
      const current = readRaw();
      const filtered: string[] = [];
      let changed = false;

      for (const entry of current) {
        if (entry === filename) {
          changed = true;
          continue;
        }
        filtered.push(entry);
      }

      if (!changed) return;
      writeRaw(filtered);
      dprint("[queue-index] removed: " + filename);
    } catch (e) {
      dprint("[queue-index] remove error: " + String(e));
    }
  }

  function add(filename: string): void {
    try {
      const name = String(filename || "").trim();
      if (!name || name === "_queue.json" || name.indexOf(".json") === -1) return;

      const current = readRaw();
      for (const entry of current) {
        if (entry === name) return;
      }

      current.push(name);
      writeRaw(current);
      dprint("[queue-index] added: " + name);
    } catch (e) {
      dprint("[queue-index] add error: " + String(e));
    }
  }

  function rebuildFromFiles(files: string[]): void {
    try {
      writeRaw(files);
      dprint("[queue-index] rebuilt from commands scan (" + String(files.length) + " files)");
    } catch (e) {
      dprint("[queue-index] rebuild error: " + String(e));
    }
  }

  return { read, remove, add, rebuildFromFiles };
}