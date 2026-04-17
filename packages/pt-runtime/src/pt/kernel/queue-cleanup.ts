// packages/pt-runtime/src/pt/kernel/queue-cleanup.ts
// Cleanup de archivos procesados (in-flight + residue en commands)

import { safeFM } from "./safe-fm";
import { QueueIndex } from "./queue-index";

export interface QueueCleanup {
  cleanup(filename: string): void;
}

export function createQueueCleanup(
  commandsDir: string,
  inFlightDir: string,
  queueIndex: QueueIndex,
): QueueCleanup {
  function cleanup(filename: string): void {
    const s = safeFM();
    if (!s.available || !s.fm) return;
    const fm = s.fm;

    try {
      const inFlightPath = inFlightDir + "/" + filename;
      if (fm.fileExists(inFlightPath)) {
        fm.removeFile(inFlightPath);
        dprint("[queue-cleanup] removed in-flight: " + filename);
      }
    } catch (e) {
      dprint("[queue-cleanup] in-flight error: " + String(e));
    }

    try {
      const commandsPath = commandsDir + "/" + filename;
      if (fm.fileExists(commandsPath)) {
        fm.removeFile(commandsPath);
        dprint("[queue-cleanup] removed commands residue: " + filename);
      }
    } catch (e) {
      dprint("[queue-cleanup] commands error: " + String(e));
    }

    queueIndex.remove(filename);
  }

  return { cleanup };
}
