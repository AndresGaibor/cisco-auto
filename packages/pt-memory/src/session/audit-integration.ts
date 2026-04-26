import { getMemory } from "../memory/index.js";
import {
  AuditLogger,
  Transaction,
  type AuditLogEntry,
} from "@cisco-auto/ios-domain/session";

/**
 * Sincroniza un AuditLogger de dominio con SQLite.
 *
 * Esta función vive en pt-memory porque cruza dominio IOS + persistencia.
 */
export function persistAuditLogger(logger: AuditLogger, dbPath?: string): number[] {
  const memory = getMemory(dbPath);

  return memory.audit.logMany(
    logger.entries.map((entry) => ({
      timestamp: entry.timestamp,
      sessionId: entry.sessionId,
      deviceId: entry.deviceId,
      command: entry.command,
      status: entry.status,
      output: entry.output,
      error: entry.error,
      durationMs: entry.durationMs,
      transactionId: entry.transactionId,
    })),
  );
}

/**
 * Registra una transacción en el AuditLogger y la persiste en SQLite.
 */
export function logTransactionWithMemory(
  logger: AuditLogger,
  tx: Transaction,
  sessionId: string,
  transactionId?: string,
  dbPath?: string,
): AuditLogEntry[] {
  logger.logTransaction(tx, sessionId, transactionId);
  persistAuditLogger(logger, dbPath);
  return logger.entries.filter((entry) => entry.sessionId === sessionId);
}
