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

export interface ClaimResult {
  ok: boolean;
  path: string | null;
  reason?: string;
  errorCode?: string;
}

export interface BridgeResultMeta {
  attempt: number;
  queuedAt: number;
  claimedAt: number;
  completedAtMs: number;
  queueLatencyMs: number;
  execLatencyMs: number;
  claimedFile?: string;
}

export interface BridgeResultEnvelopeWithMeta<T = unknown> extends BridgeResultEnvelope<T> {
  meta: BridgeResultMeta;
}

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

      const envelope = this.claimAndReadEnvelope<T>(file, sourcePath, parsed, cmdId);
      if (envelope) return envelope;
    }

    return null;
  }

  private claimAndReadEnvelope<T>(
    filename: string,
    sourcePath: string,
    parsed: { seq: number; type: string },
    cmdId: string,
  ): BridgeCommandEnvelope<T> | null {
    const claimResult = this.claimCommandFile(filename);
    if (!claimResult.ok || !claimResult.path) return null;

    this.eventWriter.append({
      seq: this.seq.next(),
      ts: Date.now(),
      type: "command-claimed",
      id: cmdId,
      commandType: parsed.type,
    });

    try {
      const content = readFileSync(claimResult.path, "utf8");
      const envelope = JSON.parse(content) as BridgeCommandEnvelope<T>;

      if (this.isCommandExpired(envelope)) {
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
        return null;
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
          return null;
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
      this.moveToDeadLetter(claimResult.path, err);
      return null;
    }
  }

  private isCommandExpired(envelope: BridgeCommandEnvelope<unknown>): boolean {
    return envelope.expiresAt !== undefined && Date.now() > envelope.expiresAt;
  }

  private claimCommandFile(filename: string): ClaimResult {
    const srcPath = join(this.paths.commandsDir(), filename);
    const dstPath = join(this.paths.inFlightDir(), filename);

    try {
      ensureDir(this.paths.inFlightDir());
      renameSync(srcPath, dstPath);
      return { ok: true, path: dstPath };
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        return { ok: false, path: null, reason: "file-not-found-or-already-claimed", errorCode: error.code };
      }

      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "command-claim-error",
        note: `${filename}: ${String(err)}`,
      });

      return { ok: false, path: null, reason: "rename-failed", errorCode: error.code };
    }
  }

  publishResult<TResult = unknown>(
    cmd: BridgeCommandEnvelope,
    result: {
      startedAt: number;
      status: "completed" | "failed" | "timeout";
      ok: boolean;
      value?: TResult;
      error?: BridgeResultEnvelope["error"];
      attempt?: number;
      queuedAt?: number;
      claimedAt?: number;
      completedAtMs?: number;
      queueLatencyMs?: number;
      execLatencyMs?: number;
      claimedFile?: string;
    },
  ): void {
    const completedAtMs = Date.now();
    const finalResult: BridgeResultEnvelopeWithMeta<TResult> = {
      protocolVersion: 2,
      id: cmd.id,
      seq: cmd.seq,
      completedAt: completedAtMs,
      meta: {
        attempt: result.attempt ?? cmd.attempt ?? 1,
        queuedAt: result.queuedAt ?? cmd.createdAt,
        claimedAt: result.claimedAt ?? completedAtMs,
        completedAtMs,
        queueLatencyMs: result.queueLatencyMs ?? (result.claimedAt ?? completedAtMs) - (result.queuedAt ?? cmd.createdAt),
        execLatencyMs: result.execLatencyMs ?? completedAtMs - (result.claimedAt ?? completedAtMs),
        claimedFile: result.claimedFile,
      },
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
          originalPath: filePath,
          deadLetterPath,
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
