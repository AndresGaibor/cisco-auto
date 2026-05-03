import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import type { TopologyCache } from "../infrastructure/pt/topology-cache.js";

export interface ControllerContextSummary {
  bridgeReady: boolean;
  topologyMaterialized: boolean;
  deviceCount: number;
  linkCount: number;
}

export interface ControllerHealthSummary {
  bridgeReady: boolean;
  topologyHealth: string;
  heartbeatState: "ok" | "stale" | "missing" | "unknown";
  warnings: string[];
}

export interface ControllerSystemContext {
  bridgeReady: boolean;
  topologyMaterialized: boolean;
  deviceCount: number;
  linkCount: number;
  heartbeat: {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  };
  bridge: {
    ready: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  };
  warnings: string[];
  notes: string[];
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function countRecordOrArray(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length;
  return 0;
}

function readDevicesFromSnapshot(snapshot: unknown): unknown[] {
  if (!snapshot || typeof snapshot !== "object") return [];

  const s = snapshot as Record<string, unknown>;

  if (Array.isArray(s.devices)) return s.devices;

  if (s.devices && typeof s.devices === "object") {
    return Object.values(s.devices as Record<string, unknown>);
  }

  if (s.value && typeof s.value === "object") {
    return readDevicesFromSnapshot(s.value);
  }

  return [];
}

function readLinksFromSnapshot(snapshot: unknown): unknown[] {
  if (!snapshot || typeof snapshot !== "object") return [];

  const s = snapshot as Record<string, unknown>;

  if (Array.isArray(s.links)) return s.links;

  if (s.links && typeof s.links === "object") {
    return Object.values(s.links as Record<string, unknown>);
  }

  if (s.value && typeof s.value === "object") {
    return readLinksFromSnapshot(s.value);
  }

  return [];
}

function getCacheDeviceCount(topologyCache: unknown): number {
  const cache = topologyCache as any;

  try {
    if (typeof cache.deviceCount === "function") return Number(cache.deviceCount() || 0);
  } catch {}

  try {
    if (typeof cache.getDeviceCount === "function") return Number(cache.getDeviceCount() || 0);
  } catch {}

  try {
    if (typeof cache.getSnapshot === "function") {
      return readDevicesFromSnapshot(cache.getSnapshot()).length;
    }
  } catch {}

  try {
    if (typeof cache.snapshot === "function") {
      return readDevicesFromSnapshot(cache.snapshot()).length;
    }
  } catch {}

  return 0;
}

function getCacheLinkCount(topologyCache: unknown): number {
  const cache = topologyCache as any;

  try {
    if (typeof cache.linkCount === "function") return Number(cache.linkCount() || 0);
  } catch {}

  try {
    if (typeof cache.getLinkCount === "function") return Number(cache.getLinkCount() || 0);
  } catch {}

  try {
    if (typeof cache.getSnapshot === "function") {
      return readLinksFromSnapshot(cache.getSnapshot()).length;
    }
  } catch {}

  try {
    if (typeof cache.snapshot === "function") {
      return readLinksFromSnapshot(cache.snapshot()).length;
    }
  } catch {}

  return 0;
}

function getLiveStateDeviceCount(bridge: unknown): number {
  const b = bridge as any;

  try {
    if (typeof b.getStateSnapshot === "function") {
      const snapshot = b.getStateSnapshot();
      const count = readDevicesFromSnapshot(snapshot).length;
      if (count > 0) return count;
    }
  } catch {}

  try {
    if (typeof b.readState === "function") {
      const snapshot = b.readState();
      const count = readDevicesFromSnapshot(snapshot).length;
      if (count > 0) return count;
    }
  } catch {}

  return 0;
}

function getLiveStateLinkCount(bridge: unknown): number {
  const b = bridge as any;

  try {
    if (typeof b.getStateSnapshot === "function") {
      const snapshot = b.getStateSnapshot();
      const count = readLinksFromSnapshot(snapshot).length;
      if (count > 0) return count;
    }
  } catch {}

  try {
    if (typeof b.readState === "function") {
      const snapshot = b.readState();
      const count = readLinksFromSnapshot(snapshot).length;
      if (count > 0) return count;
    }
  } catch {}

  return 0;
}

function isTopologyCacheMaterialized(topologyCache: unknown): boolean {
  const cache = topologyCache as any;

  try {
    if (typeof cache.isMaterialized === "function" && cache.isMaterialized()) return true;
  } catch {}

  return getCacheDeviceCount(topologyCache) > 0;
}

export class ControllerContextService {
  constructor(
    private readonly bridge: {
      isReady(): boolean;
      getBridgeStatus(): {
        ready: boolean;
        queuedCount?: number;
        inFlightCount?: number;
        warnings?: string[];
      };
      getHeartbeatHealth(): {
        state: "ok" | "stale" | "missing" | "unknown";
        ageMs?: number;
        lastSeenTs?: number;
      };
      getStateSnapshot?<T = unknown>(): T | null;
      readState?<T = unknown>(): T | null;
    },
    private readonly topologyCache: unknown,
  ) {}

  private getOperationalBridgeReady(): boolean {
    const heartbeat = this.bridge.getHeartbeatHealth?.() ?? { state: "unknown" as const };
    const bridgeStatus = this.bridge.getBridgeStatus?.() ?? { ready: false };

    let lifecycleReady = false;
    try {
      lifecycleReady = this.bridge.isReady() === true;
    } catch {}

    return lifecycleReady || bridgeStatus.ready === true || heartbeat.state === "ok";
  }

  private getOperationalCounts(): { deviceCount: number; linkCount: number } {
    const cacheDeviceCount = getCacheDeviceCount(this.topologyCache);
    const cacheLinkCount = getCacheLinkCount(this.topologyCache);

    const liveDeviceCount = getLiveStateDeviceCount(this.bridge);
    const liveLinkCount = getLiveStateLinkCount(this.bridge);

    return {
      deviceCount: Math.max(cacheDeviceCount, liveDeviceCount),
      linkCount: Math.max(cacheLinkCount, liveLinkCount),
    };
  }

  getContextSummary(): ControllerContextSummary {
    const { deviceCount, linkCount } = this.getOperationalCounts();

    const topologyMaterialized =
      isTopologyCacheMaterialized(this.topologyCache) ||
      deviceCount > 0;

    return {
      bridgeReady: this.getOperationalBridgeReady(),
      topologyMaterialized,
      deviceCount,
      linkCount,
    };
  }

  async getHealthSummary(): Promise<ControllerHealthSummary> {
    const summary = this.getContextSummary();
    const heartbeat = this.bridge.getHeartbeatHealth?.() ?? { state: "unknown" as const };
    const bridgeStatus = this.bridge.getBridgeStatus?.() ?? { ready: false, warnings: [] };

    const warnings: string[] = [];

    if (heartbeat.state === "stale") {
      warnings.push("Heartbeat stale");
    } else if (heartbeat.state === "missing") {
      warnings.push("Heartbeat missing");
    }

    for (const warning of asArray(bridgeStatus.warnings)) {
      warnings.push(String(warning));
    }

    if (!summary.bridgeReady) {
      warnings.push("Bridge not ready");
    }

    if (!summary.topologyMaterialized) {
      warnings.push("Topology not materialized");
    }

    return {
      bridgeReady: summary.bridgeReady,
      topologyHealth: summary.topologyMaterialized ? "healthy" : "warming",
      heartbeatState: heartbeat.state,
      warnings,
    };
  }

  getBridgeStatus(): {
    ready: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  } {
    const status = this.bridge.getBridgeStatus?.() ?? { ready: false, warnings: [] };
    const heartbeat = this.bridge.getHeartbeatHealth?.() ?? { state: "unknown" as const };

    return {
      ...status,
      ready: status.ready === true || heartbeat.state === "ok",
    };
  }

  getSystemContext(): ControllerSystemContext {
    const summary = this.getContextSummary();
    const heartbeat = this.bridge.getHeartbeatHealth?.() ?? { state: "unknown" as const };
    const bridgeStatus = this.getBridgeStatus();

    const warnings: string[] = [];
    const notes: string[] = [];

    if (!summary.bridgeReady) {
      warnings.push("Bridge no está listo.");
    }

    if (!summary.topologyMaterialized) {
      warnings.push("Topología no materializada.");
    }

    if (heartbeat.state === "stale") {
      warnings.push("Heartbeat stale.");
    } else if (heartbeat.state === "missing") {
      warnings.push("Heartbeat missing.");
    }

    notes.push(`Bridge: ${summary.bridgeReady ? "ready" : "not ready"}; heartbeat: ${heartbeat.state}`);
    notes.push(
      `Topology: ${summary.topologyMaterialized ? "materialized" : "warming"}; devices=${summary.deviceCount}; links=${summary.linkCount}`,
    );

    return {
      ...summary,
      heartbeat,
      bridge: bridgeStatus,
      warnings,
      notes,
    };
  }

  getHeartbeatHealth(): { state: "ok" | "stale" | "missing" | "unknown"; ageMs?: number; lastSeenTs?: number } {
    try {
      return this.bridge.getHeartbeatHealth?.() ?? { state: "unknown" };
    } catch {
      return { state: "unknown" };
    }
  }

  getHeartbeat(): { ts?: number; running?: boolean; activeCommand?: unknown; queued?: number; state?: "ok" | "stale" | "missing" | "unknown"; ageMs?: number; lastSeenTs?: number } {
    try {
      const bridgeAny = this.bridge as any;

      if (typeof bridgeAny.getHeartbeat === "function") {
        return bridgeAny.getHeartbeat() ?? {};
      }

      if (typeof bridgeAny.readHeartbeat === "function") {
        return bridgeAny.readHeartbeat() ?? {};
      }

      const health = this.getHeartbeatHealth();

      return {
        state: health.state,
        ageMs: health.ageMs,
        lastSeenTs: health.lastSeenTs,
        ts: health.lastSeenTs,
        running: health.state === "ok",
      };
    } catch {
      return {
        state: "unknown",
        running: false,
      };
    }
  }

  isBridgeReady(): boolean {
    return this.getContextSummary().bridgeReady;
  }

  isTopologyMaterialized(): boolean {
    return this.getContextSummary().topologyMaterialized;
  }
}
