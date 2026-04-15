// packages/pt-runtime/src/pt/kernel/command-queue.ts
// Command queue polling and atomic claim
//
// PT's getFilesInDirectory() does not reliably discover files created by the
// external CLI, so the CLI writes commands/_queue.json as the primary index.
// The kernel reads that index, claims files atomically, and keeps the index
// clean by removing stale or consumed entries.

import type { CommandEnvelope } from "./types";
import { safeFM } from "./safe-fm";

export interface CommandQueue {
  poll(): CommandEnvelope | null;
  cleanup(filename: string): void;
  count(): number;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const values: string[] = [];
  for (const item of value) {
    values.push(String(item));
  }
  return values;
}

export function createCommandQueue(config: {
  commandsDir: string;
  inFlightDir: string;
  deadLetterDir: string;
}) {
  function readQueueIndex(): string[] {
    const s = safeFM();
    if (!s.available || !s.fm) return [];

    try {
      const queuePath = config.commandsDir + "/_queue.json";
      if (!s.fm.fileExists(queuePath)) return [];

      const content = s.fm.getFileContents(queuePath);
      if (!content || content.trim().length === 0) return [];

      const parsed = JSON.parse(content);
      return toStringArray(parsed).filter((file) => file.indexOf(".json") !== -1 && file.indexOf("_queue.json") === -1);
    } catch (e) {
      dprint("[queue] _queue.json read error: " + String(e));
      return [];
    }
  }

  function removeFromQueueIndex(filename: string): void {
    const s = safeFM();
    if (!s.available || !s.fm) return;

    try {
      const queuePath = config.commandsDir + "/_queue.json";
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
        dprint("[queue] Removed from _queue.json: " + filename);
      }
    } catch (e) {
      dprint("[queue] removeFromQueueIndex error: " + String(e));
    }
  }

  function listFromDirectory(): string[] {
    const s = safeFM();
    if (!s.available || !s.fm) return [];

    const jsonFiles: string[] = [];

    try {
      const files = s.fm.getFilesInDirectory(config.commandsDir);
      if (files && files.length > 0) {
        for (const file of files) {
          const name = String(file);
          if (name.indexOf(".json") !== -1 && name.indexOf("_queue.json") === -1) {
            jsonFiles.push(name);
          }
        }
      }
    } catch {
      // Fallback best-effort.
    }

    if (jsonFiles.length > 0) return jsonFiles;

    try {
      const appWindow = (typeof ipc !== "undefined" && ipc !== null) ? ipc.appWindow?.() : null;
      const fallbackFiles = appWindow && typeof appWindow.listDirectory === "function"
        ? appWindow.listDirectory(config.commandsDir)
        : [];

      for (const file of fallbackFiles ?? []) {
        const name = String(file);
        if (name.indexOf(".json") !== -1 && name.indexOf("_queue.json") === -1) {
          jsonFiles.push(name);
        }
      }
    } catch {
      // Fallback best-effort.
    }

    return jsonFiles;
  }

  function listQueuedFiles(): string[] {
    const seen: Record<string, boolean> = {};
    const files: string[] = [];

    for (const file of readQueueIndex()) {
      if (seen[file]) continue;
      seen[file] = true;
      files.push(file);
    }

    for (const file of listFromDirectory()) {
      if (seen[file]) continue;
      seen[file] = true;
      files.push(file);
    }

    files.sort();
    return files;
  }

  function count(): number {
    return listQueuedFiles().length;
  }

  function poll(): CommandEnvelope | null {
    const s = safeFM();
    if (!s.available || !s.fm) return null;
    const _fm = s.fm;

    const files = listQueuedFiles();
    dprint("[queue] poll -> " + String(files.length) + " candidates");

    for (const filename of files) {
      const srcPath = config.commandsDir + "/" + filename;
      const dstPath = config.inFlightDir + "/" + filename;

      try {
        if (_fm.fileExists(dstPath)) {
          removeFromQueueIndex(filename);
          continue;
        }

        if (!_fm.fileExists(srcPath)) {
          removeFromQueueIndex(filename);
          continue;
        }

        _fm.moveSrcFileToDestFile(srcPath, dstPath, false);
        removeFromQueueIndex(filename);
        dprint("[queue] Claimed: " + filename);
      } catch (e) {
        dprint("[queue] Claim failed for " + filename + ": " + String(e));
        continue;
      }

      try {
        const content = _fm.getFileContents(dstPath);
        if (!content || content.length < 10) {
          dprint("[queue] Empty file: " + filename);
          moveToDeadLetter(dstPath, "Empty file");
          continue;
        }

        const cmd: CommandEnvelope = JSON.parse(content);
        if (cmd && cmd.id) {
          dprint("[queue] Parsed OK: " + filename);
          return { ...cmd, filename } as CommandEnvelope;
        }

        moveToDeadLetter(dstPath, "Invalid envelope: missing id");
      } catch (e) {
        dprint("[queue] Invalid command file: " + filename + " - " + String(e));
        moveToDeadLetter(dstPath, e);
      }
    }

    return null;
  }

  function moveToDeadLetter(filePath: string, error: unknown): void {
    const s = safeFM();
    if (!s.available || !s.fm) return;
    const _fm = s.fm;

    try {
      const basename = filePath.split("/").pop() || "unknown";
      const timestamp = String(Date.now());
      const dlPath = config.deadLetterDir + "/" + timestamp + "-" + basename;

      try {
        _fm.moveSrcFileToDestFile(filePath, dlPath, false);
      } catch (e) {
        dprint("[queue] Could not move to dead-letter: " + String(e));
      }

      _fm.writePlainTextToFile(
        dlPath + ".error.json",
        JSON.stringify({
          originalFile: basename,
          error: String(error),
          movedAt: Date.now(),
        }),
      );

      dprint("[queue] Moved to dead-letter: " + basename);
    } catch (e) {
      dprint("[queue] Dead-letter error: " + String(e));
    }
  }

  function cleanup(filename: string): void {
    const s = safeFM();
    if (!s.available || !s.fm) return;
    const _fm = s.fm;

    try {
      const inFlightPath = config.inFlightDir + "/" + filename;
      if (_fm.fileExists(inFlightPath)) {
        _fm.removeFile(inFlightPath);
        dprint("[queue] Cleanup in-flight: " + filename);
      }
    } catch (e) {
      dprint("[queue] Cleanup in-flight error: " + String(e));
    }

    try {
      const commandsPath = config.commandsDir + "/" + filename;
      if (_fm.fileExists(commandsPath)) {
        _fm.removeFile(commandsPath);
        dprint("[queue] Cleanup commands residue: " + filename);
      }
    } catch (e) {
      dprint("[queue] Cleanup commands error: " + String(e));
    }

    removeFromQueueIndex(filename);
  }

  return { poll, cleanup, count };
}
