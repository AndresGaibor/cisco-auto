import type { HandlerDeps } from "../utils/helpers";
import type {
  PtLinkRaw,
  RegistryLink,
  ListedLink,
  UnresolvedLink,
  PortOwnerIndex,
  ConnectionInfo,
} from "./link-types";
import { resolvePortOwner } from "./port-owner-index";

export function mergeCanonicalLinks(
  ptLinks: PtLinkRaw[],
  registryLinks: RegistryLink[],
  portIndex: PortOwnerIndex,
  deps: HandlerDeps,
): { links: ListedLink[]; unresolved: UnresolvedLink[] } {
  const links: ListedLink[] = [];
  const unresolved: UnresolvedLink[] = [];

  for (let i = 0; i < ptLinks.length; i++) {
    const ptLink = ptLinks[i];
    const { p1Name, p2Name, d1Name, d2Name, p1Uuid, p2Uuid, p1Mac, p2Mac } = ptLink;

    const resolved1 = resolvePortOwner(null, p1Name, portIndex, deps, p1Uuid, p1Mac);
    const resolved2 = resolvePortOwner(null, p2Name, portIndex, deps, p2Uuid, p2Mac);

    const dn1 = d1Name || (resolved1.owner?.deviceName ?? null);
    const dn2 = d2Name || (resolved2.owner?.deviceName ?? null);

    let confidence: ListedLink["confidence"] = "unknown";
    const evidence: string[] = [];

    const isExact =
      !!dn1 &&
      !!dn2 &&
      dn1 !== dn2 &&
      (d1Name !== undefined ||
        resolved1.source === "uuid" ||
        resolved1.source === "mac" ||
        resolved1.candidates.length === 1) &&
      (d2Name !== undefined ||
        resolved2.source === "uuid" ||
        resolved2.source === "mac" ||
        resolved2.candidates.length === 1);

    if (isExact) {
      confidence = "exact";
      evidence.push("Matched by " + resolved1.source + "/" + resolved2.source);
    } else if (dn1 && dn2 && dn1 !== dn2) {
      if (
        d1Name ||
        resolved1.source === "uuid" ||
        resolved1.source === "mac" ||
        resolved1.candidates.length === 1
      ) {
        if (
          d2Name ||
          resolved2.source === "uuid" ||
          resolved2.source === "mac" ||
          resolved2.candidates.length === 1
        ) {
          confidence = "exact";
          evidence.push(
            "Matched by " +
              (d1Name ? "dom" : resolved1.source) +
              "/" +
              (d2Name ? "dom" : resolved2.source),
          );
        } else {
          confidence = "ambiguous";
          evidence.push(
            "Side 1 exact, Side 2 ambiguous (" + resolved2.candidates.length + " candidates)",
          );
        }
      } else {
        confidence = "ambiguous";
        evidence.push("Multiple candidates by name");
      }
    }

    if (dn1 && dn2 && dn1 !== dn2) {
      if (!isExact) {
        confidence = "ambiguous";
        if (resolved1.source !== "uuid" && resolved1.source !== "mac") {
          evidence.push("Side 1 resolved by name");
        }
        if (resolved2.source !== "uuid" && resolved2.source !== "mac") {
          evidence.push("Side 2 resolved by name");
        }
      } else {
        confidence = "exact";
        evidence.push("Matched by " + resolved1.source + "/" + resolved2.source);
      }

      links.push({
        id: "pt-" + p1Name + "-" + p2Name,
        device1: dn1,
        port1: p1Name,
        device2: dn2,
        port2: p2Name,
        source: "pt",
        confidence,
        evidence,
      });
    }
  }

  for (let i = 0; i < registryLinks.length; i++) {
    const regLink = registryLinks[i];
    let exists = false;
    for (let j = 0; j < links.length; j++) {
      const l = links[j];
      if (
        (l.device1 === regLink.device1 &&
          l.port1 === regLink.port1 &&
          l.device2 === regLink.device2 &&
          l.port2 === regLink.port2) ||
        (l.device1 === regLink.device2 &&
          l.port1 === regLink.port2 &&
          l.device2 === regLink.device1 &&
          l.port2 === regLink.port1)
      ) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      links.push({
        id: "reg-" + regLink.device1 + "-" + regLink.port1,
        device1: regLink.device1,
        port1: regLink.port1,
        device2: regLink.device2,
        port2: regLink.port2,
        source: "registry" as any,
        confidence: "registry" as any,
        evidence: ["Found in registry"],
      });
    }
  }

  return { links, unresolved };
}

export function buildConnectionsByDevice(links: ListedLink[]): Record<string, ConnectionInfo[]> {
  const connectionsByDevice: Record<string, ConnectionInfo[]> = {};

  for (const link of links) {
    const d1 = link.device1;
    const d2 = link.device2;

    if (!connectionsByDevice[d1]) connectionsByDevice[d1] = [];
    connectionsByDevice[d1].push({
      localPort: link.port1,
      remoteDevice: d2,
      remotePort: link.port2,
      confidence: link.confidence as any,
      evidence: { source: link.source },
    });

    if (!connectionsByDevice[d2]) connectionsByDevice[d2] = [];
    connectionsByDevice[d2].push({
      localPort: link.port2,
      remoteDevice: d1,
      remotePort: link.port1,
      confidence: link.confidence as any,
      evidence: { source: link.source },
    });
  }

  return connectionsByDevice;
}
