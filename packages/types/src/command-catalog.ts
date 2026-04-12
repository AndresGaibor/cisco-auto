/**
 * Catálogo Canónico de Comandos - Single Source of Truth
 * Este archivo define todos los comandos públicos e internos del sistema.
 * Desde aquí se derivan: schemas, tipos, dispatcher, handlers, y servicios.
 */

// ============================================================================
// Command Visibility
// ============================================================================

export type CommandVisibility = 'public' | 'internal';

// ============================================================================
// Execution Model
// ============================================================================

export type ExecutionModel = 'immediate' | 'deferred';

// ============================================================================
// Command Entry - Definición canónica de un comando
// ============================================================================

export interface CommandCatalogEntry {
  type: string;
  visibility: CommandVisibility;
  execution: ExecutionModel;
  handler: string;
  service?: string;
  payloadSchemaName: string;
  resultSchemaName: string;
}

// ============================================================================
// Catálogo de Comandos Públicos (expuestos al bridge CLI)
// ============================================================================

export const PUBLIC_COMMAND_CATALOG: CommandCatalogEntry[] = [
  // Device Commands
  {
    type: 'addDevice',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleAddDevice',
    service: 'device',
    payloadSchemaName: 'AddDevicePayloadSchema',
    resultSchemaName: 'AddDeviceResultSchema',
  },
  {
    type: 'removeDevice',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleRemoveDevice',
    service: 'device',
    payloadSchemaName: 'RemoveDevicePayloadSchema',
    resultSchemaName: 'RemoveDeviceResultSchema',
  },
  {
    type: 'listDevices',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleListDevices',
    service: 'device',
    payloadSchemaName: 'ListDevicesPayloadSchema',
    resultSchemaName: 'ListDevicesResultSchema',
  },
  {
    type: 'renameDevice',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleRenameDevice',
    service: 'device',
    payloadSchemaName: 'RenameDevicePayloadSchema',
    resultSchemaName: 'RenameDeviceResultSchema',
  },
  {
    type: 'moveDevice',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleMoveDevice',
    service: 'device',
    payloadSchemaName: 'MoveDevicePayloadSchema',
    resultSchemaName: 'MoveDeviceResultSchema',
  },
  {
    type: 'clearTopology',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleClearTopology',
    service: 'device',
    payloadSchemaName: 'ClearTopologyPayloadSchema',
    resultSchemaName: 'ClearTopologyResultSchema',
  },

  // Module Commands
  {
    type: 'addModule',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleAddModule',
    service: 'device',
    payloadSchemaName: 'AddModulePayloadSchema',
    resultSchemaName: 'AddModuleResultSchema',
  },
  {
    type: 'removeModule',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleRemoveModule',
    service: 'device',
    payloadSchemaName: 'RemoveModulePayloadSchema',
    resultSchemaName: 'RemoveModuleResultSchema',
  },

  // Link Commands
  {
    type: 'addLink',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleAddLink',
    service: 'topology',
    payloadSchemaName: 'AddLinkPayloadSchema',
    resultSchemaName: 'AddLinkResultSchema',
  },
  {
    type: 'removeLink',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleRemoveLink',
    service: 'topology',
    payloadSchemaName: 'RemoveLinkPayloadSchema',
    resultSchemaName: 'RemoveLinkResultSchema',
  },

   // Host Configuration
   {
     type: 'configHost',
     visibility: 'public',
     execution: 'immediate',
     handler: 'handleConfigHost',
     service: 'device',
     payloadSchemaName: 'ConfigHostPayloadSchema',
     resultSchemaName: 'ConfigHostResultSchema',
   },
   {
     type: 'configureDhcpServer',
     visibility: 'public',
     execution: 'immediate',
     handler: 'handleConfigureDhcpServer',
     service: 'device',
     payloadSchemaName: 'ConfigureDhcpServerPayloadSchema',
     resultSchemaName: 'ConfigureDhcpServerResultSchema',
   },
   {
     type: 'inspectDhcpServer',
     visibility: 'public',
     execution: 'immediate',
     handler: 'handleInspectDhcpServer',
     service: 'device',
     payloadSchemaName: 'InspectDhcpServerPayloadSchema',
     resultSchemaName: 'InspectDhcpServerResultSchema',
   },

   // DHCP Server (alternate naming for pt-runtime handlers)
   {
     type: 'configDhcpServer',
     visibility: 'public',
     execution: 'immediate',
     handler: 'handleConfigDhcpServer',
     service: 'device',
     payloadSchemaName: 'ConfigDhcpServerPayloadSchema',
     resultSchemaName: 'ConfigDhcpServerResultSchema',
   },

   // VLAN Commands
   {
     type: 'ensureVlans',
     visibility: 'public',
     execution: 'immediate',
     handler: 'handleEnsureVlans',
     service: 'device',
     payloadSchemaName: 'EnsureVlansPayloadSchema',
     resultSchemaName: 'EnsureVlansResultSchema',
   },
   {
     type: 'configVlanInterfaces',
     visibility: 'public',
     execution: 'immediate',
     handler: 'handleConfigVlanInterfaces',
     service: 'device',
     payloadSchemaName: 'ConfigVlanInterfacesPayloadSchema',
     resultSchemaName: 'ConfigVlanInterfacesResultSchema',
   },

    // IOS Commands
  {
    type: 'configIos',
    visibility: 'public',
    execution: 'deferred',
    handler: 'handleConfigIos',
    service: 'ios',
    payloadSchemaName: 'ConfigIosPayloadSchema',
    resultSchemaName: 'ConfigIosResultSchema',
  },
  {
    type: 'execIos',
    visibility: 'public',
    execution: 'deferred',
    handler: 'handleExecIos',
    service: 'ios',
    payloadSchemaName: 'ExecIosPayloadSchema',
    resultSchemaName: 'ExecIosResultSchema',
  },
  {
    type: 'execInteractive',
    visibility: 'public',
    execution: 'deferred',
    handler: 'handleExecInteractive',
    service: 'ios',
    payloadSchemaName: 'ExecInteractivePayloadSchema',
    resultSchemaName: 'ExecInteractiveResultSchema',
  },

  // Snapshot & Inspect
  {
    type: 'snapshot',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleSnapshot',
    service: 'topology',
    payloadSchemaName: 'SnapshotPayloadSchema',
    resultSchemaName: 'SnapshotResultSchema',
  },
  {
    type: 'inspect',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleInspect',
    service: 'device',
    payloadSchemaName: 'InspectPayloadSchema',
    resultSchemaName: 'InspectResultSchema',
  },

  // Hardware Commands
  {
    type: 'hardwareInfo',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleHardwareInfo',
    service: 'device',
    payloadSchemaName: 'HardwareInfoPayloadSchema',
    resultSchemaName: 'HardwareInfoResultSchema',
  },
  {
    type: 'hardwareCatalog',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleHardwareCatalog',
    service: 'device',
    payloadSchemaName: 'HardwareCatalogPayloadSchema',
    resultSchemaName: 'HardwareCatalogResultSchema',
  },

  // Command Log
  {
    type: 'commandLog',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleCommandLog',
    service: 'device',
    payloadSchemaName: 'CommandLogPayloadSchema',
    resultSchemaName: 'CommandLogResultSchema',
  },

  // Canvas/Rect Commands
  {
    type: 'listCanvasRects',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleListCanvasRects',
    service: 'topology',
    payloadSchemaName: 'ListCanvasRectsPayloadSchema',
    resultSchemaName: 'ListCanvasRectsResultSchema',
  },
  {
    type: 'getRect',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleGetRect',
    service: 'topology',
    payloadSchemaName: 'GetRectPayloadSchema',
    resultSchemaName: 'GetRectResultSchema',
  },
  {
    type: 'devicesInRect',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleDevicesInRect',
    service: 'topology',
    payloadSchemaName: 'DevicesInRectPayloadSchema',
    resultSchemaName: 'DevicesInRectResultSchema',
  },

  // Capabilities
  {
    type: 'resolveCapabilities',
    visibility: 'public',
    execution: 'immediate',
    handler: 'handleResolveCapabilities',
    service: 'device',
    payloadSchemaName: 'ResolveCapabilitiesPayloadSchema',
    resultSchemaName: 'ResolveCapabilitiesResultSchema',
  },
];

// ============================================================================
// Catálogo de Comandos Internos del Runtime (no expuestos al bridge)
// ============================================================================

export const INTERNAL_COMMAND_CATALOG: CommandCatalogEntry[] = [
  {
    type: '__healthcheck__',
    visibility: 'internal',
    execution: 'immediate',
    handler: 'handleHealthcheck',
    payloadSchemaName: 'HealthcheckPayloadSchema',
    resultSchemaName: 'HealthcheckResultSchema',
  },
  {
    type: '__pollDeferred',
    visibility: 'internal',
    execution: 'immediate',
    handler: 'handlePollDeferred',
    payloadSchemaName: 'PollDeferredPayloadSchema',
    resultSchemaName: 'PollDeferredResultSchema',
  },
];

// ============================================================================
// Catálogo Completo (público + interno)
// ============================================================================

export const COMMAND_CATALOG: CommandCatalogEntry[] = [
  ...PUBLIC_COMMAND_CATALOG,
  ...INTERNAL_COMMAND_CATALOG,
];

// ============================================================================
// Utilidades derivadas del catálogo
// ============================================================================

export const PUBLIC_COMMAND_TYPES = PUBLIC_COMMAND_CATALOG.map((c) => c.type);

export const INTERNAL_COMMAND_TYPES = INTERNAL_COMMAND_CATALOG.map((c) => c.type);

export const ALL_COMMAND_TYPES = COMMAND_CATALOG.map((c) => c.type);

// ============================================================================
// Constantes de comandos para uso en servicios (tipo-safe)
// ============================================================================

export const COMMAND_TYPES = {
  // Device Commands
  ADD_DEVICE: "addDevice",
  REMOVE_DEVICE: "removeDevice",
  LIST_DEVICES: "listDevices",
  RENAME_DEVICE: "renameDevice",
  MOVE_DEVICE: "moveDevice",
  CLEAR_TOPOLOGY: "clearTopology",
  
  // Module Commands
  ADD_MODULE: "addModule",
  REMOVE_MODULE: "removeModule",
  
  // Link Commands
  ADD_LINK: "addLink",
  REMOVE_LINK: "removeLink",
  
  // Host Configuration
  CONFIG_HOST: "configHost",
  
  // IOS Commands
  CONFIG_IOS: "configIos",
  EXEC_IOS: "execIos",
  EXEC_INTERACTIVE: "execInteractive",
  
   // Snapshot & Inspect
   SNAPSHOT: "snapshot",
   INSPECT: "inspect",
    CONFIGURE_DHCP_SERVER: "configureDhcpServer",
    INSPECT_DHCP_SERVER: "inspectDhcpServer",
    CONFIG_DHCP_SERVER: "configDhcpServer",
    ENSURE_VLANS: "ensureVlans",
    CONFIG_VLAN_INTERFACES: "configVlanInterfaces",
    
    // Hardware Commands
  HARDWARE_INFO: "hardwareInfo",
  HARDWARE_CATALOG: "hardwareCatalog",
  
  // Command Log
  COMMAND_LOG: "commandLog",
  
  // Canvas/Rect Commands
  LIST_CANVAS_RECTS: "listCanvasRects",
  GET_RECT: "getRect",
  DEVICES_IN_RECT: "devicesInRect",
  
  // Capabilities
  RESOLVE_CAPABILITIES: "resolveCapabilities",
} as const;

export type CommandTypeKey = keyof typeof COMMAND_TYPES;

export function getCommandEntry(type: string): CommandCatalogEntry | undefined {
  return COMMAND_CATALOG.find((c) => c.type === type);
}

export function isPublicCommand(type: string): boolean {
  return PUBLIC_COMMAND_TYPES.includes(type);
}

export function isInternalCommand(type: string): boolean {
  return INTERNAL_COMMAND_TYPES.includes(type);
}

export function getHandlerForCommand(type: string): string | undefined {
  const entry = getCommandEntry(type);
  return entry?.handler;
}

export function getServiceForCommand(type: string): string | undefined {
  const entry = getCommandEntry(type);
  return entry?.service;
}

export function getExecutionModel(type: string): ExecutionModel | undefined {
  const entry = getCommandEntry(type);
  return entry?.execution;
}

// ============================================================================
// Mapa de comandos por servicio
// ============================================================================

export interface CommandsByService {
  device: string[];
  topology: string[];
  ios: string[];
}

export function getCommandsByService(): CommandsByService {
  const services: CommandsByService = {
    device: [],
    topology: [],
    ios: [],
  };

  for (const cmd of PUBLIC_COMMAND_CATALOG) {
    if (cmd.service && services[cmd.service as keyof CommandsByService]) {
      services[cmd.service as keyof CommandsByService].push(cmd.type);
    }
  }

  return services;
}
