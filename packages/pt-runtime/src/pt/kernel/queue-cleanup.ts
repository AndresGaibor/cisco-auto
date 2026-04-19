// packages/pt-runtime/src/pt/kernel/queue-cleanup.ts
// Cleanup de archivos procesados (in-flight + residue en commands)

import { safeFM } from "./safe-fm";
import type { SafeFM } from "./safe-fm";
import { QueueIndex } from "./queue-index";

export interface QueueCleanup {
  cleanup(filename: string): void;
}

export function createQueueCleanup(
  commandsDir: string,
  inFlightDir: string,
  queueIndex: QueueIndex,
): QueueCleanup {
  const staleTtlMs = 60 * 60 * 1000;

  function listJsonFiles(fm: SafeFM["fm"], dir: string): string[] {
    try {
      if (!fm || !fm.getFilesInDirectory) return [];

      const files = fm.getFilesInDirectory(dir);
      const result: string[] = [];
      for (const file of files || []) {
        const name = String(file);
        if (name.indexOf(".json") === -1) continue;
        if (name === "_queue.json") continue;
        result.push(name);
      }
      return result;
    } catch {
      return [];
    }
  }

  function isStale(fm: NonNullable<SafeFM["fm"]>, filePath: string, now: number): boolean {
    try {
      if (!fm.getFileModificationTime) return false;
      const mtime = fm.getFileModificationTime(filePath);
      return mtime > 0 && now - mtime > staleTtlMs;
    } catch {
      return false;
    }
  }

  function reconcileQueue(): void {
    const s = safeFM();
    if (!s.available || !s.fm) return;
    const fm = s.fm;
    const now = Date.now();

    const indexedFiles = queueIndex.read();
    const indexedSet: Record<string, boolean> = {};
    for (const filename of indexedFiles) {
      indexedSet[filename] = true;
    }

    const currentCommandFiles = listJsonFiles(fm, commandsDir);
    const currentInFlightFiles = listJsonFiles(fm, inFlightDir);

    for (const filename of currentCommandFiles) {
      const commandPath = commandsDir + "/" + filename;
      if (isStale(fm, commandPath, now)) {
        try {
          fm.removeFile(commandPath);
          queueIndex.remove(filename);
          dprint("[queue-cleanup] removed stale command: " + filename);
        } catch (e) {
          dprint("[queue-cleanup] stale command error: " + String(e));
        }
        continue;
      }

      if (indexedSet[filename]) continue;
      try {
        fm.removeFile(commandPath);
        dprint("[queue-cleanup] removed orphan command: " + filename);
      } catch (e) {
        dprint("[queue-cleanup] orphan remove error: " + String(e));
      }
    }

    for (const filename of currentInFlightFiles) {
      const inFlightPath = inFlightDir + "/" + filename;
      if (!isStale(fm, inFlightPath, now)) continue;
      try {
        fm.removeFile(inFlightPath);
        queueIndex.remove(filename);
        dprint("[queue-cleanup] removed stale in-flight: " + filename);
      } catch (e) {
        dprint("[queue-cleanup] stale in-flight error: " + String(e));
      }
    }

    for (const filename of indexedFiles) {
      const commandPath = commandsDir + "/" + filename;
      const inFlightPath = inFlightDir + "/" + filename;
      try {
        if (fm.fileExists(commandPath) || fm.fileExists(inFlightPath)) continue;
        queueIndex.remove(filename);
        dprint("[queue-cleanup] pruned stale index entry: " + filename);
      } catch (e) {
        dprint("[queue-cleanup] prune error: " + String(e));
      }
    }
  }

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
    reconcileQueue();
  }

  return { cleanup };
}
