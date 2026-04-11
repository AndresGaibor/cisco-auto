import { describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { Database } from 'bun:sqlite';

import { initializeSchema } from '../../../packages/core/src/memory/schema.ts';
import { listAuditEntries } from '../src/commands/audit-data.ts';

describe('audit data helper', () => {
  it('filtra audit_log por dispositivo y estado', () => {
    const dbPath = join(tmpdir(), `cisco-auto-audit-data-${Date.now()}.sqlite`);
    const db = new Database(dbPath);
    initializeSchema(db);

    db.query(`INSERT INTO audit_log (timestamp, session_id, device_id, command, status, output, error, duration_ms, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      '2026-01-01T00:00:00.000Z', 'sess-1', 'R1', 'show version', 'success', 'ok', null, 5, 'tx-1'
    );
    db.query(`INSERT INTO audit_log (timestamp, session_id, device_id, command, status, output, error, duration_ms, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      '2026-01-01T00:00:01.000Z', 'sess-2', 'R2', 'show ip int brief', 'failed', 'boom', 'boom', 7, 'tx-2'
    );

    db.close();

    const rows = listAuditEntries({ device: 'R2', failedOnly: true }, dbPath);
    expect(rows).toHaveLength(1);
    expect(rows[0].command).toBe('show ip int brief');
    expect(rows[0].status).toBe('failed');

    rmSync(dbPath, { force: true });
  });
});
