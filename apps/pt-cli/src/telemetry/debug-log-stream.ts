import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export interface DebugLogEntry {
  seq: number;
  timestamp: string;
  scope: string;
  message: string;
  level: string;
}

function parseLogFile(filePath: string): DebugLogEntry[] {
  if (!existsSync(filePath)) return [];
  const contenido = readFileSync(filePath, "utf-8");
  const lineas = contenido.split("\n");
  const entradas: DebugLogEntry[] = [];
  for (const linea of lineas) {
    if (!linea.trim()) continue;
    try {
      const parsed = JSON.parse(linea);
      if (
        typeof parsed.seq === "number" &&
        typeof parsed.timestamp === "string" &&
        typeof parsed.scope === "string" &&
        typeof parsed.message === "string" &&
        typeof parsed.level === "string"
      ) {
        entradas.push(parsed as DebugLogEntry);
      }
    } catch {
      // Saltar líneas corruptas silenciosamente
    }
  }
  return entradas;
}

export interface DebugLogStream {
  tail(n: number): DebugLogEntry[];
  follow(onEntry: (entry: DebugLogEntry) => void, onError?: (error: Error) => void): () => void;
}

export function createDebugLogStream(path: string): DebugLogStream {
  const rutaAbsoluta = resolve(path);
  let ultimoSeqConocido = -1;

  function readEntries(): DebugLogEntry[] {
    return parseLogFile(rutaAbsoluta);
  }

  return {
    tail(n: number): DebugLogEntry[] {
      const entradas = readEntries();
      return entradas.slice(-n);
    },

    follow(onEntry: (entry: DebugLogEntry) => void, onError?: (error: Error) => void): () => void {
      let intervalId: ReturnType<typeof setInterval> | null = null;

      intervalId = setInterval(() => {
        try {
          const entradas = readEntries();
          if (entradas.length === 0) return;

          const seqMasAlto = Math.max(...entradas.map((e) => e.seq));

          if (seqMasAlto < ultimoSeqConocido) {
            // Detectar truncamiento/rotación del archivo
            ultimoSeqConocido = -1;
          }

          for (const entrada of entradas) {
            if (entrada.seq > ultimoSeqConocido) {
              onEntry(entrada);
              ultimoSeqConocido = entrada.seq;
            }
          }
        } catch (err) {
          if (onError && err instanceof Error) {
            onError(err);
          }
        }
      }, 500);

      return () => {
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };
    },
  };
}
