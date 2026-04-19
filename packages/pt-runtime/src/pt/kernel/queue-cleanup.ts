// packages/pt-runtime/src/pt/kernel/queue-cleanup.ts
// Cleanup de archivos procesados (in-flight + residue en commands)
// _queue.json es índice auxiliar; NO se eliminan commands válidos solo por faltar en el índice.

import { safeFM } from "./safe-fm";
import type { SafeFM } from "./safe-fm";
import { QueueIndex } from "./queue-index";

export interface QueueCleanup {
  cleanup(filename: string): void;
  reconcileIndex(): void;
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
      const seen: Record<string, boolean> = {};

      for (const file of files || []) {
        const name = String(file || "");
        if (!name) continue;
        if (name === "_queue.json") continue;
        if (name.indexOf(".json") === -1) continue;
        if (seen[name]) continue;
        seen[name] = true;
        result.push(name);
      }

      result.sort();
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

  function removeFileIfExists(fm: NonNullable<SafeFM["fm"]>, path: string, label: string): void {
    try {
      if (!fm.fileExists(path)) return;
      fm.removeFile(path);
      dprint("[queue-cleanup] removed " + label + ": " + path);
    } catch (e) {
      dprint("[queue-cleanup] remove " + label + " error: " + String(e));
    }
  }

  function reconcileIndex(): void {
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

    const commandSet: Record<string, boolean> = {};
    const inFlightSet: Record<string, boolean> = {};

    for (const filename of currentCommandFiles) {
      commandSet[filename] = true;
    }
    for (const filename of currentInFlightFiles) {
      inFlightSet[filename] = true;
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

    for (const filename of currentCommandFiles) {
      const commandPath = commandsDir + "/" + filename;
      if (!isStale(fm, commandPath, now)) continue;

      try {
        fm.removeFile(commandPath);
        queueIndex.remove(filename);
        dprint("[queue-cleanup] removed stale command: " + filename);
      } catch (e) {
        dprint("[queue-cleanup] stale command error: " + String(e));
      }
    }

    for (const filename of currentCommandFiles) {
      if (indexedSet[filename]) continue;
      queueIndex.add(filename);
      dprint("[queue-cleanup] reindexed missing queue entry: " + filename);
    }

    for (const filename of indexedFiles) {
      const stillInCommands = !!commandSet[filename];
      const stillInFlight = !!inFlightSet[filename];
      if (stillInCommands || stillInFlight) continue;

      queueIndex.remove(filename);
      dprint("[queue-cleanup] pruned stale index entry: " + filename);
    }
  }

  function cleanup(filename: string): void {
    const s = safeFM();
    if (!s.available || !s.fm) return;
    const fm = s.fm;

    const inFlightPath = inFlightDir + "/" + filename;
    const commandsPath = commandsDir + "/" + filename;

    removeFileIfExists(fm, inFlightPath, "in-flight");
    removeFileIfExists(fm, commandsPath, "commands residue");
    queueIndex.remove(filename);

    reconcileIndex();
  }

  return { cleanup, reconcileIndex };
}