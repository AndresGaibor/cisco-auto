// packages/pt-runtime/src/pt/kernel/command-queue.ts
// Command queue polling and claim

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

    // COMMANDS_DIR (legacy)
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

    // IN_FLIGHT_DIR (FileBridge V2)
    try {
      const files = fm.getFilesInDirectory(config.inFlightDir);
      if (files) {
        for (const file of files) {
          if (file.indexOf(".json") !== -1 && jsonFiles.indexOf(file) === -1) {
            jsonFiles.push(file);
          }
        }
      }
    } catch (e) {
      dprint("[queue] Error listing in-flight dir: " + String(e));
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
    try {
      c += fm.getFilesInDirectory(config.inFlightDir)?.length || 0;
    } catch (e) {
      dprint("[queue] Error counting in-flight: " + String(e));
    }
    return c;
  }

  function poll(): CommandEnvelope | null {
    const files = listQueuedFiles();

    for (const filename of files) {
      const srcPath = config.commandsDir + "/" + filename;
      const dstPath = config.inFlightDir + "/" + filename;

      let readPath: string | null = null;
      let writePath: string | null = null;

      try {
        if (fm.fileExists(dstPath)) {
          readPath = dstPath;
        } else if (fm.fileExists(srcPath)) {
          readPath = srcPath;
          writePath = dstPath;
        }
      } catch (e) {
        continue;
      }

      if (!readPath) continue;

      try {
        const content = fm.getFileContents(readPath);
        if (!content || content.length < 10) {
          dprint("[queue] Empty file: " + filename);
          continue;
        }

        const cmd: CommandEnvelope = JSON.parse(content);
        if (cmd && cmd.id) {
          // Move to in-flight if from commands/
          if (writePath) {
            try {
              fm.moveSrcFileToDestFile(readPath, writePath, false);
              dprint("[queue] Moved to in-flight: " + filename);
            } catch (e) {
              try {
                fm.removeFile(readPath);
              } catch (e2) {
                dprint("[queue] Failed to cleanup stale file: " + String(e2));
              }
            }
          }

          dprint("[queue] Claimed: " + filename);
          return { ...cmd, filename } as CommandEnvelope;
        }
      } catch (e) {
        dprint("[queue] Invalid command file: " + filename + " - " + String(e));
        moveToDeadLetter(readPath, e);
      }
    }

    return null;
  }

  function moveToDeadLetter(filePath: string, error: unknown): void {
    try {
      const basename = filePath.split("/").pop() || "unknown";
      const timestamp = String(Date.now());
      const dlPath = config.deadLetterDir + "/" + timestamp + "-" + basename;

      fm.moveSrcFileToDestFile(filePath, dlPath, false);
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
    try {
      const inFlightPath = config.inFlightDir + "/" + filename;
      if (fm.fileExists(inFlightPath)) {
        fm.removeFile(inFlightPath);
      }
      const commandsPath = config.commandsDir + "/" + filename;
      if (fm.fileExists(commandsPath)) {
        fm.removeFile(commandsPath);
      }
    } catch (e) {
      dprint("[queue] Cleanup error: " + String(e));
    }
  }

  return { poll, cleanup, count };
}
