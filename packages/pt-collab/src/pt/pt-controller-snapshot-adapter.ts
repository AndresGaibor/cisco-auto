import type { DiffDevice, DiffLink, TopologySnapshot } from "../detector/change-detector.js";

export function toCollabSnapshot(raw: unknown): TopologySnapshot {
  if (!raw || typeof raw !== "object") {
    return emptySnapshot();
  }

  const r = raw as Record<string, unknown>;

  const devices: Record<string, DiffDevice> = {};
  const rawDevices = r.devices as Record<string, unknown> | undefined;
  if (rawDevices && typeof rawDevices === "object") {
    for (const [key, dev] of Object.entries(rawDevices)) {
      if (dev && typeof dev === "object") {
        const d = dev as Record<string, unknown>;
        devices[key] = {
          name: String(d.name ?? key),
          displayName: d.displayName ? String(d.displayName) : undefined,
          model: String(d.model ?? "unknown"),
          x: typeof d.x === "number" ? d.x : undefined,
          y: typeof d.y === "number" ? d.y : undefined,
        };
      }
    }
  }

  const links: Record<string, DiffLink> = {};
  const rawLinks = r.links as Record<string, unknown> | undefined;
  if (rawLinks && typeof rawLinks === "object") {
    for (const [key, lnk] of Object.entries(rawLinks)) {
      if (lnk && typeof lnk === "object") {
        const l = lnk as Record<string, unknown>;
        links[key] = {
          id: String(l.id ?? key),
          device1: String(l.device1 ?? ""),
          port1: String(l.port1 ?? ""),
          device2: String(l.device2 ?? ""),
          port2: String(l.port2 ?? ""),
        };
      }
    }
  }

  return {
    timestamp: typeof r.timestamp === "number" ? r.timestamp : Date.now(),
    devices,
    links,
    deviceConfigs: {},
  };
}

function emptySnapshot(): TopologySnapshot {
  return {
    timestamp: Date.now(),
    devices: {},
    links: {},
    deviceConfigs: {},
  };
}