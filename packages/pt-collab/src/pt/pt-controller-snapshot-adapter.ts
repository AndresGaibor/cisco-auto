import type { DiffDevice, DiffLink, TopologySnapshot } from "../detector/change-detector.js";

function numberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function toCollabSnapshot(raw: unknown): TopologySnapshot {
  if (!raw || typeof raw !== "object") {
    return emptySnapshot();
  }

  const r = raw as Record<string, unknown>;

  const devices: Record<string, DiffDevice> = {};
  const rawDevices = r.devices;
  if (rawDevices && typeof rawDevices === "object") {
    if (Array.isArray(rawDevices)) {
      // Formato de pt-runtime: Array<{name, model, x, y, ...}>
      // Indexar por name para que el key sea estable entre polls
      for (const dev of rawDevices) {
        if (dev && typeof dev === "object") {
          const d = dev as Record<string, unknown>;
          const name = String(d.name ?? "");
          if (!name) continue;
          devices[name] = {
            name,
            displayName: d.displayName ? String(d.displayName) : undefined,
            model: String(d.model ?? "unknown"),
            x: numberOrUndefined(d.x),
            y: numberOrUndefined(d.y),
          };
        }
      }
    } else {
      // Formato de pt-control TopologySnapshot: Record<string, DeviceState>
      // Mantener el key del Record para compatibilidad con los tests existentes
      for (const [key, dev] of Object.entries(rawDevices as Record<string, unknown>)) {
        if (dev && typeof dev === "object") {
          const d = dev as Record<string, unknown>;
          devices[key] = {
            name: String(d.name ?? key),
            displayName: d.displayName ? String(d.displayName) : undefined,
            model: String(d.model ?? "unknown"),
            x: numberOrUndefined(d.x),
            y: numberOrUndefined(d.y),
          };
        }
      }
    }
  }

  const links: Record<string, DiffLink> = {};
  const rawLinks = r.links;
  if (rawLinks && typeof rawLinks === "object") {
    if (Array.isArray(rawLinks)) {
      // Formato de pt-runtime: Array<{device1, port1, device2, port2}> sin id propio
      for (const lnk of rawLinks) {
        if (lnk && typeof lnk === "object") {
          const l = lnk as Record<string, unknown>;
          const d1 = String(l.device1 ?? "");
          const p1 = String(l.port1 ?? "");
          const d2 = String(l.device2 ?? "");
          const p2 = String(l.port2 ?? "");
          // Key estable (ordenado) para detectar el mismo enlace sin importar la dirección
          const [endpointA, endpointB] = [`${d1}:${p1}`, `${d2}:${p2}`].sort();
          const stableKey = `${endpointA}--${endpointB}`;
          links[stableKey] = {
            id: String(l.id ?? stableKey),
            device1: d1,
            port1: p1,
            device2: d2,
            port2: p2,
          };
        }
      }
    } else {
      // Formato de pt-control: Record<string, LinkState>
      for (const [key, lnk] of Object.entries(rawLinks as Record<string, unknown>)) {
        if (lnk && typeof lnk === "object") {
          const l = lnk as Record<string, unknown>;
          const id = String(l.id ?? key);
          links[id] = {
            id,
            device1: String(l.device1 ?? ""),
            port1: String(l.port1 ?? ""),
            device2: String(l.device2 ?? ""),
            port2: String(l.port2 ?? ""),
          };
        }
      }
    }
  }

  const manualCommands: Array<{ device: string; command: string }> = [];
  const rawCmds = r.manualCommands;
  if (Array.isArray(rawCmds)) {
    for (const cmd of rawCmds) {
      if (cmd && typeof cmd === "object") {
        manualCommands.push({
          device: String((cmd as any).device ?? ""),
          command: String((cmd as any).command ?? ""),
        });
      }
    }
  }

  return {
    timestamp: typeof r.timestamp === "number" ? r.timestamp : Date.now(),
    devices,
    links,
    deviceConfigs: {},
    manualCommands,
  };
}

function emptySnapshot(): TopologySnapshot {
  return {
    timestamp: Date.now(),
    devices: {},
    links: {},
    deviceConfigs: {},
    manualCommands: [],
  };
}