import type { HandlerDeps } from "../utils/helpers";
import type { PTNetwork, PTPort } from "../pt-api/pt-api-registry";
import type { PortOwnerIndex, PortOwner, PortLookupResult } from "./link-types";
import { normalizeMac } from "../utils/helpers";

export function normalizePortLookupKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}

export function pushIndexedOwner(
  index: Record<string, PortOwner[]>,
  key: string,
  owner: PortOwner,
): void {
  if (!index[key]) index[key] = [];
  index[key].push(owner);
}

export function safeGetObjectUuid(deps: HandlerDeps, obj: unknown): string | null {
  try {
    if (obj && typeof obj === "object" && typeof (obj as any).getObjectUuid === "function") {
      return (obj as any).getObjectUuid();
    }
    if (typeof (deps as any).ipc?.getObjectUuid !== "function") return null;
    return (deps as any).ipc.getObjectUuid(obj);
  } catch {
    return null;
  }
}

export function buildPortOwnerIndex(net: PTNetwork, deps: HandlerDeps): PortOwnerIndex {
  const index: PortOwnerIndex = {
    byUuid: {},
    byMac: {},
    byName: {},
    byNormalizedName: {},
  };

  const count = net.getDeviceCount();
  for (let di = 0; di < count; di++) {
    try {
      const dev = net.getDeviceAt(di);
      if (!dev) continue;

      const devName = typeof dev.getName === "function" ? String(dev.getName()) : `device-${di}`;
      const portCount = typeof dev.getPortCount === "function" ? dev.getPortCount() : 0;

      for (let pi = 0; pi < portCount; pi++) {
        const port = typeof dev.getPortAt === "function" ? (dev.getPortAt(pi) as PTPort | null) : null;
        if (!port || !port.getName) continue;

        const portName = port.getName();
        const portUuid = safeGetObjectUuid(deps, port);
        const rawMac = typeof port.getMacAddress === "function" ? port.getMacAddress() : "";
        const mac = normalizeMac(rawMac);

        const owner: PortOwner = { deviceName: devName, portName, portUuid, mac };

        try {
          if (port) (port as any).__ciscoAutoOwner__ = devName;
        } catch {}

        if (portUuid) index.byUuid[portUuid] = owner;
        if (mac && mac !== "000000000000") index.byMac[mac] = owner;

        pushIndexedOwner(index.byName, portName, owner);
        pushIndexedOwner(index.byNormalizedName, normalizePortLookupKey(portName), owner);
      }
    } catch {
      continue;
    }
  }

  return index;
}

export function resolvePortOwner(
  portObject: unknown,
  portName: string,
  index: PortOwnerIndex,
  deps: HandlerDeps,
  portUuidOverride: string | null = null,
  macOverride: string | null = null,
): PortLookupResult {
  const portUuid = portUuidOverride ?? safeGetObjectUuid(deps, portObject);
  const rawMac =
    macOverride ??
    (portObject && typeof (portObject as any).getMacAddress === "function"
      ? (portObject as any).getMacAddress()
      : null);
  const mac = normalizeMac(rawMac);

  if (portObject && typeof portObject === "object") {
    const injected = (portObject as any).__ciscoAutoOwner__;
    if (injected) {
      return {
        owner: { deviceName: injected, portName, portUuid, mac },
        candidates: [{ deviceName: injected, portName, portUuid, mac }],
        source: "dom",
        portUuid,
        mac,
      };
    }
  }

  if (portUuid && index.byUuid[portUuid]) {
    return {
      owner: index.byUuid[portUuid],
      candidates: [index.byUuid[portUuid]],
      source: "uuid",
      portUuid,
      mac,
    };
  }

  if (mac && mac !== "000000000000" && index.byMac[mac]) {
    return {
      owner: index.byMac[mac],
      candidates: [index.byMac[mac]],
      source: "mac",
      portUuid,
      mac,
    };
  }

  const byNameCandidates = index.byName[portName] || [];
  if (byNameCandidates.length === 1) {
    return {
      owner: byNameCandidates[0],
      candidates: byNameCandidates,
      source: "name",
      portUuid,
      mac,
    };
  }

  if (byNameCandidates.length > 1) {
    const normalized = normalizePortLookupKey(portName);
    const normalizedCandidates = index.byNormalizedName[normalized] || [];
    if (normalizedCandidates.length === 1) {
      return {
        owner: normalizedCandidates[0],
        candidates: normalizedCandidates,
        source: "name",
        portUuid,
        mac,
      };
    }
    return { owner: null, candidates: byNameCandidates, source: "name", portUuid, mac };
  }

  return { owner: null, candidates: [], source: "none", portUuid, mac };
}
