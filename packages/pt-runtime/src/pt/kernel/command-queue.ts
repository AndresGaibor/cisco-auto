// packages/pt-runtime/src/pt/kernel/command-queue.ts
// Command queue polling and atomic claim
//
// Flow: poll() lists only commands/*.json → sorts ascending → attempts atomic
// claim by moving to in-flight/ → parses envelope → returns claimed command.
// Corrupt files go to dead-letter/. cleanup() removes in-flight/ file and
// optionally commands/ residue.

import type { CommandEnvelope } from "./types";
import { safeFM } from "./safe-fm";

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
    const s = safeFM();
    if (!s.available || !s.fm) {
      dprint("[queue] fm unavailable — cannot list commands");
      return jsonFiles;
    }
    try {
      dprint("[queue] scanning commands dir: " + config.commandsDir);
      let files = s.fm.getFilesInDirectory(config.commandsDir);
      dprint("[queue] fm.getFilesInDirectory -> " + String(files ? files.length : 0));
      if (files && files.length > 0) {
        dprint("[queue] fm files sample -> " + files.slice(0, 5).join(","));
      }
      if (!files || files.length === 0) {
        try {
          const appWindow = (typeof ipc !== "undefined" && ipc !== null) ? ipc.appWindow?.() : null;
          const fallbackFiles = appWindow && typeof appWindow.listDirectory === "function"
            ? appWindow.listDirectory(config.commandsDir)
            : [];
          dprint("[queue] appWindow.listDirectory -> " + String(fallbackFiles ? fallbackFiles.length : 0));
          if (fallbackFiles && fallbackFiles.length > 0) {
            dprint("[queue] appWindow files sample -> " + fallbackFiles.slice(0, 5).join(","));
          }
          if (fallbackFiles && fallbackFiles.length > 0) {
            dprint("[queue] Using appWindow.listDirectory fallback for commands");
            files = fallbackFiles;
          }
        } catch (fallbackErr) {
          dprint("[queue] appWindow listDirectory fallback failed: " + String(fallbackErr));
        }
      }
      if ((!files || files.length === 0) && typeof _ScriptModule !== "undefined" && _ScriptModule !== null && typeof _ScriptModule.getFilesInDirectory === "function") {
        try {
          const scriptModuleFiles = _ScriptModule.getFilesInDirectory(config.commandsDir);
          dprint("[queue] _ScriptModule.getFilesInDirectory -> " + String(scriptModuleFiles ? scriptModuleFiles.length : 0));
          if (scriptModuleFiles && scriptModuleFiles.length > 0) {
            dprint("[queue] _ScriptModule files sample -> " + scriptModuleFiles.slice(0, 5).join(","));
            dprint("[queue] Using _ScriptModule.getFilesInDirectory fallback for commands");
            files = scriptModuleFiles;
          }
        } catch (scriptModuleErr) {
          dprint("[queue] _ScriptModule listDirectory fallback failed: " + String(scriptModuleErr));
        }
      }
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
    const files = listQueuedFiles();
    dprint("[queue] count -> " + String(files.length));
    return files.length;
  }

  function poll(): CommandEnvelope | null {
    const s = safeFM();
    if (!s.available || !s.fm) return null;
    const _fm = s.fm;

    const files = listQueuedFiles();
    dprint("[queue] poll files -> " + String(files.length));

    for (const filename of files) {
      dprint("[queue] poll trying -> " + filename);
      const srcPath = config.commandsDir + "/" + filename;
      const dstPath = config.inFlightDir + "/" + filename;

      try {
        if (_fm.fileExists(dstPath)) { continue; }
        if (!_fm.fileExists(srcPath)) { continue; }
        _fm.moveSrcFileToDestFile(srcPath, dstPath, false);
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
  }

  return { poll, cleanup, count };
}
