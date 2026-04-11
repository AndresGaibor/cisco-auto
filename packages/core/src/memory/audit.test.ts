import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initializeSchema } from './schema.ts';
import { AuditMemory } from './audit.ts';

describe('AuditMemory', () => {
  it('persiste y consulta entradas por sesión', () => {
    const db = new Database(':memory:');
    initializeSchema(db);
    const audit = new AuditMemory(db);

    audit.log({
      timestamp: '2026-01-01T00:00:00.000Z',
      sessionId: 'sess-1',
      deviceId: 'R1',
      command: 'show version',
      status: 'success',
      durationMs: 12,
      transactionId: 'tx-1',
    });

    const logs = audit.getSessionLogs('sess-1');
    expect(logs).toHaveLength(1);
    expect(logs[0].command).toBe('show version');
    expect(logs[0].transaction_id).toBe('tx-1');

    db.close();
  });

  it('filtra errores y transacciones', () => {
    const db = new Database(':memory:');
    initializeSchema(db);
    const audit = new AuditMemory(db);

    audit.logMany([
      {
        timestamp: '2026-01-01T00:00:00.000Z',
        sessionId: 'sess-1',
        command: 'cmd-1',
        status: 'success',
      },
      {
        timestamp: '2026-01-01T00:00:01.000Z',
        sessionId: 'sess-1',
        command: 'cmd-2',
        status: 'failed',
        error: 'boom',
        transactionId: 'tx-2',
      },
    ]);

    expect(audit.getFailedLogs()).toHaveLength(1);
    expect(audit.getTransactionLogs('tx-2')).toHaveLength(1);

    db.close();
  });
});
