import type { Transaction, TransactionLogEntry } from "./transaction.js";

export interface AuditLogEntry {
  timestamp: string;
  sessionId: string;
  deviceId?: string;
  command: string;
  status: "success" | "failed" | "rolled_back";
  output?: string;
  error?: string;
  durationMs?: number;
  transactionId?: string;
}

export class AuditLogger {
  private _entries: AuditLogEntry[] = [];

  log(entry: AuditLogEntry): void {
    this._entries.push({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    });
  }

  logTransaction(tx: Transaction, sessionId: string, transactionId?: string): void {
    const log = tx.getLog();
    for (const entry of log) {
      const cmd = tx.commands[entry.index];
      this._entries.push({
        timestamp: new Date().toISOString(),
        sessionId,
        deviceId: cmd?.deviceId,
        command: entry.command,
        status: entry.status === "pending" ? "failed" : entry.status,
        output: entry.output,
        error: entry.error,
        durationMs: entry.durationMs,
        transactionId,
      });
    }
  }

  getSessionLogs(sessionId: string): ReadonlyArray<AuditLogEntry> {
    return this._entries.filter((e) => e.sessionId === sessionId);
  }

  getDeviceLogs(deviceId: string): ReadonlyArray<AuditLogEntry> {
    return this._entries.filter((e) => e.deviceId === deviceId);
  }

  getFailedLogs(): ReadonlyArray<AuditLogEntry> {
    return this._entries.filter((e) => e.status === "failed");
  }

  export(format: "jsonl"): string {
    return this._entries.map((e) => JSON.stringify(e)).join("\n");
  }

  get entries(): ReadonlyArray<AuditLogEntry> {
    return [...this._entries];
  }

  get count(): number {
    return this._entries.length;
  }
}
