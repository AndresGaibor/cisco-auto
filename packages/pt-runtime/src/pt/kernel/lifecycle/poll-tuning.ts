// packages/pt-runtime/src/pt/kernel/lifecycle/poll-tuning.ts
// Funciones de tuning para polling adaptativo.

export const DEFAULT_MIN_POLL_DELAY_MS = 100;
export const DEFAULT_MAX_IDLE_POLL_DELAY_MS = 500;
export const DEFAULT_POLL_ERROR_DELAY_MS = 3000;
export const DEFAULT_HOT_POLL_TICKS_AFTER_ACTIVITY = 16;
export const DEFAULT_CONTROL_POLL_DELAY_MS = 75;
export const DEFAULT_CONTROL_HOT_POLL_TICKS_AFTER_ACTIVITY = 12;

export function isControlPollCommandType(type: unknown): boolean {
  const normalized = String(type ?? "").trim();

  return (
    normalized === "__pollDeferred" ||
    normalized === "__ping" ||
    normalized === "__runtimeStatus" ||
    normalized === "__reloadRuntime" ||
    normalized === "inspectDeviceFast" ||
    normalized === "readTerminal" ||
    normalized === "omni.evaluate.raw" ||
    normalized === "__evaluate"
  );
}

export function readPositiveInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.max(min, Math.min(Math.trunc(parsed), max));
}

export interface PollTuning {
  minPollDelayMs: number;
  maxIdlePollDelayMs: number;
  pollErrorDelayMs: number;
  hotPollTicksAfterActivity: number;
  controlPollDelayMs: number;
  controlHotPollTicksAfterActivity: number;
}

export function readPollTuning(config: unknown): PollTuning {
  const record = config && typeof config === "object" ? (config as Record<string, unknown>) : {};

  const minPollDelayMs = readPositiveInt(
    record.minPollDelayMs ?? record.pollIntervalMs,
    DEFAULT_MIN_POLL_DELAY_MS,
    75,
    500,
  );

  return {
    minPollDelayMs,
    maxIdlePollDelayMs: readPositiveInt(
      record.maxIdlePollDelayMs,
      DEFAULT_MAX_IDLE_POLL_DELAY_MS,
      minPollDelayMs,
      2000,
    ),
    pollErrorDelayMs: readPositiveInt(
      record.pollErrorDelayMs,
      DEFAULT_POLL_ERROR_DELAY_MS,
      500,
      10_000,
    ),
    hotPollTicksAfterActivity: readPositiveInt(
      record.hotPollTicksAfterActivity,
      DEFAULT_HOT_POLL_TICKS_AFTER_ACTIVITY,
      1,
      100,
    ),
    controlPollDelayMs: readPositiveInt(
      record.controlPollDelayMs,
      DEFAULT_CONTROL_POLL_DELAY_MS,
      50,
      minPollDelayMs,
    ),
    controlHotPollTicksAfterActivity: readPositiveInt(
      record.controlHotPollTicksAfterActivity,
      DEFAULT_CONTROL_HOT_POLL_TICKS_AFTER_ACTIVITY,
      1,
      100,
    ),
  };
}
