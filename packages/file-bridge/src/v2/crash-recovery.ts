/**
 * Crash Recovery - Recovers inconsistent state from crashes
 * Handles re-queuing, deduplication, and dead-letter management
 */

import { join } from "node:path";
import { readdirSync, readFileSync, unlinkSync, renameSync, existsSync } from "node:fs";
import type { BridgeResultEnvelope } from "../shared/protocol.js";
import { BridgePathLayout } from "../shared/path-layout.js";
import { SequenceStore } from "../shared/sequence-store.js";
import { EventLogWriter } from "../event-log-writer.js";
import { atomicWriteFile, ensureDir, listJsonFiles, readJsonFile } from "../shared/fs-atomic.js";
import { parseCommandFileName } from "../shared/path-layout.js";

export class CrashRecovery {
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly seq: SequenceStore,
    private readonly eventWriter: EventLogWriter,
  ) {}

  recover(): void {
    try {
      // Fase 1: Purgar comandos duplicados en commands/
      const commandFiles = listJsonFiles(this.paths.commandsDir());
      for (const file of commandFiles) {
        const filePath = join(this.paths.commandsDir(), file);
        const parsed = parseCommandFileName(file);
        if (!parsed) {
          // Archivo malformado - mover a dead-letter
          this.moveToDeadLetter(filePath, new Error("Invalid command filename"));
          continue;
        }
        const cmdId = `cmd_${String(parsed.seq).padStart(12, "0")}`;
        const resultPath = this.paths.resultFilePath(cmdId);
        // Si ya existe resultado, purgar el comando
        if (existsSync(resultPath)) {
          try {
            unlinkSync(filePath);
            this.eventWriter.append({
              seq: this.seq.next(),
              ts: Date.now(),
              type: "command-purged-duplicate",
              id: cmdId,
              note: "duplicate in commands/ queue",
            });
          } catch {
            // Ignore
          }
        }
      }

      // Fase 2: Recuperar in-flight/
      const inFlightFiles = listJsonFiles(this.paths.inFlightDir());

      for (const file of inFlightFiles) {
        const filePath = join(this.paths.inFlightDir(), file);
        const cmdId = this.extractCmdId(file);
        const resultPath = this.paths.resultFilePath(cmdId);

        if (existsSync(resultPath)) {
          try {
            unlinkSync(filePath);
          } catch {
            // ignore
          }

          this.eventWriter.append({
            seq: this.seq.next(),
            ts: Date.now(),
            type: "command-recovered",
            id: cmdId,
            note: "result existed but in-flight was not cleaned",
          });
        } else {
          try {
            const content = readFileSync(filePath, "utf8");
            const cmd = JSON.parse(content);

            if ((cmd.attempt ?? 1) < 3) {
              cmd.attempt = (cmd.attempt ?? 1) + 1;
              const newFile = this.paths.commandFilePath(cmd.seq, cmd.type);
              atomicWriteFile(newFile, JSON.stringify(cmd));
              unlinkSync(filePath);

              this.eventWriter.append({
                seq: this.seq.next(),
                ts: Date.now(),
                type: "command-requeued",
                id: cmdId,
                attempt: cmd.attempt,
              });
            } else {
              const failResult: BridgeResultEnvelope = {
                protocolVersion: 2,
                id: cmdId,
                seq: cmd.seq,
                completedAt: Date.now(),
                status: "failed",
                ok: false,
                error: {
                  code: "MAX_RETRIES",
                  message: `Command failed after ${cmd.attempt} attempts`,
                  phase: "execute",
                },
              };
              atomicWriteFile(resultPath, JSON.stringify(failResult));
              unlinkSync(filePath);

              this.eventWriter.append({
                seq: this.seq.next(),
                ts: Date.now(),
                type: "command-failed",
                id: cmdId,
                note: "max retries exceeded",
              });
            }
          } catch (err) {
            // corrupted file — move to dead-letter
            this.moveToDeadLetter(filePath, err);
          }
        }
      }
    } catch (err) {
      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "recovery-error",
        error: String(err),
      });
    }
  }

  private extractCmdId(filename: string): string {
    const seq = filename.replace(".json", "").split("-")[0] ?? "0";
    return `cmd_${seq.padStart(12, "0")}`;
  }

  private moveToDeadLetter(filePath: string, error: unknown): void {
    const basename = filePath.split("/").pop() ?? "unknown";
    const deadLetterPath = this.paths.deadLetterFile(`${Date.now()}-${basename}`);
    try {
      ensureDir(this.paths.deadLetterDir());
      renameSync(filePath, deadLetterPath);
      atomicWriteFile(
        `${deadLetterPath}.error.json`,
        JSON.stringify({
          originalFile: basename,
          error: String(error),
          movedAt: Date.now(),
        }),
      );
      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "command-corrupted",
        note: basename,
        error: String(error),
      });
    } catch {
      // Ignore - logging at best
    }
  }
}
