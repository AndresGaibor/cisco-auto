// packages/pt-runtime/src/pt/kernel/queue-claim.ts
// Lógica de claim atómico: mover commands → in-flight y reclamar huérfanos

import { safeFM } from "./safe-fm";
import type { CommandEnvelope } from "./types";
import { QueueIndex } from "./queue-index";
import { QueueDiscovery } from "./queue-discovery";
import { DeadLetter } from "./dead-letter";

export interface QueueClaim {
  poll(): CommandEnvelope | null;
  count(): number;
}

export function createQueueClaim(
  commandsDir: string,
  inFlightDir: string,
  queueIndex: QueueIndex,
  queueDiscovery: QueueDiscovery,
  deadLetter: DeadLetter,
): QueueClaim {
  function listCandidates(): string[] {
    const seen: Record<string, boolean> = {};
    const files: string[] = [];

    for (const file of queueIndex.read()) {
      if (seen[file]) continue;
      seen[file] = true;
      files.push(file);
    }

    for (const file of queueDiscovery.scan()) {
      if (seen[file]) continue;
      seen[file] = true;
      files.push(file);
    }

    files.sort();
    return files;
  }

  function count(): number {
    return listCandidates().length;
  }

  function poll(): CommandEnvelope | null {
    const s = safeFM();
    if (!s.available || !s.fm) {
      dprint("[queue-claim] FM not available");
      return null;
    }
    const fm = s.fm;

    const files = listCandidates();
    if (files.length > 0) {
      dprint(
        "[queue-claim] candidates: " + files.length + " - " + JSON.stringify(files.slice(0, 3)),
      );
    }

    for (const filename of files) {
      const srcPath = commandsDir + "/" + filename;
      const dstPath = inFlightDir + "/" + filename;

      try {
        if (fm.fileExists(dstPath)) {
          dprint("[queue-claim] reclaiming in-flight: " + filename);
          const cmd = tryReclaimFromInFlight(filename, dstPath);
          if (cmd) return cmd;

          const fallback = tryReclaimFromCommands(filename, srcPath, dstPath);
          if (fallback) return fallback;
          continue;
        }

        if (!fm.fileExists(srcPath)) {
          continue;
        }

        fm.moveSrcFileToDestFile(srcPath, dstPath, false);
        dprint("[queue-claim] claimed: " + filename);
      } catch (e) {
        dprint("[queue-claim] claim failed: " + filename + " - " + String(e));
        continue;
      }

      const cmd = tryParseEnvelope(filename, dstPath);
      if (cmd) return cmd;
    }

    return null;
  }

  function tryReclaimFromInFlight(filename: string, dstPath: string): CommandEnvelope | null {
    const s = safeFM();
    if (!s.available || !s.fm) return null;
    const fm = s.fm;

    try {
      const content = fm.getFileContents(dstPath);
      if (content && content.length >= 10) {
        const cmd: CommandEnvelope = JSON.parse(content);
        if (cmd && cmd.id) {
          dprint("[queue-claim] reclaimed from in-flight: " + filename);
          return { ...cmd, filename } as CommandEnvelope;
        }
        dprint("[queue-claim] reclaim invalid envelope: " + filename);
      }
    } catch (e) {
      dprint("[queue-claim] reclaim failed: " + filename + " - " + String(e));
    }
    return null;
  }

  function tryReclaimFromCommands(
    filename: string,
    srcPath: string,
    dstPath: string,
  ): CommandEnvelope | null {
    const s = safeFM();
    if (!s.available || !s.fm) return null;
    const fm = s.fm;

    if (!fm.fileExists(srcPath)) return null;

    try {
      const content = fm.getFileContents(srcPath);
      if (content && content.length >= 10) {
        const cmd: CommandEnvelope = JSON.parse(content);
        if (cmd && cmd.id) {
          try {
            fm.moveSrcFileToDestFile(srcPath, dstPath, false);
          } catch (moveErr) {
            dprint("[queue-claim] fallback move error: " + String(moveErr));
          }
          dprint("[queue-claim] reclaimed from commands: " + filename);
          return { ...cmd, filename } as CommandEnvelope;
        }
      }
    } catch (fallbackErr) {
      dprint("[queue-claim] reclaim fallback failed: " + filename + " - " + String(fallbackErr));
    }
    return null;
  }

  function tryParseEnvelope(filename: string, dstPath: string): CommandEnvelope | null {
    const s = safeFM();
    if (!s.available || !s.fm) return null;
    const fm = s.fm;

    try {
      const content = fm.getFileContents(dstPath);
      if (!content || content.length < 10) {
        dprint("[queue-claim] empty file: " + filename);
        deadLetter.move(dstPath, "Empty file");
        return null;
      }

      const cmd: CommandEnvelope = JSON.parse(content);
      if (cmd && cmd.id) {
        dprint("[queue-claim] parsed: " + filename);
        return { ...cmd, filename } as CommandEnvelope;
      }

      deadLetter.move(dstPath, "Invalid envelope: missing id");
    } catch (e) {
      dprint("[queue-claim] invalid command: " + filename + " - " + String(e));
      deadLetter.move(dstPath, e);
    }
    return null;
  }

  return { poll, count };
}
