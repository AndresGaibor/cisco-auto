// ============================================================================
// Eventos de Packet Tracer - Tipos extendidos
// ============================================================================
// Incluye eventos de TerminalLine, Puerto, y Workspace
// ============================================================================

// ============================================================================
// Eventos de TerminalLine
// ============================================================================

export type PTTerminalEventName =
  | "commandStarted"
  | "outputWritten"
  | "commandEnded"
  | "modeChanged"
  | "promptChanged"
  | "moreDisplayed"
  | "directiveSent"
  | "commandSelectedFromHistory"
  | "commandAutoCompleted"
  | "cursorPositionChanged";

export interface PTCommandStartedArgs {
  inputCommand: string;
  completeCommand: string;
  inputMode: string;
  processedCommand?: string;
}

export interface PTOutputWrittenArgs {
  newOutput: string;
  isDebug?: boolean;
}

export interface PTCommandEndedArgs {
  status: number;
}

export interface PTModeChangedArgs {
  newMode: string;
}

export interface PTPromptChangedArgs {
  newPrompt: string;
}

// ============================================================================
// Eventos de Puerto (HostPort)
// ============================================================================

export type PTPortEventName =
  | "ipChanged"
  | "powerChanged"
  | "linkStatusChanged"
  | "protocolStatusChanged"
  | "mtuChanged";

export interface PTIpChangedArgs {
  portName: string;
  oldIp: string;
  newIp: string;
}

export interface PTPowerChangedArgs {
  portName: string;
  isPoweredOn: boolean;
}

export interface PTLinkStatusChangedArgs {
  portName: string;
  isUp: boolean;
}

export interface PTProtocolStatusChangedArgs {
  portName: string;
  isUp: boolean;
}

// ============================================================================
// Eventos de Workspace (LogicalWorkspace)
// ============================================================================

export type PTWorkspaceEventName =
  | "deviceAdded"
  | "deviceRemoved"
  | "deviceMoved"
  | "linkCreated"
  | "linkDeleted"
  | "clusterAdded"
  | "canvasNoteAdded"
  | "canvasNoteDeleted";

export interface PTDeviceAddedArgs {
  deviceName: string;
  deviceType: number;
  x: number;
  y: number;
}

export interface PTDeviceRemovedArgs {
  deviceName: string;
}

export interface PTDeviceMovedArgs {
  deviceName: string;
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
}

export interface PTLinkCreatedArgs {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  linkType: number;
}

export interface PTLinkDeletedArgs {
  device1: string;
  port1: string;
  device2: string;
  port2: string;
}

// ============================================================================
// Eventos de Procesos (DHCP, VLAN, STP, etc.)
// ============================================================================

export type PTProcessEventName =
  | "poolAdded"
  | "poolRemoved"
  | "leaseAcquired"
  | "leaseExpired"
  | "vlanCreated"
  | "vlanDeleted"
  | "stpTopologyChanged";

export interface PTDhcpPoolAddedArgs {
  poolName: string;
  network: string;
}

export interface PTDhcpLeaseAcquiredArgs {
  poolName: string;
  macAddress: string;
  ipAddress: string;
}

export interface PTVlanCreatedArgs {
  vlanId: number;
  vlanName: string;
}

export interface PTStpTopologyChangedArgs {
  bridgeId: string;
  rootId: string;
  changedPort: string;
}

// ============================================================================
// Mapas de Tipos de Eventos
// ============================================================================

export interface PTTerminalEventTypeMap {
  commandStarted: PTCommandStartedArgs;
  outputWritten: PTOutputWrittenArgs;
  commandEnded: PTCommandEndedArgs;
  modeChanged: PTModeChangedArgs;
  promptChanged: PTPromptChangedArgs;
  moreDisplayed: { message: string };
  directiveSent: { directive: string };
  commandSelectedFromHistory: { command: string };
  commandAutoCompleted: { command: string };
  cursorPositionChanged: { position: number };
}

export interface PTPortEventTypeMap {
  ipChanged: PTIpChangedArgs;
  powerChanged: PTPowerChangedArgs;
  linkStatusChanged: PTLinkStatusChangedArgs;
  protocolStatusChanged: PTProtocolStatusChangedArgs;
  mtuChanged: { portName: string; oldMtu: number; newMtu: number };
}

export interface PTWorkspaceEventTypeMap {
  deviceAdded: PTDeviceAddedArgs;
  deviceRemoved: PTDeviceRemovedArgs;
  deviceMoved: PTDeviceMovedArgs;
  linkCreated: PTLinkCreatedArgs;
  linkDeleted: PTLinkDeletedArgs;
  clusterAdded: { clusterId: string };
  canvasNoteAdded: { noteId: string };
  canvasNoteDeleted: { noteId: string };
}

export interface PTProcessEventTypeMap {
  poolAdded: PTDhcpPoolAddedArgs;
  poolRemoved: { poolName: string };
  leaseAcquired: PTDhcpLeaseAcquiredArgs;
  leaseExpired: PTDhcpLeaseAcquiredArgs;
  vlanCreated: PTVlanCreatedArgs;
  vlanDeleted: { vlanId: number };
  stpTopologyChanged: PTStpTopologyChangedArgs;
}

// ============================================================================
// Registry de Eventos
// ============================================================================

export interface PTEventDescriptor {
  name: string;
  category: "terminal" | "port" | "workspace" | "process";
  description: string;
  argsType: string;
}

export const PT_EVENT_REGISTRY: readonly PTEventDescriptor[] = [
  // TerminalLine events
  {
    name: "commandStarted",
    category: "terminal",
    description: "When a command execution starts",
    argsType: "PTCommandStartedArgs",
  },
  {
    name: "outputWritten",
    category: "terminal",
    description: "When new output is written to terminal",
    argsType: "PTOutputWrittenArgs",
  },
  {
    name: "commandEnded",
    category: "terminal",
    description: "When a command execution ends",
    argsType: "PTCommandEndedArgs",
  },
  {
    name: "modeChanged",
    category: "terminal",
    description: "When IOS mode changes",
    argsType: "PTModeChangedArgs",
  },
  {
    name: "promptChanged",
    category: "terminal",
    description: "When prompt changes",
    argsType: "PTPromptChangedArgs",
  },
  // Port events
  {
    name: "ipChanged",
    category: "port",
    description: "When port IP address changes",
    argsType: "PTIpChangedArgs",
  },
  {
    name: "powerChanged",
    category: "port",
    description: "When port power state changes",
    argsType: "PTPowerChangedArgs",
  },
  // Workspace events
  {
    name: "deviceAdded",
    category: "workspace",
    description: "When a device is added to topology",
    argsType: "PTDeviceAddedArgs",
  },
  {
    name: "deviceRemoved",
    category: "workspace",
    description: "When a device is removed from topology",
    argsType: "PTDeviceRemovedArgs",
  },
  {
    name: "linkCreated",
    category: "workspace",
    description: "When a link is created",
    argsType: "PTLinkCreatedArgs",
  },
  {
    name: "linkDeleted",
    category: "workspace",
    description: "When a link is deleted",
    argsType: "PTLinkDeletedArgs",
  },
] as const;

// ============================================================================
// Helper para registrar eventos de forma segura
// ============================================================================

export interface PTEventRegistration {
  object: unknown;
  eventName: string;
  handler: (source: unknown, args: unknown) => void;
}

export function createEventHandler<T>(
  handler: (source: unknown, args: T) => void,
  validator?: (args: unknown) => args is T,
): (source: unknown, args: unknown) => void {
  return (source: unknown, args: unknown) => {
    if (validator) {
      if (validator(args)) {
        handler(source, args);
      }
    } else {
      handler(source, args as T);
    }
  };
}
