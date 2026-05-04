// Terminal timings helpers

import type { AdapterTimingMap } from "./types.js";

export function nowMs(): number {
  return Date.now();
}

export function addTiming(timings: AdapterTimingMap, name: string, value: number): void {
  timings[name] = (timings[name] ?? 0) + Math.max(0, value);
}

export function setTiming(timings: AdapterTimingMap, name: string, value: number): void {
  if (!Number.isFinite(value)) {
    return;
  }

  timings[name] = Math.max(0, value);
}

export function readTimingValue(source: unknown, name: string): number | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  const value = (source as Record<string, unknown>)[name];
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function recordBridgeResultTimings(
  timings: AdapterTimingMap,
  prefix: string,
  bridgeResult: unknown,
): void {
  const bridgeTimings =
    bridgeResult && typeof bridgeResult === "object"
      ? (bridgeResult as { timings?: unknown }).timings
      : null;

  const waitMs = readTimingValue(bridgeTimings, "waitMs");
  const queueLatencyMs = readTimingValue(bridgeTimings, "queueLatencyMs");
  const execLatencyMs = readTimingValue(bridgeTimings, "execLatencyMs");
  const completedAtMs = readTimingValue(bridgeTimings, "completedAtMs");

  if (waitMs !== null) {
    addTiming(timings, `${prefix}BridgeWaitMs`, waitMs);
  }

  if (queueLatencyMs !== null) {
    addTiming(timings, `${prefix}QueueLatencyMs`, queueLatencyMs);
  }

  if (execLatencyMs !== null) {
    addTiming(timings, `${prefix}ExecLatencyMs`, execLatencyMs);
  }

  if (completedAtMs !== null) {
    setTiming(timings, `${prefix}CompletedAtMs`, completedAtMs);
  }
}

export async function measureAdapterAsync<T>(
  timings: AdapterTimingMap,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = nowMs();

  try {
    return await fn();
  } finally {
    addTiming(timings, name, nowMs() - startedAt);
  }
}

export function measureAdapterSync<T>(
  timings: AdapterTimingMap,
  name: string,
  fn: () => T,
): T {
  const startedAt = nowMs();

  try {
    return fn();
  } finally {
    addTiming(timings, name, nowMs() - startedAt);
  }
}

export function mergeTimingScope(
  evidence: unknown,
  scope: string,
  timings: AdapterTimingMap,
): Record<string, unknown> {
  const base =
    evidence && typeof evidence === "object"
      ? { ...(evidence as Record<string, unknown>) }
      : {};

  const existingTimings =
    base.timings && typeof base.timings === "object"
      ? { ...(base.timings as Record<string, unknown>) }
      : {};

  base.timings = {
    ...existingTimings,
    [scope]: {
      ...(existingTimings[scope] && typeof existingTimings[scope] === "object"
        ? (existingTimings[scope] as Record<string, unknown>)
        : {}),
      ...timings,
    },
  };

  return base;
}