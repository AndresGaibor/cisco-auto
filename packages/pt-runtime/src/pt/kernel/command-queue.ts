// packages/pt-runtime/src/pt/kernel/command-queue.ts
// Command queue polling and atomic claim
//
// Flow: poll() lists only commands/*.json → sorts ascending → attempts atomic
// claim by moving to in-flight/ → parses envelope → returns claimed command.
// Corrupt files go to dead-letter/. cleanup() removes in-flight/ file and
// optionally commands/ residue.

import type { CommandEnvelope } from "./types";

export interface CommandQueue {
  poll(): CommandEnvelope | null;
  cleanup(filename: string): void;
  count(): number;
}

export function createCommandQueue(config: {
  commandsDir: string;
  inFlightDir: string;
  deadLetterDir: string;
}) {
  function listQueuedFiles(): string[] {
    const jsonFiles: string[] = [];

    // Only list from commands/ directory (source of truth for pending work)
    try {
      const files = fm.getFilesInDirectory(config.commandsDir);
      if (files) {
        for (const file of files) {
          if (file.indexOf(".json") !== -1) {
            jsonFiles.push(file);
          }
        }
      }
    } catch (e) {
      dprint("[queue] Error listing commands dir: " + String(e));
    }

    jsonFiles.sort();
    return jsonFiles;
  }

  function count(): number {
    let c = 0;
    try {
      c += fm.getFilesInDirectory(config.commandsDir)?.length || 0;
    } catch (e) {
      dprint("[queue] Error counting commands: " + String(e));
    }
    return c;
  }

  function poll(): CommandEnvelope | null {
    const files = listQueuedFiles();

    for (const filename of files) {
      const srcPath = config.commandsDir + "/" + filename;
      const dstPath = config.inFlightDir + "/" + filename;

      // ATOMIC CLAIM: try to move from commands/ to in-flight/
      // If already in in-flight/, skip (being processed by another tick)
      try {
        if (fm.fileExists(dstPath)) {
          // Already claimed, skip
          continue;
        }

        if (!fm.fileExists(srcPath)) {
          // Source gone, skip
          continue;
        }

        // Attempt atomic move
        fm.moveSrcFileToDestFile(srcPath, dstPath, false);
        dprint("[queue] Claimed: " + filename);
      } catch (e) {
        // Claim failed (race or lock), skip to next
        dprint("[queue] Claim failed for " + filename + ": " + String(e));
        continue;
      }

      // Read from in-flight/ (we claimed it)
      try {
        const content = fm.getFileContents(dstPath);
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

        // Invalid envelope structure
        moveToDeadLetter(dstPath, "Invalid envelope: missing id");
      } catch (e) {
        // Corrupt JSON or read error
        dprint("[queue] Invalid command file: " + filename + " - " + String(e));
        moveToDeadLetter(dstPath, e);
      }
    }

    return null;
  }

  function moveToDeadLetter(filePath: string, error: unknown): void {
    try {
      const basename = filePath.split("/").pop() || "unknown";
      const timestamp = String(Date.now());
      const dlPath = config.deadLetterDir + "/" + timestamp + "-" + basename;

      // Move the corrupt file to dead-letter
      try {
        fm.moveSrcFileToDestFile(filePath, dlPath, false);
      } catch (e) {
        // If move fails, file is already gone - just write error log
        dprint("[queue] Could not move to dead-letter: " + String(e));
      }

      // Write error metadata
      fm.writePlainTextToFile(
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
    // Primary: remove from in-flight/ (we claimed it from there)
    try {
      const inFlightPath = config.inFlightDir + "/" + filename;
      if (fm.fileExists(inFlightPath)) {
        fm.removeFile(inFlightPath);
        dprint("[queue] Cleanup in-flight: " + filename);
      }
    } catch (e) {
      dprint("[queue] Cleanup in-flight error: " + String(e));
    }

    // Compatibility: clean residue from commands/ if it somehow still exists
    try {
      const commandsPath = config.commandsDir + "/" + filename;
      if (fm.fileExists(commandsPath)) {
        fm.removeFile(commandsPath);
        dprint("[queue] Cleanup commands residue: " + filename);
      }
    } catch (e) {
      dprint("[queue] Cleanup commands error: " + String(e));
    }
  }

  return { poll, cleanup, count };
}
