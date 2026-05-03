// packages/pt-runtime/src/pt/kernel/queue-claim.ts
// Lógica de claim atómico: mover commands -> in-flight y reclamar huérfanos
// Refactor Bloque B: funciones extraídas, detección de copy-delete, validación completa de envelope

// FUENTE DE VERDAD: commands/*.json (filesystem) — scan directo del directorio
// _queue.json es legacy fallback, NO fuente primaria.
// En PT-side no se usa process.env; si se necesita reactivar este camino,
// debe hacerse por build-time replacement o constante PT-safe.

import { safeFM } from "./safe-fm";
import type { CommandEnvelope } from "./types";
import { QueueIndex } from "./queue-index";
import { QueueDiscovery } from "./queue-discovery";
import { DeadLetter } from "./dead-letter";
import { writeDebugLog } from "./debug-log";

const USE_LEGACY_QUEUE_INDEX = true;

let lastEmptyCandidatesLogAt = 0;
let emptyCandidatesSkipped = 0;

const EMPTY_CANDIDATES_LOG_INTERVAL_MS = 5000;

export interface QueueClaim {
  poll(): CommandEnvelope | null;
  pollAllowedTypes(allowedTypes: string[]): CommandEnvelope | null;
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

  function normalizeCandidateName(value: unknown): string | null {
    const name = String(value == null ? "" : value).trim();

    if (!name) return null;
    if (name === "_queue.json") return null;
    if (name.indexOf(".json") === -1) return null;
    if (name.indexOf("/") >= 0) return null;
    if (name.indexOf("\\") >= 0) return null;

    return name;
  }

  function safeListFromDiscovery(): string[] {
    try {
      const out: string[] = [];

      for (const raw of queueDiscovery.scan()) {
        const name = normalizeCandidateName(raw);
        if (name) out.push(name);
      }

      return out;
    } catch (e) {
      logQueue("[queue-claim] discovery scan failed: " + String(e));
      return [];
    }
  }

  function safeListFromIndex(): string[] {
    try {
      const out: string[] = [];

      for (const raw of queueIndex.read()) {
        const name = normalizeCandidateName(raw);
        if (name) out.push(name);
      }

      return out;
    } catch (e) {
      logQueue("[queue-claim] queue index read failed: " + String(e));
      return [];
    }
  }

  function listCandidates(): string[] {
    const seen: Record<string, boolean> = {};
    const files: string[] = [];

    // Fuente primary: filesystem (commands/*.json)
    for (const file of safeListFromDiscovery()) {
      if (seen[file]) continue;
      seen[file] = true;
      files.push(file);
    }

    // Legacy fallback: _queue.json (solo si flag habilitado)
    if (USE_LEGACY_QUEUE_INDEX) {
      for (const file of safeListFromIndex()) {
        if (seen[file]) continue;
        seen[file] = true;
        files.push(file);
      }
    }

    files.sort();
    logCandidatesSeen(files.length);
    return files;
  }

  function logCandidatesSeen(count: number): void {
    if (count > 0) {
      if (emptyCandidatesSkipped > 0) {
        logQueue("[queue-claim] candidatos vistos: " + count + " skippedEmpty=" + emptyCandidatesSkipped);
        emptyCandidatesSkipped = 0;
      } else {
        logQueue("[queue-claim] candidatos vistos: " + count);
      }
      return;
    }

    emptyCandidatesSkipped++;

    const now = Date.now();

    if (now - lastEmptyCandidatesLogAt < EMPTY_CANDIDATES_LOG_INTERVAL_MS) {
      return;
    }

    logQueue(
      "[queue-claim] candidatos vistos: 0 skipped=" +
        emptyCandidatesSkipped +
        " windowMs=" +
        EMPTY_CANDIDATES_LOG_INTERVAL_MS,
    );

    emptyCandidatesSkipped = 0;
    lastEmptyCandidatesLogAt = now;
  }

  function count(): number {
    return listCandidates().length;
  }

  function allowedSet(allowedTypes: string[]): Record<string, boolean> {
    const set: Record<string, boolean> = {};

    for (const type of allowedTypes) {
      const normalized = String(type || "").trim();
      if (normalized) set[normalized] = true;
    }

    return set;
  }

  function readEnvelopeTypeAtPath(path: string): string | null {
    const s = safeFM();
    if (!s.available || !s.fm) return null;

    try {
      if (!s.fm.fileExists(path)) return null;

      const content = s.fm.getFileContents(path);
      if (!content || content.length < 10) return null;

      const parsed = JSON.parse(content);
      const type = String((parsed as { type?: unknown } | null)?.type ?? "").trim();

      return type || null;
    } catch (e) {
      logQueue("[queue-claim] no se pudo leer type para filtro: " + path + " - " + String(e));
      return null;
    }
  }

  function isAllowedType(type: string | null, allowed: Record<string, boolean>): boolean {
    return !!type && allowed[type] === true;
  }

  function extractTypeFromCommandFilename(filename: string): string | null {
    const normalized = normalizeCandidateName(filename);
    if (!normalized) return null;

    const withoutExt = normalized.endsWith(".json")
      ? normalized.slice(0, -".json".length)
      : normalized;

    const dashIndex = withoutExt.indexOf("-");
    if (dashIndex < 0 || dashIndex >= withoutExt.length - 1) {
      return null;
    }

    return withoutExt.slice(dashIndex + 1);
  }

  function prioritizeAllowedCandidateFiles(
    files: string[],
    allowed: Record<string, boolean>,
  ): string[] {
    const prioritized: string[] = [];
    const rest: string[] = [];

    for (const rawFilename of files) {
      const filename = normalizeCandidateName(rawFilename);
      if (!filename) {
        rest.push(rawFilename);
        continue;
      }

      const filenameType = extractTypeFromCommandFilename(filename);
      if (filenameType && allowed[filenameType] === true) {
        prioritized.push(filename);
      } else {
        rest.push(filename);
      }
    }

    return [...prioritized, ...rest];
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

    return { ...cmd, filename } as CommandEnvelope;
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

    for (const rawFilename of files) {
      const filename = normalizeCandidateName(rawFilename);

      if (!filename) {
        logQueue("[queue-claim] candidato inválido ignorado: " + String(rawFilename));
        continue;
      }

      try {
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
      } catch (e) {
        logQueue("[queue-claim] candidato falló sin tumbar poll: " + filename + " error=" + String(e));
        continue;
      }
    }

    return null;
  }

  function pollAllowedTypes(allowedTypes: string[]): CommandEnvelope | null {
    const s = safeFM();
    if (!s.available || !s.fm) {
      logQueue("[queue-claim] FM no disponible para pollAllowedTypes");
      return null;
    }

    const fm = s.fm;
    const allowed = allowedSet(allowedTypes);

    const files = prioritizeAllowedCandidateFiles(listCandidates(), allowed);
    if (files.length > 0) {
      logQueue(
        "[queue-claim] control candidatos: " +
          files.length +
          " " +
          JSON.stringify(files.slice(0, 5)),
      );
    }

    for (const rawFilename of files) {
      const filename = normalizeCandidateName(rawFilename);

      if (!filename) {
        logQueue("[queue-claim] control candidato inválido: " + String(rawFilename));
        continue;
      }

      try {
        const srcPath = commandsDir + "/" + filename;
        const dstPath = inFlightDir + "/" + filename;

        if (fm.fileExists(dstPath)) {
          const inFlightType = readEnvelopeTypeAtPath(dstPath);

          if (!isAllowedType(inFlightType, allowed)) {
            logQueue(
              "[queue-claim] control skip in-flight no permitido: " +
                filename +
                " tipo=" +
                String(inFlightType),
            );
            continue;
          }

          logQueue("[queue-claim] control reclaim permitido: " + filename);
          const cmd = reclaimFromInFlight(filename, dstPath);
          if (cmd) return cmd;

          continue;
        }

        if (!fm.fileExists(srcPath)) {
          continue;
        }

        const sourceType = readEnvelopeTypeAtPath(srcPath);

        if (!isAllowedType(sourceType, allowed)) {
          logQueue(
            "[queue-claim] control skip commands no permitido: " +
              filename +
              " tipo=" +
              String(sourceType),
          );
          continue;
        }

        logQueue("[queue-claim] control claim permitido: " + filename + " tipo=" + sourceType);

        const claimed = claimFromCommands(filename, srcPath, dstPath);
        if (claimed) return claimed;
      } catch (e) {
        logQueue("[queue-claim] control candidato falló: " + filename + " error=" + String(e));
        continue;
      }
    }

    return null;
  }

  return { poll, pollAllowedTypes, count };
}
