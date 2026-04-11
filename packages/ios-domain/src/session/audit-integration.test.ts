import { describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { AuditLogger } from './audit-log.ts';
import { Transaction } from './transaction.ts';
import { logTransactionWithMemory, persistAuditLogger } from './audit-integration.ts';
import { getMemory } from '@cisco-auto/core/memory';
import type { CommandHandler } from './command-handler.js';

describe('audit integration', () => {
  it('sincroniza el audit logger con SQLite', async () => {
    const dbPath = join(tmpdir(), `cisco-auto-audit-${Date.now()}.sqlite`);
    const memory = getMemory(dbPath);

    const logger = new AuditLogger();
    const tx = new Transaction();
    tx.add('cmd-1', 'rb-1', { deviceId: 'R1' });

    const handler: CommandHandler = {
      enterCommand: () => [0, 'OK'],
    };

    await tx.execute(handler);
    logTransactionWithMemory(logger, tx, 'sess-1', 'tx-1');

    const inserted = persistAuditLogger(logger);
    expect(inserted.length).toBeGreaterThan(0);
    expect(memory.audit.getSessionLogs('sess-1').length).toBeGreaterThan(0);

    memory.close();
    rmSync(dbPath, { force: true });
  });
});
