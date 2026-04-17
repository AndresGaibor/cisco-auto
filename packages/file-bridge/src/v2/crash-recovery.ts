/**
 * Crash Recovery - Recovers inconsistent state from crashes (Fase 8)
 * Handles re-queuing, deduplication, and dead-letter management
 * CRITICAL: Must not execute recovery without valid lease
 */

import { join, basename } from "node:path";
import { existsSync, renameSync } from "node:fs";
import type { BridgeResultEnvelope } from "../shared/protocol.js";
import { BridgePathLayout, parseCommandFileName } from "../shared/path-layout.js";
import { SequenceStore } from "../shared/sequence-store.js";
import { EventLogWriter } from "../event-log-writer.js";
import {
  atomicWriteFile,
  ensureDir,
  listJsonFiles,
  readJsonFile,
  safeUnlink,
} from "../shared/fs-atomic.js";
import { LeaseManager } from "./lease-manager.js";

export class CrashRecovery {
  private readonly maxAttempts: number;

  constructor(
    private readonly paths: BridgePathLayout,
    private readonly seq: SequenceStore,
    private readonly eventWriter: EventLogWriter,
    private readonly leaseManager?: LeaseManager,
    maxAttempts: number = 3,
  ) {
    this.maxAttempts = maxAttempts;
  }

  recover(): void {
    if (this.leaseManager && !this.leaseManager.hasValidLease()) {
      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "recovery-skipped-no-lease",
        note: "No valid lease - recovery blocked",
      });
      return;
    }

    try {
      this.recoverQueuedCommands();
      this.recoverInFlightCommands();
    } catch (err) {
      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "recovery-error",
        error: String(err),
      });
    }
  }

  private recoverQueuedCommands(): void {
    const commandFiles = listJsonFiles(this.paths.commandsDir());

    for (const file of commandFiles) {
      if (file === "_queue.json") {
        continue;
      }

      const filePath = join(this.paths.commandsDir(), file);
      const parsed = parseCommandFileName(file);

      if (!parsed) {
        this.moveToDeadLetter(filePath, new Error("Invalid command filename"));
        continue;
      }

      const cmd = readJsonFile<{ attempt?: number; seq?: number; type?: string }>(filePath);
      if (!cmd) {
        this.moveToDeadLetter(filePath, new Error("Corrupted command JSON"));
        continue;
      }

      const cmdId = this.paths.commandIdFromSeq(parsed.seq);
      const resultPath = this.paths.resultFilePath(cmdId);

      if (existsSync(resultPath)) {
        safeUnlink(filePath);
        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "command-purged-duplicate",
          id: cmdId,
          note: "duplicate in commands/ queue",
        });
      }
    }
  }

  private recoverInFlightCommands(): void {
    const inFlightFiles = listJsonFiles(this.paths.inFlightDir());

    for (const file of inFlightFiles) {
      const filePath = join(this.paths.inFlightDir(), file);
      const parsed = parseCommandFileName(file);

      if (!parsed) {
        this.moveToDeadLetter(filePath, new Error("Invalid in-flight filename"));
        continue;
      }

      const cmdId = this.paths.commandIdFromSeq(parsed.seq);
      const resultPath = this.paths.resultFilePath(cmdId);

      if (existsSync(resultPath)) {
        safeUnlink(filePath);
        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "command-recovered",
          id: cmdId,
          note: "result existed but in-flight was not cleaned",
        });
        continue;
      }

      const cmd = readJsonFile<{ attempt?: number; seq?: number; type?: string }>(filePath);
      if (!cmd) {
        this.moveToDeadLetter(filePath, new Error("Corrupted in-flight JSON"));
        continue;
      }

      const currentAttempt = cmd.attempt ?? 1;

      if (currentAttempt < this.maxAttempts) {
        cmd.attempt = currentAttempt + 1;
        const requeuePath = this.paths.commandFilePath(cmd.seq!, cmd.type!);
        atomicWriteFile(requeuePath, JSON.stringify(cmd, null, 2));
        safeUnlink(filePath);

        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "command-requeued",
          id: cmdId,
          attempt: cmd.attempt,
        });
        continue;
      }

      const failResult: BridgeResultEnvelope = {
        protocolVersion: 2,
        id: cmdId,
        seq: cmd.seq!,
        completedAt: Date.now(),
        status: "failed",
        ok: false,
        error: {
          code: "MAX_RETRIES",
          message: `Command failed after ${currentAttempt} attempts`,
          phase: "execute",
        },
      };

      atomicWriteFile(resultPath, JSON.stringify(failResult, null, 2));
      safeUnlink(filePath);

      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "command-failed",
        id: cmdId,
        note: "max retries exceeded",
      });
    }
  }

  private moveToDeadLetter(filePath: string, error: unknown): void {
    const deadLetterBase = `${Date.now()}-${basename(filePath)}`;
    const deadLetterPath = this.paths.deadLetterFile(deadLetterBase);

    try {
      ensureDir(this.paths.deadLetterDir());
      renameSync(filePath, deadLetterPath);
      atomicWriteFile(
        this.paths.deadLetterErrorFile(deadLetterBase),
        JSON.stringify(
          {
            originalFile: basename(filePath),
            error: String(error),
            movedAt: Date.now(),
          },
          null,
          2,
        ),
      );
    } catch {
      // ignore
    }
  }
}
