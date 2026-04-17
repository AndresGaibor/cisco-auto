import type { HandlerDeps, PTFileManager } from "../utils/helpers";
import type { PTNetwork, PTPort } from "../pt-api/pt-api-registry";

export interface ListedLink {
  id: string;
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  source: "pt" | "registry" | "merged";
  confidence: "exact" | "registry" | "merged" | "ambiguous" | "unknown";
  evidence: string[];
}

export interface UnresolvedLink {
  port1?: { device: string; port: string };
  port2?: { device: string; port: string };
  reason: string;
}

export interface PtLinkRaw {
  p1Name: string;
  p2Name: string;
  d1Name?: string;
  d2Name?: string;
  p1Uuid: string | null;
  p2Uuid: string | null;
  p1Mac: string;
  p2Mac: string;
}

export interface RegistryLink {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  source: string;
}

export interface LinkRegistryEntry {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  source: string;
  createdAt: number;
}

export type LinkRegistry = Record<string, LinkRegistryEntry>;

export interface PortOwner {
  deviceName: string;
  portName: string;
  portUuid: string | null;
  mac: string;
}

export interface PortOwnerIndex {
  byUuid: Record<string, PortOwner>;
  byMac: Record<string, PortOwner>;
  byName: Record<string, PortOwner[]>;
  byNormalizedName: Record<string, PortOwner[]>;
}

export interface PortLookupResult {
  owner: PortOwner | null;
  candidates: PortOwner[];
  source: "uuid" | "mac" | "name" | "dom" | "none";
  portUuid: string | null;
  mac: string | null;
}

export type ConnectionInfo = {
  localPort: string | null;
  remoteDevice: string | null;
  remotePort: string | null;
  confidence: "exact" | "registry" | "merged" | "ambiguous" | "unknown";
  evidence?: {
    localCandidates?: string[];
    remoteCandidates?: string[];
    source?: string;
    localPortUuid?: string | null;
    remotePortUuid?: string | null;
  };
};
