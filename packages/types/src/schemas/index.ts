/**
 * Schemas Index - Central export for all Zod schemas
 * Single Source of Truth for the cisco-auto monorepo
 */

// Common types (IP, MAC addresses) - export explicitly to avoid conflicts
export {
  IPCidrSchema,
  IPAddressSchema,
  MACAddressSchema,
  type IPCidr,
  type IPAddress,
  type MACAddress,
} from "./common";

// Device schemas (Device, Interface, VLAN)
export {
  DeviceTypeSchema,
  InterfaceTypeSchema,
  VLANSchema,
  InterfaceSchema,
  DeviceSchema,
  type DeviceType,
  type InterfaceType,
  type VLAN,
  type Interface,
  type Device,
} from "./device";

// Protocol schemas (OSPF, EIGRP, VTP)
export { OSPFSchema, EIGRPSchema, VTPSchema, type OSPF, type EIGRP, type VTP } from "./protocols";

// Security schemas (ACL, NAT)
export { ACLSchema, NATSchema, type ACL, type NAT } from "./security";

// Lab schemas (Lab topology, connections, validation)
export {
  ConnectionSchema,
  ValidationSchema,
  LabSchema,
  zodValidateLab,
  validateLabSafe,
  type Connection,
  type Validation,
  type Lab,
} from "./lab";

// PT Control - Topology
export {
  PortStateSchema,
  DeviceTypeSchema as PTDeviceTypeSchema,
  DeviceStateSchema,
  CableTypeSchema,
  LinkStateSchema,
  TopologySnapshotSchema,
  DeviceDeltaSchema,
  LinkDeltaSchema,
  TopologyDeltaSchema,
  createLinkId,
  createEmptySnapshot,
  calculateDelta,
  type PortState,
  type DeviceType as PTDeviceType,
  type DeviceState,
  type CableType,
  type LinkState,
  type TopologySnapshot,
  type DeviceDelta,
  type LinkDelta,
  type TopologyDelta,
} from "./pt-topology";

// PT Control - Parsed Output
export {
  InterfaceBriefSchema,
  ShowIpInterfaceBriefSchema,
  InterfaceDetailSchema,
  ShowInterfacesSchema,
  VlanEntrySchema,
  ShowVlanSchema,
  TrunkPortSchema,
  ShowInterfacesTrunkSchema,
  SwitchportInfoSchema,
  ShowInterfacesSwitchportSchema,
  RouteEntrySchema,
  ShowIpRouteSchema,
  RoutingProtocolSchema,
  ShowIpProtocolsSchema,
  RunningConfigSectionSchema,
  ShowRunningConfigSchema,
  ArpEntrySchema,
  ShowIpArpSchema,
  MacEntrySchema,
  ShowMacAddressTableSchema,
  StpPortSchema,
  StpVlanSchema,
  ShowSpanningTreeSchema,
  ShowVersionSchema,
  CdpNeighborSchema,
  ShowCdpNeighborsSchema,
  ParsedOutputSchema,
  type InterfaceBrief,
  type ShowIpInterfaceBrief,
  type InterfaceDetail,
  type ShowInterfaces,
  type VlanEntry,
  type ShowVlan,
  type TrunkPort,
  type ShowInterfacesTrunk,
  type SwitchportInfo,
  type ShowInterfacesSwitchport,
  type RouteEntry,
  type ShowIpRoute,
  type RoutingProtocol,
  type ShowIpProtocols,
  type RunningConfigSection,
  type ShowRunningConfig,
  type ArpEntry,
  type ShowIpArp,
  type MacEntry,
  type ShowMacAddressTable,
  type StpPort,
  type StpVlan,
  type ShowSpanningTree,
  type ShowVersion,
  type CdpNeighbor,
  type ShowCdpNeighbors,
  type ParsedOutput,
  type ParserFunction,
  type ParserRegistry,
} from "./pt-parsed-output";

// PT Control - Commands
export {
  CommandBaseSchema,
  AddDevicePayloadSchema,
  RemoveDevicePayloadSchema,
  ListDevicesPayloadSchema,
  RenameDevicePayloadSchema,
  MoveDevicePayloadSchema,
  AddModulePayloadSchema,
  RemoveModulePayloadSchema,
  LinkTypeSchema,
  AddLinkPayloadSchema,
  AddLinkPayloadRawSchema,
  parseAddLinkPayload,
  RemoveLinkPayloadSchema,
  ConfigHostPayloadSchema,
  ConfigIosPayloadSchema,
  ExecIosPayloadSchema,
  SnapshotPayloadSchema,
  InspectPayloadSchema,
  ListCanvasRectsPayloadSchema,
  GetRectPayloadSchema,
  DevicesInRectPayloadSchema,
  ResolveCapabilitiesPayloadSchema,
  ExecInteractivePayloadSchema,
  HardwareInfoPayloadSchema,
  HardwareCatalogPayloadSchema,
  CommandLogPayloadSchema,
  CommandPayloadSchema,
  CommandFileSchema,
  generateCommandId,
  createCommandFile,
  type CommandBase,
  type AddLinkPayload,
  type AddLinkPayloadRaw,
  type CommandPayload,
  type CommandPayloadTypeMap,
  type CommandType,
  type CommandFile,
} from "./pt-commands";

// PT Control - Events
export {
  PTEventBaseSchema,
  InitEventSchema,
  RuntimeLoadedEventSchema,
  ErrorEventSchema,
  ResultEventSchema,
  DeviceAddedEventSchema,
  DeviceRemovedEventSchema,
  LinkCreatedEventSchema,
  LinkDeletedEventSchema,
  CliCommandEventSchema,
  CommandStartedEventSchema,
  CommandEndedEventSchema,
  OutputWrittenEventSchema,
  PromptChangedEventSchema,
  SnapshotEventSchema,
  LogEventSchema,
  PTEventSchema,
  type PTEventBase,
  type PTEvent,
  type PTEventTypeMap,
  type PTEventType,
} from "./pt-events";

// File Bridge
export {
  BRIDGE_PROTOCOL_VERSION,
  BridgeEventSchema,
  type BridgeProtocolVersion,
  type BridgeEventInput,
  type BridgeCommandEnvelope,
  type BridgeResultEnvelope,
  type BridgeResultTimings,
  type BridgeErrorDetail,
  type BridgeTimeoutDetails,
  type BridgeEvent,
  type BridgeCheckpoint,
  type BridgeQueueStatus,
  type DeviceSnapshot,
  type LinkSnapshot,
  type Snapshot,
  generateBridgeCommandId,
  calculatePayloadChecksum,
  type BridgeLease,
  type BridgeHeartbeat,
  type BridgeRuntimeState,
} from "./bridge";

// IOS Results - IosMode exported from pt-api/ios-mode.ts (Single Source of Truth)
export {
  OutputClassificationSchema,
  IosModeSchema,
  SessionStateSchema,
  CommandResultSchema,
  ConfigIosResultSchema,
  ExecIosResultSchema,
  ExecInteractiveResultSchema,
  IosErrorCodeSchema,
  IosErrorSchema,
  type OutputClassification,
  type SessionState,
  type CommandResult,
  type ConfigIosResult,
  type ExecIosResult,
  type ExecInteractiveResult,
  type IosErrorCode,
  type IosError,
} from "./ios-results";

// IOS Interactive Result (Fase 6 - Real Interactive Terminal)
export {
  CompletionReasonSchema,
  InteractionMetricsSchema,
  SessionInfoSchema,
  DiagnosticsSchema,
  TranscriptEntrySchema,
  IosInteractiveResultSchema,
  createSuccessResult,
  createFailedResult,
  createSyntheticResult,
  type CompletionReason,
  type InteractionMetrics,
  type SessionInfo,
  type Diagnostics,
  type TranscriptEntry,
  type IosInteractiveResult,
} from "./ios-interactive-result";

// Context Status
export { ContextStatusSchema, type ContextStatus } from "./context-status";

// History entry
export { HistoryEntrySchema, type HistoryEntry } from "./history-entry";

// Session log events
export { SessionLogEventSchema, type SessionLogEvent } from "./session-log-event";

// Lock info
export { LockInfoSchema, type LockInfo } from "./lock-info";

// Command Catalog - Single Source of Truth (runtime catalog only)
export {
  PUBLIC_COMMAND_CATALOG,
  INTERNAL_COMMAND_CATALOG,
  COMMAND_CATALOG,
  PUBLIC_COMMAND_TYPES,
  INTERNAL_COMMAND_TYPES,
  ALL_COMMAND_TYPES,
  getCommandEntry,
  isPublicCommand,
  isInternalCommand,
  getHandlerForCommand,
  getServiceForCommand,
  getExecutionModel,
  getCommandsByService,
  type CommandCatalogEntry as RuntimeCommandCatalogEntry,
  type CommandVisibility,
  type ExecutionModel,
} from "../command-catalog";

// Telemetry - Observabilidad unificada
export {
  ExecutionEventSchema,
  type ExecutionEvent,
} from "../telemetry/execution-event";

export {
  TelemetryCommandResultSchema,
  type TelemetryCommandResult,
} from "../telemetry/command-result";

export {
  VerificationResultSchema,
  type VerificationResult,
} from "../telemetry/verification-result";

export {
  ReportSchema,
  type Report,
} from "../telemetry/report";
