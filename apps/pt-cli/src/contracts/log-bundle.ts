#!/usr/bin/env bun
/**
 * Estructura del bundle de depuración.
 * Recopila toda la información de una sesión para debugging.
 */

/**
 * Bundle de logs para debugging de una sesión.
 */
export interface LogBundle {
  schemaVersion: '1.0';
  session: {
    id: string;
    argv: string[];
    cwd: string;
    startedAt: string;
    endedAt?: string;
    flags?: Record<string, unknown>;
  };
  cli: {
    action: string;
    timeline: unknown[];
    payloadPreview?: unknown;
    resultPreview?: unknown;
    error?: unknown;
  };
  bridge: {
    events: unknown[];
  };
  ptRuntime: {
    commands: unknown[];
  };
  results: unknown[];
  summary: {
    ok: boolean;
    durationMs?: number;
    commandIds: string[];
  };
}
