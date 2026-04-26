/**
 * Doctor check types for system diagnostics.
 * These types are used by the doctor use cases to represent check results.
 */

/**
 * Result of a single doctor check.
 */
export interface DoctorCheckResult {
  name: string;
  ok: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
  details?: string;
}

/**
 * Function type for a doctor check that takes a path and verbose flag.
 */
export type DoctorCheckFunction = (
  path: string,
  verbose: boolean,
) => DoctorCheckResult;

/**
 * Paths required for doctor checks.
 */
export interface DoctorPaths {
  ptDevDir: string;
  logsDir: string;
  historyDir: string;
  resultsDir: string;
}

/**
 * Controller interface for health checks that require PT controller access.
 */
export interface DoctorControllerHealth {
  getHeartbeat<T = unknown>(): T | null;
  getHeartbeatHealth(): {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  };
  getSystemContext(): {
    bridgeReady: boolean;
    topologyMaterialized: boolean;
    deviceCount: number;
    linkCount: number;
    heartbeat: {
      state: "ok" | "stale" | "missing" | "unknown";
      ageMs?: number;
      lastSeenTs?: number;
    };
    warnings: string[];
  };
}