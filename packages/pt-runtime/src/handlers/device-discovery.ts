import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import { getDeviceTypeString } from "../utils/helpers";
import {
  buildPortOwnerIndex,
  buildConnectionsByDevice,
} from "../domain";
import type { ConnectionInfo } from "../domain";
import { collectLiveLinks } from "../domain/live-link";
import { composeDeviceListing } from "./device-listing";

/**
 * Payload para listar todos los dispositivos en la red.
 * Incluye información de puertos, conexiones, y estado de links.
 */
export interface ListDevicesPayload {
  type: "listDevices";
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
  _payload: ListDevicesPayload,
  deps: HandlerDeps,
): ListDevicesResult {
  const { getNet, dprint } = deps;
  const net = getNet();
  const count = net.getDeviceCount();

  dprint(`[handler:listDevices] starting deviceCount=${count}`);

  const portIndex = buildPortOwnerIndex(net, deps);
  const liveLinks = collectLiveLinks(net);
  const links = liveLinks.map((link) => ({
    id: link.id,
    device1: link.device1,
    port1: link.port1,
    device2: link.device2,
    port2: link.port2,
    source: "pt" as const,
    confidence: (link.state === "green" ? "exact" : link.state === "amber" ? "merged" : "unknown") as any,
    evidence: link.evidence,
  }));
  const connectionsByDevice = buildConnectionsByDevice(links);

  dprint(
    `[handler:listDevices] liveLinks=${links.length}`,
  );

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
  });

  dprint(`[handler:listDevices] SUCCESS returned ${devices.length} devices`);

  return {
    ok: true,
    devices,
    count,
    connectionsByDevice,
    unresolvedLinks,
    ptLinkDebug,
  };
}
