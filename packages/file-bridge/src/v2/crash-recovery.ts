/**
 * Recovery de estado inconsistente por crashes.
 *
 * Re-queúa, deduplica, y maneja dead letters cuando el bridge
 * se reinicia tras un crash.
 *
 * CRITICAL: No debe ejecutarse sin lease válido.
 *
 * Flujo de recovery:
 * 1. Commands queued: verifica que no existan resultados (dedup)
 * 2. Commands in-flight: si hay resultado, limpia; si no, re-queue o falla
 * 3. Archivos con formato inválido van a dead-letter
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

/**
 * Recupera estado inconsistente tras un crash del bridge.
 */
export class CrashRecovery {
  private readonly maxAttempts: number;

  /**
   * @param paths - Gestor de paths
   * @param seq - Store de secuencias
   * @param eventWriter - Escritor de eventos
   * @param leaseManager - Gestor de lease (opcional)
   * @param maxAttempts - Máximo de reintentos para comandos in-flight (default: 3)
   */
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly seq: SequenceStore,
    private readonly eventWriter: EventLogWriter,
    private readonly leaseManager?: LeaseManager,
    maxAttempts: number = 3,
  ) {
    this.maxAttempts = maxAttempts;
  }

  /**
   * Ejecuta el recovery. Solo corre si hay lease válido.
   * Procesa commands/ y in-flight/ para dejar el estado consistente.
   */
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
        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "command-corrupted",
          id: undefined,
          note: "invalid filename format",
        });
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
          note: "result already existed for queued command",
        });
        continue;
      }

      const cmd = readJsonFile<{ attempt?: number; seq?: number; type?: string; id?: string }>(filePath);
      if (!cmd) {
        this.moveToDeadLetter(filePath, new Error("Corrupted command JSON"));
        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "command-corrupted",
          id: cmdId,
          note: "could not parse JSON",
        });
        continue;
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
        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "command-corrupted",
          id: undefined,
          note: "invalid in-flight filename",
        });
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
          note: "result existed, in-flight cleaned",
        });
        continue;
      }

      const cmd = readJsonFile<{ attempt?: number; seq?: number; type?: string; id?: string }>(filePath);
      if (!cmd) {
        this.moveToDeadLetter(filePath, new Error("Corrupted in-flight JSON"));
        this.eventWriter.append({
          seq: this.seq.next(),
          ts: Date.now(),
          type: "command-corrupted",
          id: cmdId,
          note: "could not parse in-flight JSON",
        });
        continue;
      }

      const currentAttempt = cmd.attempt ?? 1;
      const existingCommandPath = this.paths.commandFilePath(cmd.seq!, cmd.type!);

      if (existsSync(existingCommandPath)) {
        const existingCmd = readJsonFile<{ id?: string }>(existingCommandPath);
        if (existingCmd && existingCmd.id === cmd.id) {
          safeUnlink(filePath);
          this.eventWriter.append({
            seq: this.seq.next(),
            ts: Date.now(),
            type: "command-purged-duplicate",
            id: cmdId,
            note: "duplicate in-flight vs commands/",
          });
          continue;
        } else {
          this.moveToDeadLetter(filePath, new Error("ID conflict between in-flight and commands/"));
          this.eventWriter.append({
            seq: this.seq.next(),
            ts: Date.now(),
            type: "command-recovery-conflict",
            id: cmdId,
            note: "ID mismatch - possible conflict",
          });
          continue;
        }
      }

      if (currentAttempt < this.maxAttempts) {
        cmd.attempt = currentAttempt + 1;
        atomicWriteFile(existingCommandPath, JSON.stringify(cmd, null, 2));
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
