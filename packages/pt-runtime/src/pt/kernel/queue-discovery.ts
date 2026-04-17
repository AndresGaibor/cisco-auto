// packages/pt-runtime/src/pt/kernel/queue-discovery.ts
// Escaneo de archivos JSON en el directorio de comandos
// Fallback cuando _queue.json no está disponible

import { safeFM } from "./safe-fm";

export interface QueueDiscovery {
  scan(): string[];
}

export function createQueueDiscovery(commandsDir: string): QueueDiscovery {
  function scan(): string[] {
    const s = safeFM();
    if (!s.available || !s.fm) return [];

    const jsonFiles: string[] = [];

    try {
      const files = s.fm.getFilesInDirectory(commandsDir);
      if (files && files.length > 0) {
        for (const file of files) {
          const name = String(file);
          if (name.indexOf(".json") !== -1 && name.indexOf("_queue.json") === -1) {
            jsonFiles.push(name);
          }
        }
      }
    } catch (e) {
      dprint("[queue-discovery] scan error: " + String(e));
    }

    return jsonFiles;
  }

  return { scan };
}
