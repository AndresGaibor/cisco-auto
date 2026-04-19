// packages/pt-runtime/src/pt/kernel/queue-claim.ts
// Lógica de claim atómico: mover commands -> in-flight y reclamar huérfanos
// Refactor Bloque B: funciones extraídas, detección de copy-delete, validación completa de envelope

// FUENTE DE VERDAD: commands/*.json (filesystem) — scan directo del directorio
// _queue.json es legacy fallback, NO fuente primary (detrás de flag USE_LEGACY_QUEUE_INDEX)

import { safeFM } from "./safe-fm";
import type { CommandEnvelope } from "./types";
import { QueueIndex } from "./queue-index";
import { QueueDiscovery } from "./queue-discovery";
import { DeadLetter } from "./dead-letter";
import { writeDebugLog } from "./debug-log";

const USE_LEGACY_QUEUE_INDEX = process.env.USE_LEGACY_QUEUE_INDEX === "true";

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
  function logQueue(message: string): void {
    writeDebugLog("queue", message);
  }

  function listCandidates(): string[] {
    const seen: Record<string, boolean> = {};
    const files: string[] = [];

    // Fuente primary: filesystem (commands/*.json)
    for (const file of queueDiscovery.scan()) {
      if (seen[file]) continue;
      seen[file] = true;
      files.push(file);
    }

    // Legacy fallback: _queue.json (solo si flag habilitado)
    // Este índice puede estar desactualizado vs el filesystem real
    if (USE_LEGACY_QUEUE_INDEX) {
      for (const file of queueIndex.read()) {
        if (seen[file]) continue;
        seen[file] = true;
        files.push(file);
      }
    }

    files.sort();
    logQueue("[queue-claim] candidatos vistos: " + files.length + " (fs=" + seen["_"] + ")");
    return files;
  }

  function count(): number {
    return listCandidates().length;
  }

  function parseEnvelopeAtPath(filename: string, dstPath: string): CommandEnvelope | null {
    const s = safeFM();
    if (!s.available || !s.fm) return null;
    const fm = s.fm;

    const content = fm.getFileContents(dstPath);
    if (!content || content.length < 10) {
      logQueue("[queue-claim] archivo vacío: " + filename);
      deadLetter.move(dstPath, { reason: "empty-file", filename });
      return null;
    }

    let cmd: CommandEnvelope;
    try {
      cmd = JSON.parse(content);
    } catch (e) {
      logQueue("[queue-claim] JSON corrupto: " + filename + " - " + String(e));
      deadLetter.move(dstPath, { reason: "json-parse-error", filename, error: String(e) });
      return null;
    }

    if (!cmd || typeof cmd.id !== "string" || typeof cmd.seq !== "number") {
      logQueue("[queue-claim] envelope inválido: falta id/seq en " + filename);
      deadLetter.move(dstPath, { reason: "invalid-envelope", filename, cmd });
      return null;
    }

    if (typeof cmd.type !== "string") {
      logQueue("[queue-claim] envelope inválido: falta type en " + filename);
      deadLetter.move(dstPath, { reason: "invalid-envelope", filename, cmd });
      return null;
    }

    if (!cmd.payload || typeof cmd.payload !== "object") {
      logQueue("[queue-claim] envelope inválido: falta payload en " + filename);
      deadLetter.move(dstPath, { reason: "invalid-envelope", filename, cmd });
      return null;
    }

    logQueue("[queue-claim] parseado OK: " + filename + " tipo=" + cmd.type);
    return { ...cmd, filename } as CommandEnvelope;
  }

  function reclaimFromInFlight(filename: string, dstPath: string): CommandEnvelope | null {
    logQueue("[queue-claim] reclaim in-flight: " + filename);
    const parsed = parseEnvelopeAtPath(filename, dstPath);
    if (parsed) {
      logQueue("[queue-claim] reclaim exitoso: " + filename);
    }
    return parsed;
  }

  function claimFromCommands(
    filename: string,
    srcPath: string,
    dstPath: string,
  ): CommandEnvelope | null {
    logQueue("[queue-claim] claim desde commands: " + filename);
    const s = safeFM();
    if (!s.available || !s.fm) return null;
    const fm = s.fm;

    if (!fm.fileExists(srcPath)) return null;

    const content = fm.getFileContents(srcPath);
    if (!content || content.length < 10) {
      logQueue("[queue-claim] source vacío: " + filename);
      return null;
    }

    let cmd: CommandEnvelope;
    try {
      cmd = JSON.parse(content);
    } catch (e) {
      logQueue("[queue-claim] source JSON corrupto: " + filename + " - " + String(e));
      return null;
    }

    if (!cmd || typeof cmd.id !== "string" || typeof cmd.seq !== "number") {
      logQueue("[queue-claim] source envelope inválido: " + filename);
      return null;
    }

    const modo = s.claimMode;
    logQueue("[queue-claim] modo de claim: " + modo);

    if (modo === "copy-delete") {
      const ok = s.moveOrCopyDelete(srcPath, dstPath, false);
      if (!ok) {
        logQueue("[queue-claim] copy-delete falló: " + filename);
        return null;
      }
      if (fm.fileExists(srcPath)) {
        logQueue("[queue-claim] source residue tras copy-delete: " + filename);
        try {
          fm.removeFile(srcPath);
        } catch {}
      }
    } else {
      try {
        fm.moveSrcFileToDestFile(srcPath, dstPath, false);
      } catch (e) {
        logQueue("[queue-claim] move atómico falló: " + String(e));
        return null;
      }
    }

    const parsed = parseEnvelopeAtPath(filename, dstPath);
    if (!parsed) {
      logQueue("[queue-claim] claimFromCommands parse falló: " + filename);
    }
    return parsed;
  }

  function handleInvalidEnvelope(filename: string, dstPath: string, reasonDetail: string): void {
    logQueue("[queue-claim] envelope inválido: " + filename + " razón=" + reasonDetail);
    deadLetter.move(dstPath, { reason: "invalid-envelope", filename, reasonDetail });
  }

  function poll(): CommandEnvelope | null {
    const s = safeFM();
    if (!s.available || !s.fm) {
      logQueue("[queue-claim] FM no disponible");
      return null;
    }
    const fm = s.fm;

    const files = listCandidates();
    if (files.length > 0) {
      logQueue("[queue-claim] candidatos: " + files.length + " " + JSON.stringify(files.slice(0, 3)));
    }

    for (const filename of files) {
      const srcPath = commandsDir + "/" + filename;
      const dstPath = inFlightDir + "/" + filename;

      if (fm.fileExists(dstPath)) {
        logQueue("[queue-claim] destino existe, reclaim: " + filename);
        const cmd = reclaimFromInFlight(filename, dstPath);
        if (cmd) return cmd;

        logQueue("[queue-claim] reclaim fallback: " + filename);
        const fallback = claimFromCommands(filename, srcPath, dstPath);
        if (fallback) return fallback;
        continue;
      }

      if (!fm.fileExists(srcPath)) {
        continue;
      }

      const modo = s.claimMode;
      logQueue("[queue-claim] claim nuevo: " + filename + " modo=" + modo);

      if (modo === "copy-delete") {
        const ok = s.moveOrCopyDelete(srcPath, dstPath, false);
        if (!ok) {
          logQueue("[queue-claim] claim copy-delete falló: " + filename);
          continue;
        }
        if (fm.fileExists(srcPath)) {
          logQueue("[queue-claim] source residue post-claim: " + filename);
          try {
            fm.removeFile(srcPath);
          } catch {}
        }
      } else {
        try {
          fm.moveSrcFileToDestFile(srcPath, dstPath, false);
        } catch (e) {
          logQueue("[queue-claim] claim move falló: " + filename + " - " + String(e));
          continue;
        }
      }

      const cmd = parseEnvelopeAtPath(filename, dstPath);
      if (cmd) return cmd;
    }

    return null;
  }

  return { poll, count };
}