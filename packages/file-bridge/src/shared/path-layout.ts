/**
 * Path layout for Bridge V2 directory structure.
 * All paths are derived from a single root (pt-dev directory).
 */
import { join } from "node:path";

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
}
