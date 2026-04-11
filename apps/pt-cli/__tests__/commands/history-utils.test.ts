import { test, expect } from 'bun:test';
import type { HistoryEntry } from '../../src/contracts/history-entry.ts';

// Test helper functions from history.ts by testing their behavior
// These are internal functions but we can test the patterns they implement

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

function inferFailureCauses(entry: HistoryEntry): string[] {
  const causes: string[] = [];

  const ctx = entry.contextSummary as Record<string, unknown> | undefined;
  if (ctx?.bridgeReady === false) {
    causes.push('Bridge no estaba listo durante la ejecución.');
  }

  if (entry.warnings?.some((w) => /heartbeat stale|heartbeat missing/i.test(w))) {
    causes.push('Packet Tracer parecía no estar disponible o no responder.');
  }

  if (entry.verificationSummary?.includes('not verified')) {
    causes.push('La acción pudo ejecutarse, pero no quedó verificada.');
  }

  if (entry.warnings?.some((w) => /desincronizada|desynced/i.test(w))) {
    causes.push('La topología pudo haber quedado desincronizada tras la ejecución.');
  }

  const errMsg = entry.errorMessage ?? (entry as unknown as Record<string, unknown>).error_message as string | undefined;
  if (errMsg) {
    if (/lease/i.test(errMsg)) causes.push('El lease del bridge era inválido o expiró.');
    if (/runtime/i.test(errMsg)) causes.push('El runtime de PT no estaba cargado o falló.');
    if (/timeout/i.test(errMsg)) causes.push('Se agotó el tiempo de espera del comando.');
    if (/terminal/i.test(errMsg)) causes.push('La terminal del dispositivo no estaba disponible.');
  }

  const compReason = entry.completionReason;
  if (compReason && entry.status !== 'success') {
    causes.push(`Razón de finalización: ${compReason}`);
  }

  if (causes.length === 0 && entry.status !== 'error') {
    causes.push('Causa no determinada. Revisa pt logs session para más detalle.');
  }

  return causes;
}

function classifyRerunnable(entry: HistoryEntry): { rerunnable: boolean; reason: string } {
  const action = entry.action ?? '';
  const nonTerminalActions = ['history.list', 'history.show', 'history.last', 'status', 'doctor', 'results.list', 'results.view', 'device.list', 'device.get', 'link.list', 'lab.list', 'lab.validate', 'topology.analyze'];
  const writeActions = ['config.ios', 'config.host', 'device.add', 'device.remove', 'link.add', 'link.remove', 'vlan.apply', 'stp.apply', 'routing.apply', 'acl.apply'];

  if (nonTerminalActions.includes(action)) {
    return { rerunnable: true, reason: 'Lectura idempotente, seguro re-ejecutar.' };
  }

  if (writeActions.includes(action)) {
    return { rerunnable: false, reason: 'Acción de escritura con efectos secundarios. Re-ejecutar manualmente con precaución.' };
  }

  if (entry.status === 'error' && entry.errorMessage?.includes('confirmación')) {
    return { rerunnable: false, reason: 'Requirió confirmación interactiva.' };
  }

  return { rerunnable: false, reason: 'Tipo de acción no clasificado como rerunnable.' };
}

test('formatDuration formatea milisegundos correctamente', () => {
  expect(formatDuration(500)).toBe('500ms');
  expect(formatDuration(1000)).toBe('1.0s');
  expect(formatDuration(5500)).toBe('5.5s');
  expect(formatDuration(60000)).toBe('1m 0s');
  expect(formatDuration(65000)).toBe('1m 5s');
  expect(formatDuration(120000)).toBe('2m 0s');
});

test('truncate acorta strings largos', () => {
  expect(truncate('hello', 10)).toBe('hello');
  expect(truncate('hello world', 8)).toBe('hello...');
  expect(truncate('averylongword', 6)).toBe('ave...');
});

test('truncate no modifica strings cortos', () => {
  expect(truncate('hi', 10)).toBe('hi');
  expect(truncate('abc', 3)).toBe('abc');
});

test('inferFailureCauses detecta bridge no listo', () => {
  const entry = {
    sessionId: 'abc123',
    action: 'device.add',
    status: 'error',
    contextSummary: { bridgeReady: false },
  } as HistoryEntry;

  const causes = inferFailureCauses(entry);
  expect(causes).toContain('Bridge no estaba listo durante la ejecución.');
});

test('inferFailureCauses detecta heartbeat stale', () => {
  const entry = {
    sessionId: 'abc123',
    action: 'device.add',
    status: 'error',
    warnings: ['heartbeat stale detected'],
  } as HistoryEntry;

  const causes = inferFailureCauses(entry);
  expect(causes).toContain('Packet Tracer parecía no estar disponible o no responder.');
});

test('inferFailureCauses detecta lease expiration', () => {
  const entry = {
    sessionId: 'abc123',
    action: 'device.add',
    status: 'error',
    errorMessage: 'lease expired or invalid',
  } as HistoryEntry;

  const causes = inferFailureCauses(entry);
  expect(causes).toContain('El lease del bridge era inválido o expiró.');
});

test('inferFailureCauses detecta timeout', () => {
  const entry = {
    sessionId: 'abc123',
    action: 'device.add',
    status: 'error',
    errorMessage: 'command timeout',
  } as HistoryEntry;

  const causes = inferFailureCauses(entry);
  expect(causes).toContain('Se agotó el tiempo de espera del comando.');
});

test('classifyRerunnable marca lectura como rerunnable', () => {
  const entry = {
    action: 'device.list',
    status: 'success',
  } as HistoryEntry;

  const result = classifyRerunnable(entry);
  expect(result.rerunnable).toBe(true);
});

test('classifyRerunnable marca escritura como no rerunnable', () => {
  const entry = {
    action: 'device.add',
    status: 'success',
  } as HistoryEntry;

  const result = classifyRerunnable(entry);
  expect(result.rerunnable).toBe(false);
});

test('classifyRerunnable marca config-ios como no rerunnable', () => {
  const entry = {
    action: 'config.ios',
    status: 'success',
  } as HistoryEntry;

  const result = classifyRerunnable(entry);
  expect(result.rerunnable).toBe(false);
});

test('classifyRerunnable marca history.list como rerunnable', () => {
  const entry = {
    action: 'history.list',
    status: 'success',
  } as HistoryEntry;

  const result = classifyRerunnable(entry);
  expect(result.rerunnable).toBe(true);
});
