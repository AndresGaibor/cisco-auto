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
  warnings: string[];
}

export class ControllerContextService {
  constructor(
    private readonly bridge: FileBridgePort,
    private readonly topologyCache: TopologyCache,
  ) {}

  getContextSummary(): ControllerContextSummary {
    const bridgeReady = this.bridge.isReady();
    const snapshot = this.topologyCache.getSnapshot();
    const deviceCount = snapshot.devices ? Object.keys(snapshot.devices).length : 0;
    const linkCount = snapshot.links ? Object.keys(snapshot.links).length : 0;
    const topologyMaterialized = this.topologyCache.isMaterialized();
    return { bridgeReady, topologyMaterialized, deviceCount, linkCount };
  }

  async getHealthSummary(): Promise<ControllerHealthSummary> {
    const bridgeReady = this.bridge.isReady();
    const snapshot = this.topologyCache.getSnapshot();
    const topologyMaterialized = this.topologyCache.isMaterialized();

    let topologyHealth = "unknown";
    if (!topologyMaterialized) {
      topologyHealth = "warming";
    } else {
      const deviceCount = snapshot?.devices ? Object.keys(snapshot.devices).length : 0;
      topologyHealth = deviceCount > 0 ? "healthy" : "warming";
    }

    const hbHealth = this.bridge.getHeartbeatHealth();
    const warnings: string[] = [];

    if (hbHealth.state === "stale") {
      warnings.push("Heartbeat stale - PT podría no estar respondiendo");
    } else if (hbHealth.state === "missing") {
      warnings.push("Heartbeat missing - PT probablemente no está disponible");
    }

    if (!bridgeReady) {
      warnings.push("Bridge no está listo");
    }

    return {
      bridgeReady,
      topologyHealth,
      heartbeatState: hbHealth.state,
      warnings,
    };
  }

  getHeartbeat<T = unknown>(): T | null {
    return this.bridge.getHeartbeat<T>();
  }

  getHeartbeatHealth(): {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  } {
    return this.bridge.getHeartbeatHealth();
  }

  getBridgeStatus(): {
    ready: boolean;
    leaseValid?: boolean;
    queuedCount?: number;
    inFlightCount?: number;
    warnings?: string[];
  } {
    return this.bridge.getBridgeStatus();
  }

  getSystemContext(): ControllerSystemContext {
    const bridgeReady = this.bridge.isReady();
    const snapshot = this.topologyCache.getSnapshot();
    const deviceCount = snapshot?.devices ? Object.keys(snapshot.devices).length : 0;
    const linkCount = snapshot?.links ? Object.keys(snapshot.links).length : 0;
    const topologyMaterialized = this.topologyCache.isMaterialized();
    const hb = this.bridge.getHeartbeatHealth();
    const bridgeStatus = this.bridge.getBridgeStatus();
    const warnings: string[] = [];

    if (hb.state === "stale") warnings.push("Heartbeat stale - PT podría no estar respondiendo");
    if (hb.state === "missing") warnings.push("Heartbeat missing - PT probablemente no está disponible");
    if (!bridgeStatus.ready) warnings.push("Bridge no está listo");
    if (bridgeStatus.warnings && bridgeStatus.warnings.length) warnings.push(...bridgeStatus.warnings);

    return {
      bridgeReady,
      topologyMaterialized,
      deviceCount,
      linkCount,
      heartbeat: hb,
      warnings,
    };
  }
}
