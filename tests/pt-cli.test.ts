import { describe, it, expect } from 'bun:test';
import { runPtCommand } from '../scripts/pt-cli.ts';

// Basic smoke test: runPtCommand should return an object with success boolean

describe('pt-cli helper', () => {
  it('returns object with success boolean', async () => {
    const res = await runPtCommand(['--version'] as string[]);
    expect(typeof res.success).toBe('boolean');
  });
});
