import { getMemory } from '@cisco-auto/core/memory';
import { Transaction, type TransactionResult } from './transaction';
import type { CommandHandler } from './command-handler.js';

export interface TransactionMemoryResult {
  transactionResult: TransactionResult;
  transactionId: string;
}

/**
 * Ejecuta una transacción y persiste su log en la memoria compartida
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
      status: entry.status === 'pending' ? 'failed' : entry.status,
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
