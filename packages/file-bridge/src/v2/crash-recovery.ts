/**
 * Crash Recovery - Recovers inconsistent state from crashes
 * Handles re-queuing and dead-letter management
 */

import { join } from "node:path";
import { readdirSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import type { BridgeResultEnvelope } from "../shared/protocol.js";
import { BridgePathLayout } from "../shared/path-layout.js";
import { SequenceStore } from "../shared/sequence-store.js";
import { EventLogWriter } from "../event-log-writer.js";
import { atomicWriteFile } from "../shared/fs-atomic.js";

export class CrashRecovery {
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly seq: SequenceStore,
    private readonly eventWriter: EventLogWriter,
  ) {}

  recover(): void {
    try {
      const inFlightFiles = readdirSync(this.paths.inFlightDir())
        .filter((f) => f.endsWith(".json"));

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
          } catch {
            // corrupted file — move to dead-letter
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
}
