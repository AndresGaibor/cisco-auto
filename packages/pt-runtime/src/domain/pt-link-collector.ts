import type { HandlerDeps } from "../utils/helpers";
import type { PTNetwork, PTPort } from "../pt-api/pt-api-registry";
import type { PtLinkRaw } from "./link-types";
import { normalizeMac } from "../utils/helpers";
import { safeGetObjectUuid } from "./port-owner-index";

export function collectPtLinks(net: PTNetwork, deps: HandlerDeps): PtLinkRaw[] {
  const links: PtLinkRaw[] = [];
  const linkCount = typeof net.getLinkCount === "function" ? net.getLinkCount() : 0;

  for (let li = 0; li < linkCount; li++) {
    const link = typeof net.getLinkAt === "function" ? net.getLinkAt(li) : null;
    if (!link) continue;

    const port1 = link.getPort1 ? (link.getPort1() as PTPort | null) : null;
    const port2 = link.getPort2 ? (link.getPort2() as PTPort | null) : null;
    if (!port1 || !port2 || !port1.getName || !port2.getName) continue;

    const p1Name = port1.getName();
    const p2Name = port2.getName();
    const p1Uuid = safeGetObjectUuid(deps, port1);
    const p2Uuid = safeGetObjectUuid(deps, port2);
    const p1Mac = normalizeMac(
      typeof port1.getMacAddress === "function" ? port1.getMacAddress() : "",
    );
    const p2Mac = normalizeMac(
      typeof port2.getMacAddress === "function" ? port2.getMacAddress() : "",
    );

    links.push({ p1Name, p2Name, p1Uuid, p2Uuid, p1Mac, p2Mac });
  }

  return links;
}

export function collectPtLinksViaPortScan(net: PTNetwork, deps: HandlerDeps): PtLinkRaw[] {
  const links: PtLinkRaw[] = [];
  const seen = new Set<string>();
  const count = net.getDeviceCount();

  for (let di = 0; di < count; di++) {
    const dev = net.getDeviceAt(di);
    if (!dev) continue;
    const portCount = typeof dev.getPortCount === "function" ? dev.getPortCount() : 0;

    for (let pi = 0; pi < portCount; pi++) {
      const port = dev.getPortAt ? (dev.getPortAt(pi) as PTPort | null) : null;
      if (!port || typeof port.getName !== "function") continue;

      const isUp = typeof port.isPortUp === "function" ? port.isPortUp() : false;
      if (!isUp) continue;

      let linkObj: unknown = null;
      try {
        linkObj = typeof (port as any).getLink === "function" ? (port as any).getLink() : null;
      } catch {
        continue;
      }
      if (!linkObj) continue;

      const p1 =
        typeof (linkObj as any).getPort1 === "function"
          ? ((linkObj as any).getPort1() as PTPort | null)
          : null;
      const p2 =
        typeof (linkObj as any).getPort2 === "function"
          ? ((linkObj as any).getPort2() as PTPort | null)
          : null;
      if (!p1 || !p2) continue;

      const p1Mac = normalizeMac(typeof p1.getMacAddress === "function" ? p1.getMacAddress() : "");
      const p2Mac = normalizeMac(typeof p2.getMacAddress === "function" ? p2.getMacAddress() : "");

      const dedupeKey = p1Mac && p2Mac ? [p1Mac, p2Mac].sort().join("-") : null;
      if (dedupeKey) {
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
      }

      links.push({
        p1Name: typeof p1.getName === "function" ? p1.getName() : "",
        p2Name: typeof p2.getName === "function" ? p2.getName() : "",
        d1Name: (p1 as any).__ciscoAutoOwner__ || dev.getName(),
        d2Name: (p2 as any).__ciscoAutoOwner__,
        p1Uuid: safeGetObjectUuid(deps, p1),
        p2Uuid: safeGetObjectUuid(deps, p2),
        p1Mac,
        p2Mac,
      });
    }
  }

  return links;
}

export function mergePtLinkSources(
  fromLinkAt: PtLinkRaw[],
  fromPortScan: PtLinkRaw[],
): PtLinkRaw[] {
  const seen = new Set<string>();
  const merged: PtLinkRaw[] = [];

  function addIfNew(link: PtLinkRaw) {
    const ZERO_MAC = "000000000000";
    const mac1 = (link.p1Mac || "").replace(/[.:-]/g, "");
    const mac2 = (link.p2Mac || "").replace(/[.:-]/g, "");
    const macPairValid = mac1 && mac2 && mac1 !== ZERO_MAC && mac2 !== ZERO_MAC;

    const key = macPairValid
      ? [mac1, mac2].sort().join("-")
      : link.p1Uuid && link.p2Uuid
        ? [link.p1Uuid, link.p2Uuid].sort().join("|")
        : [link.p1Name, link.p2Name].sort().join("|");

    if (seen.has(key)) return;
    seen.add(key);
    merged.push(link);
  }

  for (let i = 0; i < fromLinkAt.length; i++) addIfNew(fromLinkAt[i]);
  for (let i = 0; i < fromPortScan.length; i++) addIfNew(fromPortScan[i]);

  return merged;
}
