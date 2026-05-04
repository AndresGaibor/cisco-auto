export interface TerminalServiceTimingMap extends Record<string, number | undefined> {
  terminalCommandServiceTotalMs?: number;
  resolveDeviceKindCacheHit?: number;
  resolveDeviceKindCacheMiss?: number;
  inspectDeviceFastMs?: number;
  inspectDeviceMs?: number;
  getHeartbeatHealthMs?: number;
  getHeartbeatAgeMs?: number;
  buildIosPlanMs?: number;
  buildHostPlanMs?: number;
  runtimeTerminalRunPlanMs?: number;
  legacyExecIosMs?: number;
  legacyExecHostMs?: number;
  executeIosCommandMs?: number;
  executeHostCommandMs?: number;
  executeCommandHeartbeatMs?: number;
  executeCommandHeartbeatAgeMs?: number;
  resolveDeviceKindMs?: number;
  resolveHostCapabilityIdMs?: number;
}

export function serviceNowMs(): number {
  return Date.now();
}

export function addServiceTiming(
  timings: TerminalServiceTimingMap,
  name: string,
  value: number,
): void {
  timings[name] = (timings[name] ?? 0) + Math.max(0, value);
}

export async function measureServiceAsync<T>(
  timings: TerminalServiceTimingMap,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = serviceNowMs();

  try {
    return await fn();
  } finally {
    addServiceTiming(timings, name, serviceNowMs() - startedAt);
  }
}

export function measureServiceSync<T>(
  timings: TerminalServiceTimingMap,
  name: string,
  fn: () => T,
): T {
  const startedAt = serviceNowMs();

  try {
    return fn();
  } finally {
    addServiceTiming(timings, name, serviceNowMs() - startedAt);
  }
}

export function attachTerminalServiceTimings<T extends { evidence?: unknown }>(
  result: T,
  timings: TerminalServiceTimingMap,
  startedAt: number,
): T {
  timings.terminalCommandServiceTotalMs = Math.max(0, serviceNowMs() - startedAt);

  const evidence =
    result.evidence && typeof result.evidence === "object"
      ? { ...(result.evidence as Record<string, unknown>) }
      : {};

  const evidenceTimings =
    evidence.timings && typeof evidence.timings === "object"
      ? { ...(evidence.timings as Record<string, unknown>) }
      : {};

  result.evidence = {
    ...evidence,
    timings: {
      ...evidenceTimings,
      terminalCommandService: {
        ...(evidenceTimings.terminalCommandService &&
        typeof evidenceTimings.terminalCommandService === "object"
          ? (evidenceTimings.terminalCommandService as Record<string, unknown>)
          : {}),
        ...timings,
      },
    },
  };

  return result;
}