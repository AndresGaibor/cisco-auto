// ============================================================================
// Validation Context Types
// ============================================================================

export type MutationKind =
  | "assignHostIp"
  | "configureAccessPort"
  | "configureTrunkPort"
  | "configureSvi"
  | "configureSubinterface"
  | "configureStaticRoute"
  | "enableDhcpPool"
  | "configureNat"
  | "saveConfig"
  | "generic";

export interface Mutation<T = unknown> {
  kind: MutationKind;
  targetDevice: string;
  targetInterface?: string;
  input: T;
}

export interface HostIpInput {
  ip: string;
  mask: string;
  gateway?: string;
  dns?: string;
}

export interface InterfaceIntent {
  shouldBeUp?: boolean;
  expectedMode?: "access" | "trunk" | "routed";
  expectedVlanId?: number;
}

export interface DevicePortState {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  adminStatus?: "up" | "down" | "shutdown" | "administratively down";
  operStatus?: "up" | "down";
  protocolStatus?: "up" | "down";
  accessVlan?: number;
  vlanMode?: "access" | "trunk" | "routed";
}

export interface DeviceConfigState {
  runningConfigHash?: string;
  startupConfigHash?: string;
  lastSavedAt?: number;
  dirty?: boolean;
}

export interface DeviceTwinLike {
  name: string;
  model?: string;
  ports: Record<string, DevicePortState>;
  config?: DeviceConfigState;
}

export interface NetworkTwinLike {
  devices: Record<string, DeviceTwinLike>;
}

export interface ValidationContext<TInput = unknown> {
  twin: NetworkTwinLike;
  mutation: Mutation<TInput>;
  intent?: InterfaceIntent;
  phase: "preflight" | "postflight";
}
