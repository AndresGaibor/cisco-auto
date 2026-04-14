import { getMemory } from '@cisco-auto/core/memory';
import { AuditLogger, type AuditLogEntry } from './audit-log';
import { Transaction } from './transaction';

/**
 * Sincroniza un audit logger en memoria local con SQLite
 */
export function persistAuditLogger(logger: AuditLogger): number[] {
  const memory = getMemory();
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
 * Registra una transacción en el audit logger y la persiste en SQLite
 */
export function logTransactionWithMemory(
  logger: AuditLogger,
  tx: Transaction,
  sessionId: string,
  transactionId?: string,
): AuditLogEntry[] {
  logger.logTransaction(tx, sessionId, transactionId);
  persistAuditLogger(logger);
  return logger.entries.filter((entry) => entry.sessionId === sessionId);
}
