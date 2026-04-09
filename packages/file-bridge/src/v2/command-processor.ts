/**
 * Command Processor - Processes commands from PT (Fase 8)
 * Handles command dequeuing, expiration checks, deduplication, and result publishing
 * CRITICAL: Race condition safe - claim-by-rename atomically prevents double-processing
 */

import { join, basename } from "node:path";
import { readFileSync, existsSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
import type { BridgeCommandEnvelope, BridgeResultEnvelope } from "../shared/protocol.js";
import { BridgePathLayout, parseCommandFileName } from "../shared/path-layout.js";
import { EventLogWriter } from "../event-log-writer.js";
import {
  atomicWriteFile,
  ensureDir,
  listJsonFiles,
  safeUnlink,
} from "../shared/fs-atomic.js";

export class CommandProcessor {
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly eventWriter: EventLogWriter,
    private readonly seq: { next: () => number },
  ) {}

  pickNextCommand<T = unknown>(): BridgeCommandEnvelope<T> | null {
    const files = listJsonFiles(this.paths.commandsDir());

    for (const file of files) {
      const parsed = parseCommandFileName(file);
      const sourcePath = join(this.paths.commandsDir(), file);

      if (!parsed) {
        this.moveToDeadLetter(sourcePath, new Error("Invalid command filename format"));
        continue;
      }

      const cmdId = this.paths.commandIdFromSeq(parsed.seq);
      const resultPath = this.paths.resultFilePath(cmdId);

      if (existsSync(resultPath)) {
        safeUnlink(sourcePath);
        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "command-purged-duplicate",
          id: cmdId,
          commandType: parsed.type,
        });
        continue;
      }

      const claimedPath = this.claimCommandFile(file);
      if (!claimedPath) continue;

      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "command-claimed",
        id: cmdId,
        commandType: parsed.type,
      });

      try {
        const content = readFileSync(claimedPath, "utf8");
        const envelope = JSON.parse(content) as BridgeCommandEnvelope<T>;

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
        this.moveToDeadLetter(claimedPath, err);
      }
    }

    return null;
  }

  private claimCommandFile(filename: string): string | null {
    const srcPath = join(this.paths.commandsDir(), filename);
    const dstPath = join(this.paths.inFlightDir(), filename);

    try {
      ensureDir(this.paths.inFlightDir());
      renameSync(srcPath, dstPath);
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT") return null;
      return null;
    }

    return dstPath;
  }

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
    safeUnlink(inFlightPath);
  }

  private moveToDeadLetter(filePath: string, error: unknown): void {
    const deadLetterBase = `${Date.now()}-${basename(filePath)}`;
    const deadLetterPath = this.paths.deadLetterFile(deadLetterBase);

    try {
      ensureDir(this.paths.deadLetterDir());
      renameSync(filePath, deadLetterPath);
      atomicWriteFile(
        this.paths.deadLetterErrorFile(deadLetterBase),
        JSON.stringify({
          originalFile: basename(filePath),
          error: String(error),
          movedAt: Date.now(),
        }, null, 2),
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
