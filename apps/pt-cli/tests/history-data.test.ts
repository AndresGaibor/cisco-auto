import { describe, expect, it } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { Database } from 'bun:sqlite';

import { initializeSchema } from "@cisco-auto/pt-memory/schema";
import { listFailedHistoryEntriesWithDb, searchHistoryEntriesWithDb } from '../src/commands/history-data.ts';

describe('history data helper', () => {
  it('busca y filtra entradas desde audit_log', () => {
    const dbPath = join(tmpdir(), `cisco-auto-history-data-${Date.now()}.sqlite`);
    const db = new Database(dbPath);
    initializeSchema(db);

    db.query(`INSERT INTO audit_log (timestamp, session_id, device_id, command, status, output, error, duration_ms, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      '2026-01-01T00:00:00.000Z', 'sess-1', 'R1', 'show version', 'success', 'version ok', null, 5, 'tx-1'
    );
    db.query(`INSERT INTO audit_log (timestamp, session_id, device_id, command, status, output, error, duration_ms, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      '2026-01-01T00:00:01.000Z', 'sess-2', 'R2', 'show ip int brief', 'failed', 'boom', 'boom', 7, 'tx-2'
    );

    db.close();

    const matches = searchHistoryEntriesWithDb('ip int', 'R2', 20, dbPath);
    expect(matches).toHaveLength(1);
    const match = matches[0];
    expect(match).toBeDefined();
    expect(match!.command).toBe('show ip int brief');

    const failed = listFailedHistoryEntriesWithDb('R2', 20, dbPath);
    expect(failed).toHaveLength(1);
    const failedRow = failed[0];
    expect(failedRow).toBeDefined();
    expect(failedRow!.status).toBe('failed');

    rmSync(dbPath, { force: true });
  });
});
