/**
 * Command Processor - Processes commands from PT (Fase 8)
 * Handles command dequeuing, expiration checks, deduplication, and result publishing
 * CRITICAL: Race condition safe - claim-by-rename atomically prevents double-processing
 */

import { join, basename } from "node:path";
import { readdirSync, readFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import type { BridgeCommandEnvelope, BridgeResultEnvelope } from "../shared/protocol.js";
import { BridgePathLayout, parseCommandFileName } from "../shared/path-layout.js";
import { EventLogWriter } from "../event-log-writer.js";
import { atomicWriteFile, ensureDir, listJsonFiles } from "../shared/fs-atomic.js";

export class CommandProcessor {
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly eventWriter: EventLogWriter,
    private readonly seq: { next: () => number },
  ) {}

  /**
   * Pick next command from queue (Fase 8 - Race condition safe)
   * ATOMIC: Moves file from commands/ to in-flight/ as single operation
   * Returns null if queue empty or all commands are expired/duplicate
   */
  pickNextCommand<T = unknown>(): BridgeCommandEnvelope<T> | null {
    const files = listJsonFiles(this.paths.commandsDir());

    for (const file of files) {
      const srcPath = join(this.paths.commandsDir(), file);

      // Parsear seq y type del filename
      const parsed = parseCommandFileName(file);
      if (!parsed) {
        // Archivo no reconocido - mover a dead-letter
        this.moveToDeadLetter(srcPath, new Error("Invalid command filename format"));
        continue;
      }

      const cmdId = `cmd_${String(parsed.seq).padStart(12, "0")}`;
      const resultPath = this.paths.resultFilePath(cmdId);

      // Deduplicación: si ya existe resultado, purgar el comando duplicado
      if (existsSync(resultPath)) {
        try {
          unlinkSync(srcPath);
          this.eventWriter.append({
            seq: this.seq.next(),
            ts: Date.now(),
            type: "command-purged-duplicate",
            id: cmdId,
            commandType: parsed.type,
          });
          continue;
        } catch {
          // Ignore - continue to next
          continue;
        }
      }

      // Intentar claim: mover de commands/ a in-flight/
      const dstPath = join(this.paths.inFlightDir(), file);
      try {
        renameSync(srcPath, dstPath);
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === "ENOENT") continue; // Ya fue tomado por otro proceso
        throw err;
      }

      try {
        const content = readFileSync(dstPath, "utf8");
        const envelope = JSON.parse(content) as BridgeCommandEnvelope<T>;

        // Check expiration
        if (envelope.expiresAt && Date.now() > envelope.expiresAt) {
          this.publishResult(envelope, {
            startedAt: Date.now(),
            status: "timeout",
            ok: false,
            error: {
              code: "EXPIRED",
              message: "Command expired before being processed",
              phase: "queue",
            },
          });
          continue;
        }

        // Verify checksum
        if (envelope.checksum) {
          const computed = checksumOf({ type: envelope.type, payload: envelope.payload });
          if (computed !== envelope.checksum) {
            this.publishResult(envelope, {
              startedAt: Date.now(),
              status: "failed",
              ok: false,
              error: {
                code: "CHECKSUM_MISMATCH",
                message: "Payload integrity compromised",
                phase: "queue",
              },
            });
            continue;
          }
        }

        this.eventWriter.append({
          seq: envelope.seq,
          ts: Date.now(),
          type: "command-picked",
          id: envelope.id,
          commandType: envelope.type,
        });

        return envelope;
      } catch (err) {
        this.moveToDeadLetter(dstPath, err);
        continue;
      }
    }

    return null;
  }

  /**
   * Publish result for a command (Fase 8 - Race condition safe)
   * ATOMIC: Writes result file, logs event, cleans in-flight
   * Safe to call multiple times for same command - later writes override
   */
  publishResult<TResult = unknown>(
    cmd: BridgeCommandEnvelope,
    result: {
      startedAt: number;
      status: "completed" | "failed" | "timeout";
      ok: boolean;
      value?: TResult;
      error?: BridgeResultEnvelope["error"];
    },
  ): void {
    const finalResult: BridgeResultEnvelope<TResult> = {
      protocolVersion: 2,
      id: cmd.id,
      seq: cmd.seq,
      completedAt: Date.now(),
      ...result,
    };

    atomicWriteFile(
      this.paths.resultFilePath(cmd.id),
      JSON.stringify(finalResult, null, 2),
    );

    this.eventWriter.append({
      seq: cmd.seq,
      ts: Date.now(),
      type: finalResult.ok ? "command-completed" : "command-failed",
      id: cmd.id,
      status: finalResult.status,
      ok: finalResult.ok,
    });

    const inFlightPath = this.paths.inFlightFilePath(cmd.seq, cmd.type);
    try {
      unlinkSync(inFlightPath);
    } catch {
      // Already removed or never existed
    }
  }

  private moveToDeadLetter(filePath: string, error: unknown): void {
    const deadLetterPath = this.paths.deadLetterFile(
      `${Date.now()}-${basename(filePath)}`
    );
    try {
      ensureDir(this.paths.deadLetterDir());
      renameSync(filePath, deadLetterPath);
      atomicWriteFile(
        `${deadLetterPath}.error.json`,
        JSON.stringify({
          originalFile: basename(filePath),
          error: String(error),
          movedAt: Date.now(),
        }),
      );
    } catch {
      // ignore
    }
  }
}

function checksumOf(input: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")}`;
}
