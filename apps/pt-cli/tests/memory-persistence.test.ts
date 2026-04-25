import { describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { Database } from 'bun:sqlite';
import { initializeSchema, AuditMemory } from "@cisco-auto/pt-memory";
import { mapHistoryEntryToAuditRecord } from '../src/application/memory-persistence.ts';

describe('memory persistence', () => {
  it('mapea una entrada de historial a auditoría', () => {
    const record = mapHistoryEntryToAuditRecord({
      schemaVersion: '1.0',
      sessionId: 'sess-1',
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:00:01.000Z',
      action: 'pt.show.vlan',
      ok: true,
      durationMs: 1000,
      targetDevice: 'R1',
      correlationId: 'corr-1',
    });

    expect(record.sessionId).toBe('sess-1');
    expect(record.command).toBe('pt.show.vlan');
    expect(record.status).toBe('success');
    expect(record.transactionId).toBe('corr-1');
  });

  it('persiste auditoría en SQLite', () => {
    const dbPath = join(tmpdir(), `cisco-auto-pt-cli-${Date.now()}.sqlite`);
    const db = new Database(dbPath);
    initializeSchema(db);
    const audit = new AuditMemory(db);

    audit.log({
      timestamp: '2026-01-01T00:00:00.000Z',
      sessionId: 'sess-1',
      command: 'pt.show.vlan',
      status: 'success',
      transactionId: 'corr-1',
    });

    const rows = audit.getSessionLogs('sess-1');
    expect(rows).toHaveLength(1);
    expect(rows[0].command).toBe('pt.show.vlan');

    db.close();
    rmSync(dbPath, { force: true });
  });
});
