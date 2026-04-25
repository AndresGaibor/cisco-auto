import { getMemory } from "../memory/index.js";
import {
  Transaction,
  type TransactionResult,
  type CommandHandler,
} from "@cisco-auto/ios-domain/session";

export interface TransactionMemoryResult {
  transactionResult: TransactionResult;
  transactionId: string;
}

/**
 * Ejecuta una transacción IOS y persiste su log en SQLite.
 *
 * Nota arquitectónica:
 * - Transaction y CommandHandler pertenecen a ios-domain.
 * - SQLite/getMemory pertenece a pt-memory.
 * - Por eso esta integración vive aquí, no en ios-domain.
 */
export async function executeTransactionWithMemory(
  tx: Transaction,
  session: CommandHandler,
  sessionId: string,
  transactionId: string,
  dbPath?: string,
): Promise<TransactionMemoryResult> {
  const memory = getMemory(dbPath);
  const result = await tx.execute(session);

  for (const entry of result.log) {
    const command = tx.commands[entry.index];
    if (!command) {
      continue;
    }

    memory.history.logCommand(
      command.deviceId ?? sessionId,
      entry.command,
      entry.output ?? "",
      entry.status,
      sessionId,
    );

    memory.audit.log({
      timestamp: new Date().toISOString(),
      sessionId,
      deviceId: command.deviceId,
      command: entry.command,
      status: entry.status === "pending" ? "failed" : entry.status,
      output: entry.output,
      error: entry.error,
      durationMs: entry.durationMs,
      transactionId,
    });
  }

  return {
    transactionResult: result,
    transactionId,
  };
}
