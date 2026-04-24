import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import { getDeviceTypeString, collectPorts } from "../utils/helpers";
import {
  buildPortOwnerIndex,
  collectPtLinks,
  collectPtLinksViaPortScan,
  mergePtLinkSources,
  collectRegistryLinks,
  mergeCanonicalLinks,
  buildConnectionsByDevice,
  mergeRegistries,
  getLinkRegistry,
  loadLinksJson,
} from "../domain";
import type { ConnectionInfo } from "../domain";
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
  payload: ListDevicesPayload,
  deps: HandlerDeps,
): ListDevicesResult {
  const { getNet, DEV_DIR, getFM, dprint } = deps;
  const net = getNet();
  const count = net.getDeviceCount();

  dprint(`[handler:listDevices] starting deviceCount=${count}`);

  const fm = getFM();
  const mergedRegistry = mergeRegistries(getLinkRegistry(DEV_DIR, fm), loadLinksJson(DEV_DIR, fm));

  const portIndex = buildPortOwnerIndex(net, deps);
  const ptLinksFromLinkAt = collectPtLinks(net, deps);
  const ptLinksFromPortScan = collectPtLinksViaPortScan(net, deps);
  const ptLinks = mergePtLinkSources(ptLinksFromLinkAt, ptLinksFromPortScan);
  const registryLinks = collectRegistryLinks(mergedRegistry);
  const { links, unresolved } = mergeCanonicalLinks(ptLinks, registryLinks, portIndex, deps);
  const connectionsByDevice = buildConnectionsByDevice(links);

  dprint(
    `[handler:listDevices] ptLinksFromLinkAt=${ptLinksFromLinkAt.length} ptLinksFromPortScan=${ptLinksFromPortScan.length} ptLinksTotal=${ptLinks.length} registryLinks=${registryLinks.length} resolvedLinks=${links.length}`,
  );

  const ptLinkDebug = {
    getLinkCountResult: typeof net.getLinkCount === "function" ? net.getLinkCount() : 0,
    getLinkAtExists: typeof net.getLinkAt === "function",
    ptLinksFromLinkAt: ptLinksFromLinkAt.length,
    ptLinksFromPortScan: ptLinksFromPortScan.length,
    ptLinksFound: ptLinks.length,
    registryEntries: Object.keys(mergedRegistry).length,
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
