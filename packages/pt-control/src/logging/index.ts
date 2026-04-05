/**
 * Logging Module - NDJSON logging with 7-day rotation
 */

export type {
  LogEntry,
  LogSession,
  LogConfig,
  LogQueryOptions,
  LogStats,
} from './types.js';

export { LogManager, getLogManager, resetLogManager } from './log-manager.js';
export { redactSensitive } from './types.js';
