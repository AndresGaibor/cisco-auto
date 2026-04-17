// packages/pt-runtime/src/pt/kernel/queue-index.ts
// Lectura y escritura del índice _queue.json
// El índice es la fuente primaria de verdad para comandos pendientes

import { safeFM } from "./safe-fm";

export interface QueueIndex {
  read(): string[];
  remove(filename: string): void;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const values: string[] = [];
  for (const item of value) {
    values.push(String(item));
  }
  return values;
}

export function createQueueIndex(commandsDir: string): QueueIndex {
  const queuePath = commandsDir + "/_queue.json";

  function read(): string[] {
    const s = safeFM();
    if (!s.available || !s.fm) return [];

    try {
      if (!s.fm.fileExists(queuePath)) return [];

      const content = s.fm.getFileContents(queuePath);
      if (!content || content.trim().length === 0) return [];

      const parsed = JSON.parse(content);
      return toStringArray(parsed).filter(
        (file) => file.indexOf(".json") !== -1 && file.indexOf("_queue.json") === -1,
      );
    } catch (e) {
      dprint("[queue-index] read error: " + String(e));
      return [];
    }
  }

  function remove(filename: string): void {
    const s = safeFM();
    if (!s.available || !s.fm) return;

    try {
      if (!s.fm.fileExists(queuePath)) return;

      const content = s.fm.getFileContents(queuePath);
      if (!content || content.trim().length === 0) return;

      const parsed = JSON.parse(content);
      const queue = toStringArray(parsed);
      let changed = false;
      const filtered: string[] = [];

      for (const entry of queue) {
        if (entry === filename) {
          changed = true;
          continue;
        }
        filtered.push(entry);
      }

      if (changed) {
        s.fm.writePlainTextToFile(queuePath, JSON.stringify(filtered));
        dprint("[queue-index] removed: " + filename);
      }
    } catch (e) {
      dprint("[queue-index] remove error: " + String(e));
    }
  }

  return { read, remove };
}
