import type { DeviceState } from "@cisco-auto/types";

export interface ConnectionInfo {
  localPort: string | null;
  remoteDevice: string | null;
  remotePort: string | null;
  confidence: "exact" | "merged" | "registry" | "ambiguous" | "unknown";
  evidence?: { 
    localCandidates?: string[]; 
    remoteCandidates?: string[];
    source?: string;
  };
}

export interface UnresolvedLink {
  port1Name: string;
  port2Name: string;
  candidates1: string[];
  candidates2: string[];
  confidence: ConnectionInfo["confidence"];
  evidence: string[];
}

export interface DeviceListResult {
  devices: DeviceState[];
  count: number;
  connectionsByDevice: Record<string, ConnectionInfo[]>;
  unresolvedLinks: UnresolvedLink[];
}

export interface DevicesInRectResult {
  devices: string[];
  count: number;
}

export interface AddLinkPayload {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  cableType: string;
}
