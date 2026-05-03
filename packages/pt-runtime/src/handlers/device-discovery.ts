import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import { getDeviceTypeString } from "../utils/helpers";
import {
  buildPortOwnerIndex,
  buildConnectionsByDevice,
} from "../domain";
import type { ConnectionInfo } from "../domain";
import { collectLiveLinks } from "../domain/live-link";
import { composeDeviceListing } from "./device-listing";

function bool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export interface ListDevicesOptions {
  includePorts: boolean;
  includeLinks: boolean;
  deep: boolean;
}

export function getListDeviceOptions(payload: unknown): ListDevicesOptions {
  const p = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};

  const deep = bool(p.deep);
  const includeLinks = deep || bool(p.includeLinks);
  const includePorts = deep || includeLinks || bool(p.includePorts);

  return {
    includePorts,
    includeLinks,
    deep,
  };
}

/**
 * Payload para listar todos los dispositivos en la red.
 */
export interface ListDevicesPayload {
  type: "listDevices";
  includePorts?: boolean;
  includeLinks?: boolean;
  deep?: boolean;
}

/**
 * Resultado de listDevices con dispositivos, conexiones, y debug info.
 */
export type ListDevicesResult = HandlerResult & {
  devices: Array<{ name: string; model: string; type: string; power: boolean; ports: any[] }>;
  count: number;
  connectionsByDevice: Record<string, ConnectionInfo[]>;
  unresolvedLinks: Array<{
    port1Name: string;
    port2Name: string;
    candidates1: string[];
    candidates2: string[];
    reason?: string;
  }>;
  ptLinkDebug: {
    getLinkCountResult: number;
    getLinkAtExists: boolean;
    ptLinksFromLinkAt: number;
    ptLinksFromPortScan: number;
    ptLinksFound: number;
    registryEntries: number;
  };
};

/**
 * Lista todos los dispositivos en la red de PT.
 * Combina información de múltiples fuentes: PTNetwork, port scan, y link registry.
 * Devuelve dispositivos con sus puertos, conexiones detectadas, y links sin resolver.
 * 
 * @param payload - ListDevicesPayload (solo type: "listDevices")
 * @param deps - HandlerDeps con acceso a getNet(), DEV_DIR, dprint
 * @returns ListDevicesResult con devices[], count, connectionsByDevice, unresolvedLinks
 * 
 * @example
 * handleListDevices({ type: "listDevices" }, deps)
 * // → {
 * //   ok: true,
 * //   devices: [{ name: "R1", model: "2911", type: "router", power: true, ports: [...] }],
 * //   count: 5,
 * //   connectionsByDevice: { "R1": [{ port: "Gig0/0", peerDevice: "S1", peerPort: "Gig0/1" }] },
 * //   unresolvedLinks: [],
 * //   ptLinkDebug: { getLinkCountResult: 4, ... }
 * // }
 */

/**
 * List all devices in the network
 */
export function handleListDevices(
  payload: ListDevicesPayload,
  deps: HandlerDeps,
): ListDevicesResult {
  const { getNet, dprint } = deps;
  const net = getNet();
  const count = net.getDeviceCount();

  const options = getListDeviceOptions(payload);
  const modeLabel = options.deep ? "deep" : options.includeLinks ? "links" : options.includePorts ? "ports" : "safe";

  dprint(`[handler:listDevices] starting deviceCount=${count} mode=${modeLabel}`);

  let liveLinks: any[] = [];
  let links: any[] = [];
  let connectionsByDevice: Record<string, ConnectionInfo[]> = {};
  let portIndex: ReturnType<typeof buildPortOwnerIndex> | null = null;

  if (options.includeLinks) {
    dprint("[handler:listDevices] collecting liveLinks because includeLinks/deep=true");
    portIndex = buildPortOwnerIndex(net, deps);
    liveLinks = collectLiveLinks(net);
    links = liveLinks.map((link) => ({
      id: link.id,
      device1: link.device1,
      port1: link.port1,
      device2: link.device2,
      port2: link.port2,
      source: "pt" as const,
      confidence: (link.state === "green" ? "exact" : link.state === "amber" ? "merged" : "unknown") as any,
      evidence: link.evidence,
    }));
    connectionsByDevice = buildConnectionsByDevice(links);

    dprint(`[handler:listDevices] liveLinks=${links.length}`);
  } else {
    dprint("[handler:listDevices] skip liveLinks in safe mode");
  }

  const ptLinkDebug = {
    getLinkCountResult: typeof net.getLinkCount === "function" ? net.getLinkCount() : 0,
    getLinkAtExists: typeof net.getLinkAt === "function",
    ptLinksFromLinkAt: liveLinks.length,
    ptLinksFromPortScan: liveLinks.length,
    ptLinksFound: liveLinks.length,
    registryEntries: 0,
  };

  const unresolvedLinks: ListDevicesResult["unresolvedLinks"] = [];

  const devices = composeDeviceListing({
    net,
    connectionsByDevice,
    portIndex,
    includePorts: options.includePorts,
  });

  dprint(`[handler:listDevices] SUCCESS returned ${devices.length} devices`);

  return {
    ok: true,
    devices,
    count,
    connectionsByDevice,
    unresolvedLinks,
    ptLinkDebug,
    meta: {
      mode: modeLabel,
      includePorts: options.includePorts,
      includeLinks: options.includeLinks,
      deep: options.deep,
      deviceCount: devices.length,
      linkCount: links.length,
    },
  };
}
