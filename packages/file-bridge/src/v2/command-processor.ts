/**
 * Command Processor - Processes commands from PT
 * Handles command dequeuing, expiration checks, and result publishing
 */

import { join, basename } from "node:path";
import { readdirSync, readFileSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import type { BridgeCommandEnvelope, BridgeResultEnvelope } from "../shared/protocol.js";
import { BridgePathLayout } from "../shared/path-layout.js";
import { EventLogWriter } from "../event-log-writer.js";
import { atomicWriteFile, ensureDir } from "../shared/fs-atomic.js";

export class CommandProcessor {
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly eventWriter: EventLogWriter,
  ) {}

  pickNextCommand<T = unknown>(): BridgeCommandEnvelope<T> | null {
    const files = readdirSync(this.paths.commandsDir())
      .filter((f) => f.endsWith(".json"))
      .sort();

    for (const file of files) {
      const srcPath = join(this.paths.commandsDir(), file);
      const dstPath = join(this.paths.inFlightDir(), file);

      try {
        renameSync(srcPath, dstPath);
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === "ENOENT") continue;
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
