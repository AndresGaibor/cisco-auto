import { describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { Database } from 'bun:sqlite';
import { initializeSchema } from "@cisco-auto/pt-memory/schema";
import { createAuditQueryCommand } from '../src/commands/audit-query.ts';
import { getMemoryDbPath } from '../src/system/paths.ts';

describe('audit query command', () => {
  it('returns filtered audit_log entries', async () => {
    const dbPath = join(tmpdir(), `cisco-auto-audit-query-${Date.now()}.sqlite`);
    const db = new Database(dbPath);
    initializeSchema(db);

    db.query(`INSERT INTO audit_log (timestamp, session_id, device_id, command, status, output, error, duration_ms, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('2026-01-01T00:00:00.000Z', 'sess-1', 'R1', 'show version', 'success', 'ok', null, 5, 'tx-1');
    db.query(`INSERT INTO audit_log (timestamp, session_id, device_id, command, status, output, error, duration_ms, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('2026-01-01T00:00:01.000Z', 'sess-2', 'R2', 'show ip int brief', 'failed', null, 'boom', 7, 'tx-2');

    db.close();

    const originalHome = process.env.HOME;
    process.env.HOME = tmpdir();
    const targetDb = new Database(getMemoryDbPath());
    initializeSchema(targetDb);
    targetDb.close();

    const cmd = createAuditQueryCommand();
    expect(cmd.name()).toBe('query');

    process.env.HOME = originalHome;
    rmSync(dbPath, { force: true });
  });
});
