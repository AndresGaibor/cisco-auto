import type { CollabDelta, CollabDeltaKind, CollabScope, DeviceHashes } from "../protocol/messages.js";

export interface DiffDevice {
  name: string;
  displayName?: string;
  model: string;
  x?: number;
  y?: number;
}

export interface DiffLink {
  id: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
}

export interface DeviceConfigSnapshot {
  runningConfig?: string;
  startupConfig?: string;
  xml?: string;
}

export interface TopologySnapshot {
  timestamp: number;
  devices: Record<string, DiffDevice>;
  links: Record<string, DiffLink>;
  deviceConfigs: Record<string, DeviceConfigSnapshot>;
}

export interface DiffResult {
  devicesAdded: DiffDevice[];
  devicesRemoved: string[];
  devicesMoved: Array<{ name: string; fromX?: number; fromY?: number; toX?: number; toY?: number }>;
  linksAdded: DiffLink[];
  linksRemoved: string[];
  configsChanged: Array<{ device: string; section: "runningConfig" | "startupConfig" | "xml" }>;
}

export function diffSnapshots(before: TopologySnapshot, after: TopologySnapshot): DiffResult {
  const result: DiffResult = {
    devicesAdded: [],
    devicesRemoved: [],
    devicesMoved: [],
    linksAdded: [],
    linksRemoved: [],
    configsChanged: [],
  };

  const beforeDeviceNames = new Set(Object.keys(before.devices));
  const afterDeviceNames = new Set(Object.keys(after.devices));

  // dispositivos añadidos
  for (const name of afterDeviceNames) {
    if (!beforeDeviceNames.has(name)) {
      result.devicesAdded.push(after.devices[name]!);
    }
  }

  // dispositivos removidos
  for (const name of beforeDeviceNames) {
    if (!afterDeviceNames.has(name)) {
      result.devicesRemoved.push(name);
    }
  }

  // dispositivos que cambiaron de posición
  for (const name of afterDeviceNames) {
    const afterDev = after.devices[name]!;
    const beforeDev = before.devices[name];
    if (beforeDev) {
      if (beforeDev.x !== afterDev.x || beforeDev.y !== afterDev.y) {
        result.devicesMoved.push({
          name,
          fromX: beforeDev.x,
          fromY: beforeDev.y,
          toX: afterDev.x,
          toY: afterDev.y,
        });
      }
    }
  }

  // enlaces añadidos
  for (const id of Object.keys(after.links)) {
    if (!before.links[id]) {
      result.linksAdded.push(after.links[id]!);
    }
  }

  // enlaces removidos
  for (const id of Object.keys(before.links)) {
    if (!after.links[id]) {
      result.linksRemoved.push(id);
    }
  }

  // cambios de configuración
  const afterDeviceConfigs = after.deviceConfigs ?? {};
  const beforeDeviceConfigs = before.deviceConfigs ?? {};
  for (const name of afterDeviceNames) {
    const afterCfg = afterDeviceConfigs[name];
    const beforeCfg = beforeDeviceConfigs[name];
    if (afterCfg && beforeCfg) {
      const sections: Array<"runningConfig" | "startupConfig" | "xml"> = [
        "runningConfig", "startupConfig", "xml",
      ];
      for (const section of sections) {
        if (afterCfg[section] !== undefined && beforeCfg[section] !== undefined) {
          if (afterCfg[section] !== beforeCfg[section]) {
            result.configsChanged.push({ device: name, section });
          }
        }
      }
    }
  }

  return result;
}

export function diffToDeltas(
  diff: DiffResult,
  roomId: string,
  peerId: string,
  seqStart: number,
  lamport: number,
  baseVector: Record<string, number>,
): CollabDelta[] {
  const deltas: CollabDelta[] = [];
  let seq = seqStart;

  for (const device of diff.devicesAdded) {
    deltas.push(makeDelta({
      seq: seq++,
      lamport,
      baseVector: { ...baseVector },
      roomId,
      peerId,
      kind: "topology.device.added",
      scope: `device:${device.name}` as CollabScope,
      payload: { name: device.name, model: device.model, displayName: device.displayName, x: device.x, y: device.y },
    }));
  }

  for (const name of diff.devicesRemoved) {
    deltas.push(makeDelta({
      seq: seq++,
      lamport,
      baseVector: { ...baseVector },
      roomId,
      peerId,
      kind: "topology.device.removed",
      scope: `device:${name}` as CollabScope,
      payload: { name },
    }));
  }

  for (const mv of diff.devicesMoved) {
    deltas.push(makeDelta({
      seq: seq++,
      lamport,
      baseVector: { ...baseVector },
      roomId,
      peerId,
      kind: "topology.device.moved",
      scope: `device:${mv.name}` as CollabScope,
      payload: { name: mv.name, fromX: mv.fromX, fromY: mv.fromY, toX: mv.toX, toY: mv.toY },
    }));
  }

  for (const link of diff.linksAdded) {
    deltas.push(makeDelta({
      seq: seq++,
      lamport,
      baseVector: { ...baseVector },
      roomId,
      peerId,
      kind: "topology.link.created",
      scope: `link:${link.id}` as CollabScope,
      payload: link,
    }));
  }

  for (const id of diff.linksRemoved) {
    deltas.push(makeDelta({
      seq: seq++,
      lamport,
      baseVector: { ...baseVector },
      roomId,
      peerId,
      kind: "topology.link.deleted",
      scope: `link:${id}` as CollabScope,
      payload: { id },
    }));
  }

  for (const cc of diff.configsChanged) {
    const kind = cc.section === "xml"
      ? "device.xml.changed" as CollabDeltaKind
      : "device.cli.runningConfig.changed" as CollabDeltaKind;
    deltas.push(makeDelta({
      seq: seq++,
      lamport,
      baseVector: { ...baseVector },
      roomId,
      peerId,
      kind,
      scope: `device:${cc.device}:${cc.section === "xml" ? "xml" : "running-config"}` as CollabScope,
      payload: { device: cc.device, section: cc.section },
    }));
  }

  return deltas;
}

export function snapshotFromTopology(
  devices: Record<string, { name: string; model: string; x?: number; y?: number; displayName?: string }>,
  links: Record<string, { id: string; device1: string; port1: string; device2: string; port2: string }>,
  configs?: Record<string, DeviceConfigSnapshot>,
): TopologySnapshot {
  const devs: Record<string, DiffDevice> = {};
  for (const [key, dev] of Object.entries(devices)) {
    devs[key] = {
      name: dev.name,
      model: dev.model,
      displayName: dev.displayName,
      x: dev.x,
      y: dev.y,
    };
  }
  const lnks: Record<string, DiffLink> = {};
  for (const [key, lnk] of Object.entries(links)) {
    lnks[key] = {
      id: lnk.id,
      device1: lnk.device1,
      port1: lnk.port1,
      device2: lnk.device2,
      port2: lnk.port2,
    };
  }
  return {
    timestamp: Date.now(),
    devices: devs,
    links: lnks,
    deviceConfigs: configs ?? {},
  };
}

function makeDelta(opts: {
  seq: number;
  lamport: number;
  baseVector: Record<string, number>;
  roomId: string;
  peerId: string;
  kind: CollabDeltaKind;
  scope: CollabScope;
  payload: unknown;
}): CollabDelta {
  return {
    id: `${opts.peerId}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    roomId: opts.roomId,
    peerId: opts.peerId,
    seq: opts.seq,
    lamport: opts.lamport,
    createdAt: new Date().toISOString(),
    baseVector: opts.baseVector,
    scope: opts.scope,
    kind: opts.kind,
    payload: opts.payload,
  };
}
