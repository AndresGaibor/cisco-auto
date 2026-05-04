export interface HeartbeatHealth {
  state: "ok" | "stale" | "missing" | "unknown";
  ageMs?: number;
  lastSeenTs?: number;
}

export interface TerminalReadinessCheckerDeps {
  controller: {
    getHeartbeatHealth?(): HeartbeatHealth;
  };
}

export const HEARTBEAT_STALE_THRESHOLD_MS = 20_000;
export const HEARTBEAT_HIGH_RISK_THRESHOLD_MS = 10_000;

export function createTerminalReadinessChecker(deps: TerminalReadinessCheckerDeps) {
  function getHeartbeatHealth(): HeartbeatHealth | null {
    try {
      return deps.controller.getHeartbeatHealth?.() ?? null;
    } catch {
      return null;
    }
  }

  function getHeartbeatAgeMs(health: HeartbeatHealth | null): number | null {
    if (!health || typeof health.ageMs !== "number" || !Number.isFinite(health.ageMs)) {
      return null;
    }

    return health.ageMs;
  }

  function isRuntimeStale(ageMs: number | null): boolean {
    return ageMs !== null && ageMs > HEARTBEAT_STALE_THRESHOLD_MS;
  }

  function isRuntimeStaleForHighRisk(ageMs: number | null): boolean {
    return ageMs !== null && ageMs > HEARTBEAT_HIGH_RISK_THRESHOLD_MS;
  }

  function checkReadiness(options?: {
    isHighRiskCommand?: boolean;
  }): {
    isReady: boolean;
    heartbeat: HeartbeatHealth | null;
    heartbeatAgeMs: number | null;
    reason?: string;
  } {
    const heartbeat = getHeartbeatHealth();
    const heartbeatAgeMs = getHeartbeatAgeMs(heartbeat);

    if (heartbeatAgeMs !== null && heartbeatAgeMs > HEARTBEAT_STALE_THRESHOLD_MS) {
      return {
        isReady: false,
        heartbeat,
        heartbeatAgeMs,
        reason: `PT_RUNTIME_UNAVAILABLE: el heartbeat del runtime supera 20s.`,
      };
    }

    if (options?.isHighRiskCommand && heartbeatAgeMs !== null && heartbeatAgeMs > HEARTBEAT_HIGH_RISK_THRESHOLD_MS) {
      return {
        isReady: false,
        heartbeat,
        heartbeatAgeMs,
        reason: `PT_RUNTIME_UNAVAILABLE: el heartbeat del runtime supera 10s para un comando IOS de alto riesgo.`,
      };
    }

    return {
      isReady: true,
      heartbeat,
      heartbeatAgeMs,
    };
  }

  return {
    getHeartbeatHealth,
    getHeartbeatAgeMs,
    isRuntimeStale,
    isRuntimeStaleForHighRisk,
    checkReadiness,
  };
}