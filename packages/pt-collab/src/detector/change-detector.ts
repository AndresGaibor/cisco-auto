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
  manualCommands?: Array<{ device: string; command: string }>;
}

export interface DiffResult {
  devicesAdded: DiffDevice[];
  devicesRemoved: string[];
  devicesMoved: Array<{ name: string; fromX?: number; fromY?: number; toX?: number; toY?: number }>;
  devicesRenamed?: Array<{ oldName: string; newName: string; device: DiffDevice }>;
  linksAdded: DiffLink[];
  linksRemoved: string[];
  configsChanged: Array<{ device: string; section: "runningConfig" | "startupConfig" | "xml" }>;
  manualCommands?: Array<{ device: string; command: string }>;
}

export function diffSnapshots(before: TopologySnapshot, after: TopologySnapshot): DiffResult {
  const result: DiffResult = {
    devicesAdded: [],
    devicesRemoved: [],
    devicesMoved: [],
    devicesRenamed: [],
    linksAdded: [],
    linksRemoved: [],
    configsChanged: [],
    manualCommands: undefined,
  };

  if (after.manualCommands && after.manualCommands.length > 0) {
    const beforeCmds = before.manualCommands ?? [];
    const beforeSet = new Set(beforeCmds.map(c => c.device + ":" + c.command));
    const newCommands = after.manualCommands.filter(c => !beforeSet.has(c.device + ":" + c.command));
    if (newCommands.length > 0) {
      result.manualCommands = newCommands;
    }
  }

  const beforeDeviceNames = new Set(Object.keys(before.devices));
  const afterDeviceNames = new Set(Object.keys(after.devices));

  const matchedRemoved = new Set<string>();
  const matchedAdded = new Set<string>();
  const removedNames = Array.from(beforeDeviceNames).filter(name => !afterDeviceNames.has(name));
  const addedNames = Array.from(afterDeviceNames).filter(name => !beforeDeviceNames.has(name));

  for (const oldName of removedNames) {
    const oldDev = before.devices[oldName]!;
    for (const newName of addedNames) {
      if (matchedAdded.has(newName)) continue;
      const newDev = after.devices[newName]!;

      if (
        oldDev.model === newDev.model &&
        oldDev.x !== undefined && newDev.x !== undefined &&
        oldDev.y !== undefined && newDev.y !== undefined &&
        Math.abs(oldDev.x - newDev.x) < 0.1 &&
        Math.abs(oldDev.y - newDev.y) < 0.1
      ) {
        result.devicesRenamed!.push({ oldName, newName, device: newDev });
        matchedRemoved.add(oldName);
        matchedAdded.add(newName);
        break;
      }
    }
  }

  const ignoredLinksRemoved = new Set<string>();
  const ignoredLinksAdded = new Set<string>();

  if (result.devicesRenamed && result.devicesRenamed.length > 0) {
    for (const rn of result.devicesRenamed) {
      for (const [beforeLinkId, beforeLnk] of Object.entries(before.links)) {
        if (beforeLnk.device1 === rn.oldName || beforeLnk.device2 === rn.oldName) {
          const d1 = beforeLnk.device1 === rn.oldName ? rn.newName : beforeLnk.device1;
          const d2 = beforeLnk.device2 === rn.oldName ? rn.newName : beforeLnk.device2;

          let foundAfterLinkId: string | null = null;
          for (const [afterLinkId, afterLnk] of Object.entries(after.links)) {
            const matchNormal =
              afterLnk.device1 === d1 &&
              afterLnk.port1 === beforeLnk.port1 &&
              afterLnk.device2 === d2 &&
              afterLnk.port2 === beforeLnk.port2;
            const matchSwapped =
              afterLnk.device1 === d2 &&
              afterLnk.port1 === beforeLnk.port2 &&
              afterLnk.device2 === d1 &&
              afterLnk.port2 === beforeLnk.port1;

            if (matchNormal || matchSwapped) {
              foundAfterLinkId = afterLinkId;
              break;
            }
          }

          if (foundAfterLinkId) {
            ignoredLinksRemoved.add(beforeLinkId);
            ignoredLinksAdded.add(foundAfterLinkId);
          }
        }
      }
    }
  }

  for (const name of afterDeviceNames) {
    if (!beforeDeviceNames.has(name) && !matchedAdded.has(name)) {
      result.devicesAdded.push(after.devices[name]!);
    }
  }

  for (const name of beforeDeviceNames) {
    if (!afterDeviceNames.has(name) && !matchedRemoved.has(name)) {
      result.devicesRemoved.push(name);
    }
  }

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

  for (const id of Object.keys(after.links)) {
    if (!before.links[id] && !ignoredLinksAdded.has(id)) {
      result.linksAdded.push(after.links[id]!);
    }
  }

  for (const id of Object.keys(before.links)) {
    if (!after.links[id] && !ignoredLinksRemoved.has(id)) {
      result.linksRemoved.push(id);
    }
  }

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

  if (diff.devicesRenamed) {
    for (const rn of diff.devicesRenamed) {
      deltas.push(makeDelta({
        seq: seq++,
        lamport,
        baseVector: { ...baseVector },
        roomId,
        peerId,
        kind: "topology.device.renamed",
        scope: `device:${rn.oldName}` as CollabScope,
        payload: { oldName: rn.oldName, newName: rn.newName },
      }));
    }
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

  if (diff.manualCommands && diff.manualCommands.length > 0) {
    const commandsByDevice: Record<string, string[]> = {};
    for (const item of diff.manualCommands) {
      if (!commandsByDevice[item.device]) {
        commandsByDevice[item.device] = [];
      }
      commandsByDevice[item.device].push(item.command);
    }

    for (const [deviceName, configLines] of Object.entries(commandsByDevice)) {
      deltas.push(makeDelta({
        seq: seq++,
        lamport,
        baseVector: { ...baseVector },
        roomId,
        peerId,
        kind: "device.cli.runningConfig.changed",
        scope: `device:${deviceName}:running-config` as CollabScope,
        payload: { device: deviceName, configLines },
      }));
    }
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
