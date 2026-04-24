/**
 * Estructura de directorios del FileBridge V2.
 *
 * Utiliza una cola basada en archivos para comandos durables.
 *
 * Estructura primaria:
 *   - commands/*.json: cola FIFO de comandos pendientes (ordenados por seq)
 *   - in-flight/*.json: comandos en proceso por PT (claim via rename)
 *   - results/<id>.json: resultado authoritative de cada comando
 *   - dead-letter/*.json: comandos corruptos que no se pudieron procesar
 *   - logs/events.current.ndjson: journal de eventos NDJSON
 *
 * Todos los paths se derivan de un único root (directorio pt-dev).
 */
import { join } from "node:path";

/**
 * Parse a command filename to extract seq and type.
 * Format: "<seq>-<type>.json" (e.g., "000000000042-configIos.json")
 * Returns null if filename doesn't match expected format.
 */
export function parseCommandFileName(name: string): { seq: number; type: string } | null {
  if (!name.endsWith(".json")) return null;
  const base = name.slice(0, -5);
  const match = base.match(/^(\d+)-(.*)$/);
  if (!match) return null;
  const seqStr = match[1];
  const type = match[2];
  if (seqStr === undefined || type === undefined) return null;
  return {
    seq: parseInt(seqStr, 10),
    type: type,
  };
}

/**
 * Sanitize a string for use in a filename.
 * Replaces any character that is not alphanumeric, dot, underscore, or hyphen
 * with an underscore.
 */
function sanitizeName(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Gestor de paths del filesystem del bridge.
 * Centraliza la estructura de directorios en un solo lugar.
 */
export class BridgePathLayout {
  /**
   * @param root - Directorio raíz del bridge (pt-dev)
   */
  constructor(readonly root: string) {}

  /** Archivo de lease para enforce de instancia única */
  leaseFile(): string {
    return join(this.root, "bridge-lease.json");
  }

  /** Archivo de snapshot de topología/estado */
  stateFile(): string {
    return join(this.root, "state.json");
  }

  /** Directorio de comandos pendientes (cola FIFO) */
  commandsDir(): string {
    return join(this.root, "commands");
  }

  /** Directorio de comandos en proceso por PT */
  inFlightDir(): string {
    return join(this.root, "in-flight");
  }

  /** Directorio de resultados de comandos */
  resultsDir(): string {
    return join(this.root, "results");
  }

  /** Directorio del journal NDJSON de eventos */
  logsDir(): string {
    return join(this.root, "logs");
  }

  /** Archivo actual de eventos NDJSON (activo para escritura) */
  currentEventsFile(): string {
    return join(this.logsDir(), "events.current.ndjson");
  }

  /** Directorio de checkpoints de consumers */
  consumerStateDir(): string {
    return join(this.root, "consumer-state");
  }

  /** Path al archivo de checkpoint de un consumer específico */
  consumerCheckpointFile(consumerId: string): string {
    return join(this.consumerStateDir(), `${consumerId}.json`);
  }

  /** Archivo manifest de rotación de logs */
  rotationManifestFile(): string {
    return join(this.logsDir(), "rotation-manifest.json");
  }

  /** Directorio de dead letters (comandos corruptos) */
  deadLetterDir(): string {
    return join(this.root, "dead-letter");
  }

  /** Path a un archivo de dead letter específico */
  deadLetterFile(basename: string): string {
    return join(this.deadLetterDir(), basename);
  }

  /** Archivo de estado del garbage collector */
  gcStateFile(): string {
    return join(this.root, "gc-state.json");
  }

  /** Archivo del store de números de secuencia */
  sequenceStoreFile(): string {
    return join(this.root, "protocol.seq.json");
  }

  /**
   * Genera nombre de archivo de comando desde seq y type.
   * Formato: "<seq>-<type_sanitized>.json"
   * Ejemplo: "000000000042-configIos.json"
   */
  commandFileName(seq: number, type: string): string {
    return `${String(seq).padStart(12, "0")}-${sanitizeName(type)}.json`;
  }

  /** Path completo a archivo de comando en commands/ */
  commandFilePath(seq: number, type: string): string {
    return join(this.commandsDir(), this.commandFileName(seq, type));
  }

  /** Path completo a archivo de comando en in-flight/ */
  inFlightFilePath(seq: number, type: string): string {
    return join(this.inFlightDir(), this.commandFileName(seq, type));
  }

  /** Path completo a archivo de resultado para un commandId */
  resultFilePath(id: string): string {
    return join(this.resultsDir(), `${id}.json`);
  }

  /** Genera commandId desde número de secuencia */
  commandIdFromSeq(seq: number): string {
    return `cmd_${String(seq).padStart(12, "0")}`;
  }

  /** Path a archivo de metadata de error de dead letter */
  deadLetterErrorFile(basename: string): string {
    return join(this.deadLetterDir(), `${basename}.error.json`);
  }
}
