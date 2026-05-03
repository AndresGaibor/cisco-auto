const MAX_EVENTOS = 250;
const FLUSH_INTERVAL_MS = 1000;
const DUPLICATE_WINDOW_MS = 5000;

let eventos: string[] = [];
let seqActual = 0;
let logsDir = "";

let lastFlushAt = 0;
let dirty = false;

let lastSignature = "";
let duplicateCount = 0;
let lastDuplicateFlushAt = 0;

function nowMs(): number {
  return Date.now();
}

function getGlobalScope(): any {
  try {
    return typeof self !== "undefined" ? self : Function("return this")();
  } catch {
    return {};
  }
}

function getSafeFm(): any {
  try {
    const scope = getGlobalScope();
    if (scope && typeof scope.safeFM === "function") {
      return scope.safeFM();
    }
  } catch {}

  return null;
}

function isUsableArray(value: any): boolean {
  try {
    return (
      value != null &&
      typeof value.length === "number" &&
      typeof value.splice === "function" &&
      typeof value.join === "function"
    );
  } catch {
    return false;
  }
}

function ensureEventBuffer(): void {
  if (!isUsableArray(eventos)) {
    eventos = [];
  }
}

function appendEventLine(line: string): void {
  ensureEventBuffer();

  try {
    // No usar eventos.push(...). En QtScript hemos visto:
    // "Property 'push' of object queue is not a function".
    eventos[eventos.length] = line;

    if (eventos.length > MAX_EVENTOS) {
      const extra = eventos.length - MAX_EVENTOS;
      if (extra > 0) {
        eventos.splice(0, extra);
      }
    }

    dirty = true;
  } catch {
    // El logger no puede romper el kernel.
    try {
      eventos = [];
      eventos[0] = line;
      dirty = true;
    } catch {
      dirty = false;
    }
  }
}

function safeJsonStringify(value: any): string {
  try {
    return JSON.stringify(value);
  } catch {
    try {
      return String(value);
    } catch {
      return "";
    }
  }
}

function pushEvent(scope: string, mensaje: string, nivel: string): void {
  try {
    seqActual += 1;

    appendEventLine(
      safeJsonStringify({
        seq: seqActual,
        timestamp: new Date().toISOString(),
        scope: String(scope == null ? "" : scope),
        message: String(mensaje == null ? "" : mensaje),
        level: String(nivel == null ? "debug" : nivel),
      }),
    );
  } catch {
    // Silencio absoluto: debug-log nunca debe tumbar pollCommandQueue.
  }
}

function flushDebugLog(force = false): void {
  try {
    if (!logsDir || !dirty) return;

    const now = nowMs();

    if (!force && now - lastFlushAt < FLUSH_INTERVAL_MS) {
      return;
    }

    ensureEventBuffer();

    const s = getSafeFm();
    if (!s || !s.fm || typeof s.fm.writePlainTextToFile !== "function") {
      return;
    }

    const contenido = eventos.join("\n") + (eventos.length > 0 ? "\n" : "");
    s.fm.writePlainTextToFile(logsDir + "/pt-debug.current.ndjson", contenido);

    lastFlushAt = now;
    dirty = false;
  } catch {
    // Silencio absoluto si fm falla o QtScript rompe algo.
    dirty = false;
  }
}

export function initDebugLog(dir: string): void {
  try {
    logsDir = String(dir == null ? "" : dir);
    eventos = [];
    seqActual = 0;
    lastFlushAt = 0;
    dirty = false;
    lastSignature = "";
    duplicateCount = 0;
    lastDuplicateFlushAt = 0;
  } catch {}
}

export function writeDebugLog(scope: string, mensaje: string, nivel: string = "debug"): void {
  try {
    if (!logsDir) return;

    const safeScope = String(scope == null ? "" : scope);
    const safeLevel = String(nivel == null ? "debug" : nivel);
    const msg = String(mensaje == null ? "" : mensaje);
    const signature = safeScope + "|" + safeLevel + "|" + msg;
    const now = nowMs();

    if (signature === lastSignature) {
      duplicateCount += 1;

      if (now - lastDuplicateFlushAt < DUPLICATE_WINDOW_MS) {
        return;
      }

      pushEvent(
        safeScope,
        msg + " [repeated " + duplicateCount + "x in " + DUPLICATE_WINDOW_MS + "ms window]",
        safeLevel,
      );

      duplicateCount = 0;
      lastDuplicateFlushAt = now;
      flushDebugLog(false);
      return;
    }

    if (duplicateCount > 0 && lastSignature) {
      const firstSep = lastSignature.indexOf("|");
      const secondSep = firstSep >= 0 ? lastSignature.indexOf("|", firstSep + 1) : -1;

      const prevScope = firstSep >= 0 ? lastSignature.substring(0, firstSep) : safeScope;
      const prevLevel =
        firstSep >= 0 && secondSep >= 0
          ? lastSignature.substring(firstSep + 1, secondSep)
          : safeLevel;
      const prevMsg = secondSep >= 0 ? lastSignature.substring(secondSep + 1) : msg;

      pushEvent(
        prevScope,
        prevMsg + " [repeated " + duplicateCount + "x suppressed]",
        prevLevel,
      );
    }

    lastSignature = signature;
    duplicateCount = 0;
    lastDuplicateFlushAt = now;

    pushEvent(safeScope, msg, safeLevel);
    flushDebugLog(false);
  } catch {
    // El logger jamás debe propagar errores.
  }
}

export function flushDebugLogNow(): void {
  try {
    flushDebugLog(true);
  } catch {}
}

export function limpiarDebugLog(): void {
  try {
    eventos = [];
    seqActual = 0;
    dirty = true;
    lastSignature = "";
    duplicateCount = 0;
    flushDebugLog(true);
  } catch {}
}
