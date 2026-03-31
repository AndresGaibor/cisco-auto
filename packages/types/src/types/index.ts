/**
 * Types Index - Re-export all TypeScript types from schemas
 * For when you only need types, not Zod schemas
 */

// Common types
export type { IPCidr, IPAddress, MACAddress } from '../schemas/common.js';

// Device types
export type {
  DeviceType,
  InterfaceType,
  VLAN,
  Interface,
  Device,
} from '../schemas/device.js';

// Protocol types
export type { OSPF, EIGRP, VTP } from '../schemas/protocols.js';

// Security types
export type { ACL, NAT } from '../schemas/security.js';

// Lab types
export type { Connection, Validation, Lab } from '../schemas/lab.js';

// PT Control - Topology types
export type {
  PortState,
  DeviceState,
  DeviceType as PTDeviceType,
  CableType,
  LinkState,
  TopologySnapshot,
  DeviceDelta,
  LinkDelta,
  TopologyDelta,
} from '../schemas/pt-topology.js';

// PT Control - Parsed Output types
export type {
  InterfaceBrief,
  ShowIpInterfaceBrief,
  InterfaceDetail,
  ShowInterfaces,
  VlanEntry,
  ShowVlan,
  TrunkPort,
  ShowInterfacesTrunk,
  SwitchportInfo,
  ShowInterfacesSwitchport,
  RouteEntry,
  ShowIpRoute,
  RoutingProtocol,
  ShowIpProtocols,
  RunningConfigSection,
  ShowRunningConfig,
  ArpEntry,
  ShowIpArp,
  MacEntry,
  ShowMacAddressTable,
  StpPort,
  StpVlan,
  ShowSpanningTree,
  ShowVersion,
  CdpNeighbor,
  ShowCdpNeighbors,
  ParsedOutput,
  ParserFunction,
  ParserRegistry,
} from '../schemas/pt-parsed-output.js';

// PT Control - Command types
export type {
  CommandBase,
  AddLinkPayload,
  AddLinkPayloadRaw,
  CommandPayload,
  CommandPayloadTypeMap,
  CommandType,
  CommandFile,
} from '../schemas/pt-commands.js';

// PT Control - Event types
export type {
  PTEventBase,
  PTEvent,
  PTEventTypeMap,
  PTEventType,
} from '../schemas/pt-events.js';

// File Bridge types
export type {
  BridgeProtocolVersion,
  BridgeEventInput,
  BridgeCommandEnvelope,
  BridgeResultEnvelope,
  BridgeErrorDetail,
  BridgeEvent,
  BridgeCheckpoint,
  BridgeQueueStatus,
} from '../schemas/bridge.js';
