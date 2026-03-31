// ============================================================================
// Context Cache - In-memory cache with invalidation
// ============================================================================

import type { AgentBaseContext } from "../contracts/twin-types.js";

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface ContextCache {
  baseContext: CacheEntry<AgentBaseContext> | null;
  deviceContexts: Map<string, CacheEntry<unknown>>;
  zoneContexts: Map<string, CacheEntry<unknown>>;
  lastTopologyVersion: number;
}

const DEFAULT_TTL = 30000; // 30 seconds

export function createCache(): ContextCache {
  return {
    baseContext: null,
    deviceContexts: new Map(),
    zoneContexts: new Map(),
    lastTopologyVersion: 0,
  };
}

export function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.timestamp > entry.ttl;
}

export function setBaseContext(
  cache: ContextCache,
  context: AgentBaseContext,
  ttl = DEFAULT_TTL
): void {
  cache.baseContext = {
    data: context,
    timestamp: Date.now(),
    ttl,
  };
}

export function getBaseContext(cache: ContextCache): AgentBaseContext | null {
  if (!cache.baseContext) return null;
  if (isExpired(cache.baseContext)) return null;
  return cache.baseContext.data;
}

export function setDeviceContext<T>(
  cache: ContextCache,
  deviceName: string,
  context: T,
  ttl = DEFAULT_TTL
): void {
  cache.deviceContexts.set(deviceName, {
    data: context,
    timestamp: Date.now(),
    ttl,
  });
}

export function getCachedDeviceContext<T>(
  cache: ContextCache,
  deviceName: string
): T | null {
  const entry = cache.deviceContexts.get(deviceName);
  if (!entry) return null;
  if (isExpired(entry)) {
    cache.deviceContexts.delete(deviceName);
    return null;
  }
  return entry.data as T;
}

export function setZoneContext<T>(
  cache: ContextCache,
  zoneId: string,
  context: T,
  ttl = DEFAULT_TTL
): void {
  cache.zoneContexts.set(zoneId, {
    data: context,
    timestamp: Date.now(),
    ttl,
  });
}

export function getCachedZoneContext<T>(
  cache: ContextCache,
  zoneId: string
): T | null {
  const entry = cache.zoneContexts.get(zoneId);
  if (!entry) return null;
  if (isExpired(entry)) {
    cache.zoneContexts.delete(zoneId);
    return null;
  }
  return entry.data as T;
}

export function invalidateAll(cache: ContextCache): void {
  cache.baseContext = null;
  cache.deviceContexts.clear();
  cache.zoneContexts.clear();
}

export function invalidateDevice(cache: ContextCache, deviceName: string): void {
  cache.deviceContexts.delete(deviceName);
  // Also invalidate base context as device list may have changed
  cache.baseContext = null;
}

export function invalidateZone(cache: ContextCache, zoneId: string): void {
  cache.zoneContexts.delete(zoneId);
  cache.baseContext = null;
}
