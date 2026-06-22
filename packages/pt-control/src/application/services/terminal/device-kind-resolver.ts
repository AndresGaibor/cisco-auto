import type { TerminalDeviceKind } from "@cisco-auto/terminal-contracts";
import { join } from "node:path";
import { measureServiceAsync, type TerminalServiceTimingMap } from "./command-timing-recorder.js";
import { resolvePtDevDir } from "../../../system/paths.js";

export interface DeviceKindCachePort {
  get(device: string): string | null | undefined;
  set(device: string, kind: string): void;
  clear?(): void;
}

export interface DeviceKindResolverDeps {
  controller: {
    inspectDeviceFast?(device: string): Promise<{
      type?: string | number;
      model?: string;
      name?: string;
      hostname?: string;
      customDeviceModel?: string;
    } | null | undefined>;
    inspectDevice(device: string): Promise<{
      type?: string | number;
      model?: string;
      name?: string;
      hostname?: string;
      customDeviceModel?: string;
    } | null | undefined>;
    batchInspectFast?(): Promise<Record<string, any>>;
  };
  cacheFilePath?: string;
  deviceKindCache?: DeviceKindCachePort;
}

const DEVICE_TYPE_MAP: Record<number, string> = {
  0: "router",
  1: "switch",
  3: "pc",
  4: "server",
  5: "printer",
  8: "host",
  9: "host",
  16: "switch_layer3",
};

const DEVICE_KIND_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos de caché para tipos de dispositivo

type CachedDeviceKind = TerminalDeviceKind;

interface DeviceKindCacheEntry {
  kind: CachedDeviceKind;
  expiresAtMs: number;
}

interface PersistentCache {
  entries: Record<string, DeviceKindCacheEntry>;
  version: number;
}

const PERSISTENT_CACHE_VERSION = 1;

function normalizeDeviceType(type: string | number | undefined): string {
  if (typeof type === "string") return type.trim().toLowerCase();
  if (typeof type === "number") return DEVICE_TYPE_MAP[type] || "unknown";
  return "unknown";
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function getDeviceModel(deviceState: { model?: unknown; customDeviceModel?: unknown }): string {
  return normalizeText(deviceState.model ?? deviceState.customDeviceModel);
}

function isIosLikeDevice(deviceState: {
  type?: string | number;
  model?: unknown;
  customDeviceModel?: unknown;
}): boolean {
  const deviceType = normalizeDeviceType(deviceState.type);
  const model = getDeviceModel(deviceState);

  return (
    deviceType === "router" ||
    deviceType === "switch" ||
    deviceType === "switch_layer3" ||
    deviceType === "generic" ||
    model === "2811" ||
    model === "2911" ||
    model === "1941" ||
    model === "2960" ||
    model === "2960-24tt" ||
    model === "3650-24ps" ||
    model.includes("router") ||
    model.includes("switch")
  );
}

function isHostLikeDevice(deviceState: {
  type?: string | number;
  model?: unknown;
  customDeviceModel?: unknown;
}): boolean {
  const deviceType = normalizeDeviceType(deviceState.type);
  const model = getDeviceModel(deviceState);

  return (
    deviceType === "host" ||
    deviceType === "pc" ||
    deviceType === "server" ||
    deviceType === "printer" ||
    model === "pc" ||
    model === "pc-pt" ||
    model === "laptop" ||
    model === "laptop-pt" ||
    model === "server" ||
    model === "server-pt" ||
    model === "printer" ||
    model === "printer-pt" ||
    model.includes("server") ||
    model.includes("pc-pt") ||
    model.includes("laptop") ||
    model.includes("printer")
  );
}

function classifyDeviceState(deviceState: {
  type?: string | number;
  model?: unknown;
  customDeviceModel?: unknown;
}): TerminalDeviceKind {
  if (isIosLikeDevice(deviceState)) {
    return "ios";
  }

  if (isHostLikeDevice(deviceState)) {
    return "host";
  }

  return "unknown";
}

function createRuntimePollingError(device: string, cause: string): Error {
  const error = new Error(
    `No se pudo inspeccionar "${device}" porque el runtime de Packet Tracer no respondió.`,
  ) as Error & { code?: string; details?: Record<string, unknown> };

  error.code = "RUNTIME_NOT_POLLING";
  error.details = { device, cause };
  return error;
}

function getDeviceKindCacheKey(device: string): string {
  return String(device ?? "").trim().toLowerCase();
}

function isCacheableDeviceKind(kind: TerminalDeviceKind): boolean {
  return kind === "ios" || kind === "host";
}

async function readPersistentCache(
  cacheFilePath: string,
): Promise<Record<string, DeviceKindCacheEntry>> {
  try {
    const content = await Bun.file(cacheFilePath).text();
    const parsed = JSON.parse(content) as PersistentCache;

    if (parsed.version !== PERSISTENT_CACHE_VERSION) {
      return {};
    }

    return parsed.entries ?? {};
  } catch {
    return {};
  }
}

async function writePersistentCache(
  cacheFilePath: string,
  entries: Record<string, DeviceKindCacheEntry>,
): Promise<void> {
  try {
    const cache: PersistentCache = {
      version: PERSISTENT_CACHE_VERSION,
      entries,
    };

    await Bun.write(Bun.file(cacheFilePath), JSON.stringify(cache, null, 2));
  } catch {
  }
}

async function loadPersistentCache(
  cacheFilePath: string,
): Promise<Map<string, DeviceKindCacheEntry>> {
  const entries = await readPersistentCache(cacheFilePath);
  const map = new Map<string, DeviceKindCacheEntry>();
  const now = Date.now();

  for (const [key, entry] of Object.entries(entries)) {
    if (entry.expiresAtMs > now) {
      map.set(key, entry);
    }
  }

  return map;
}

async function savePersistentCache(
  cacheFilePath: string,
  cache: Map<string, DeviceKindCacheEntry>,
): Promise<void> {
  const entries: Record<string, DeviceKindCacheEntry> = {};

  for (const [key, entry] of cache.entries()) {
    entries[key] = entry;
  }

  await writePersistentCache(cacheFilePath, entries);
}

export function createDeviceKindResolver(deps: DeviceKindResolverDeps) {
  const inMemoryCache = new Map<string, DeviceKindCacheEntry>();
  let persistentCache: Map<string, DeviceKindCacheEntry> | null = null;
  let cacheFilePath = deps.cacheFilePath ?? join(resolvePtDevDir(), "cache", "device-kind-cache.json");

  async function ensurePersistentCache(): Promise<Map<string, DeviceKindCacheEntry>> {
    if (!persistentCache) {
      persistentCache = await loadPersistentCache(cacheFilePath);
    }

    return persistentCache;
  }

  async function readCachedDeviceKind(device: string): Promise<TerminalDeviceKind | null> {
    const cacheKey = getDeviceKindCacheKey(device);
    if (!cacheKey) return null;

    const cached = inMemoryCache.get(cacheKey);
    if (cached && cached.expiresAtMs > Date.now()) {
      return cached.kind;
    }

    inMemoryCache.delete(cacheKey);

    try {
      const pCache = await ensurePersistentCache();
      const pCached = pCache.get(cacheKey);

      if (pCached && pCached.expiresAtMs > Date.now()) {
        inMemoryCache.set(cacheKey, pCached);
        return pCached.kind;
      }

      if (pCached) {
        pCache.delete(cacheKey);
        await savePersistentCache(cacheFilePath, pCache);
      }
    } catch {
    }

    return null;
  }

  async function writeCachedDeviceKind(device: string, kind: TerminalDeviceKind): Promise<void> {
    if (!isCacheableDeviceKind(kind)) return;

    const cacheKey = getDeviceKindCacheKey(device);
    if (!cacheKey) return;

    // Escribir en cache externa si está disponible
    if (deps.deviceKindCache) {
      deps.deviceKindCache.set(cacheKey, kind);
    }

    const entry: DeviceKindCacheEntry = {
      kind,
      expiresAtMs: Date.now() + DEVICE_KIND_CACHE_TTL_MS,
    };

    inMemoryCache.set(cacheKey, entry);

    try {
      const pCache = await ensurePersistentCache();
      pCache.set(cacheKey, entry);
      await savePersistentCache(cacheFilePath, pCache);
    } catch {
    }
  }

  async function resolveDeviceKind(
    device: string,
    timings?: TerminalServiceTimingMap,
  ): Promise<TerminalDeviceKind> {
    const serviceTimings = timings ?? {};

    // Verificar cache externa primero (compartida entre MCP ejecuciones)
    if (deps.deviceKindCache) {
      const cacheKey = getDeviceKindCacheKey(device);
      if (cacheKey) {
        const externalKind = deps.deviceKindCache.get(cacheKey) as TerminalDeviceKind | null | undefined;
        if (externalKind) {
          serviceTimings.resolveDeviceKindCacheHit = 1;
          (serviceTimings as Record<string, unknown>).resolveDeviceKindCacheSource = "external";
          return externalKind;
        }
      }
    }

    const cachedKind = await readCachedDeviceKind(device);

    if (cachedKind) {
      serviceTimings.resolveDeviceKindCacheHit = 1;
      return cachedKind;
    }

    serviceTimings.resolveDeviceKindCacheMiss = 1;

    try {
      // Intentar inspección por lotes si está disponible (vía Omni Raw)
      if (deps.controller.batchInspectFast) {
        try {
          const batchData = await measureServiceAsync(
            serviceTimings,
            "batchInspectFastMs",
            () => deps.controller.batchInspectFast!(),
          );

          if (batchData && Object.keys(batchData).length > 0) {
            // Poblar caché para todos los dispositivos encontrados
            for (const [name, state] of Object.entries(batchData)) {
              const kind = classifyDeviceState(state);
              await writeCachedDeviceKind(name, kind);
            }

            // Retornar el del dispositivo solicitado si está en el lote
            const requestedState = batchData[device] ?? 
                                  Object.values(batchData).find(s => (s as any).name === device);
            if (requestedState) {
              return classifyDeviceState(requestedState);
            }
          }
        } catch (batchErr) {
          // Si el lote falla, seguimos con el método individual (fallback)
        }
      }

      const fastInspector = deps.controller.inspectDeviceFast;

      if (fastInspector) {
        let fastDeviceState: unknown = null;

        try {
          fastDeviceState = await measureServiceAsync(
            serviceTimings,
            "inspectDeviceFastMs",
            () => fastInspector.call(deps.controller, device),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error ?? "");
          const lowered = message.toLowerCase();

          if (
            lowered.includes("timeout") ||
            lowered.includes("timed out") ||
            lowered.includes("runtime_not_polling") ||
            lowered.includes("no result")
          ) {
            throw createRuntimePollingError(device, message);
          }

          fastDeviceState = null;
        }

        if (!fastDeviceState) {
          return "unknown";
        }

        const kind = classifyDeviceState(fastDeviceState);
        await writeCachedDeviceKind(device, kind);
        return kind;
      }

      const deviceState = await measureServiceAsync(
        serviceTimings,
        "inspectDeviceMs",
        () => deps.controller.inspectDevice(device).catch(() => null),
      );

      if (!deviceState) {
        return "unknown";
      }

      const kind = classifyDeviceState(deviceState);
      await writeCachedDeviceKind(device, kind);
      return kind;
    } catch (error) {
      const runtimeError = error as Error & { code?: string };

      if (runtimeError.code === "RUNTIME_NOT_POLLING") {
        throw runtimeError;
      }

      return "unknown";
    }
  }

  return {
    resolveDeviceKind,
  };
}
