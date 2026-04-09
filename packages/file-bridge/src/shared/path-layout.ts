/**
 * Path layout for Bridge V2 directory structure.
 *
 * NOTE: FileBridge V2 uses a durable queue-based command protocol.
 * The primary path is:
 *   - commands/*.json: pending commands queue (FIFO by seq)
 *   - in-flight/*.json: commands claimed by PT for processing
 *   - results/<id>.json: authoritative result for each command
 *   - dead-letter/*.json: corrupted commands that couldn't be processed
 *   - logs/events.current.ndjson: event journal
 *
 * Legacy compatibility:
 *   - command.json at root is DEPRECATED - only used for transition period
 *   - It will be converted to commands/ on first use
 *
 * All paths are derived from a single root (pt-dev directory).
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

export class BridgePathLayout {
  constructor(readonly root: string) {}

  /** Bridge lease file for single-instance enforcement */
  leaseFile(): string {
    return join(this.root, "bridge-lease.json");
  }

  /** Current topology/state snapshot */
  stateFile(): string {
    return join(this.root, "state.json");
  }

  /** Queue of pending commands */
  commandsDir(): string {
    return join(this.root, "commands");
  }

  /** Commands currently being processed by PT */
  inFlightDir(): string {
    return join(this.root, "in-flight");
  }

  /** Authoritative results for each command */
  resultsDir(): string {
    return join(this.root, "results");
  }

  /** NDJSON event journal directory */
  logsDir(): string {
    return join(this.root, "logs");
  }

  /** Current NDJSON events file (active for writing) */
  currentEventsFile(): string {
    return join(this.logsDir(), "events.current.ndjson");
  }

  /** Consumer checkpoint directory */
  consumerStateDir(): string {
    return join(this.root, "consumer-state");
  }

  /** Path to a consumer checkpoint file */
  consumerCheckpointFile(consumerId: string): string {
    return join(this.consumerStateDir(), `${consumerId}.json`);
  }

  /** Rotation manifest file (tracks rotated log files) */
  rotationManifestFile(): string {
    return join(this.logsDir(), "rotation-manifest.json");
  }

  /** Dead letter directory for corrupted command files */
  deadLetterDir(): string {
    return join(this.root, "dead-letter");
  }

  /** Dead letter file for a specific command */
  deadLetterFile(basename: string): string {
    return join(this.deadLetterDir(), basename);
  }

  /** Garbage collector state file */
  gcStateFile(): string {
    return join(this.root, "gc-state.json");
  }

  /** Sequence number store file */
  sequenceStoreFile(): string {
    return join(this.root, "protocol.seq.json");
  }

  /**
   * Generate a command filename from seq and type.
   * Format: "<seq>-<sanitized_type>.json"
   * Example: "000000000042-configIos.json"
   */
  commandFileName(seq: number, type: string): string {
    return `${String(seq).padStart(12, "0")}-${sanitizeName(type)}.json`;
  }

  /** Full path to a command file in the commands/ queue directory */
  commandFilePath(seq: number, type: string): string {
    return join(this.commandsDir(), this.commandFileName(seq, type));
  }

  /** Full path to a command file in the in-flight/ directory */
  inFlightFilePath(seq: number, type: string): string {
    return join(this.inFlightDir(), this.commandFileName(seq, type));
  }

  /** Full path to a result file for a given command ID */
  resultFilePath(id: string): string {
    return join(this.resultsDir(), `${id}.json`);
  }

  /** Generate a command ID from a sequence number */
  commandIdFromSeq(seq: number): string {
    return `cmd_${String(seq).padStart(12, "0")}`;
  }

  /** Full path to a dead-letter error metadata file */
  deadLetterErrorFile(basename: string): string {
    return join(this.deadLetterDir(), `${basename}.error.json`);
  }
}
