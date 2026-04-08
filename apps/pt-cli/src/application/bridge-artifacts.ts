#!/usr/bin/env bun
/**
 * Helper abstractions for reading artifacts (results/logs) from pt-dev.
 * Phase 5: provide a small facade so CLI commands don't scatter path logic.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getResultsDir } from '../system/paths.js';

export function listResultArtifacts(): string[] {
  try {
    const dir = getResultsDir();
    return readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch (e) {
    return [];
  }
}

export function readResultArtifact(fileName: string): any | null {
  try {
    const dir = getResultsDir();
    const content = readFileSync(join(dir, fileName), 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

export function readRecentResultArtifacts(limit = 10): Array<{ file: string; mtime: number; content: any | null }> {
  try {
    const dir = getResultsDir();
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    const filesWithMtime = files.map((f) => {
      try {
        const s = statSync(join(dir, f));
        return { file: f, mtime: s.mtime.getTime() };
      } catch (e) {
        return { file: f, mtime: 0 };
      }
    });
    filesWithMtime.sort((a, b) => b.mtime - a.mtime);
    return filesWithMtime.slice(0, limit).map((f) => ({ file: f.file, mtime: f.mtime, content: readResultArtifact(f.file) }));
  } catch (e) {
    return [];
  }
}
