import { z } from 'zod';

// ============================================================================
// Command Payload Types - Commands sent from CLI to PT
// ============================================================================

/** Base command structure */
export const CommandBaseSchema = z.object({
  id: z.string(),
  type: z.string(),
});

export type CommandBase = z.infer<typeof CommandBaseSchema>;

// ============================================================================
// Device Commands
// ============================================================================

export const AddDevicePayloadSchema = z.object({
  id: z.string(),
  type: z.literal('addDevice'),
  name: z.string(),
  model: z.string(),
  x: z.number().default(100),
  y: z.number().default(100),
});

export const RemoveDevicePayloadSchema = z.object({
  id: z.string(),
  type: z.literal('removeDevice'),
  name: z.string(),
});

export const ListDevicesPayloadSchema = z.object({
  id: z.string(),
  type: z.literal('listDevices'),
  filter: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
  startsWith: z.string().optional(),
});

export const RenameDevicePayloadSchema = z.object({
  id: z.string(),
  type: z.literal('renameDevice'),
  oldName: z.string(),
  newName: z.string(),
});

// ============================================================================
// Module Commands
// ============================================================================

export const AddModulePayloadSchema = z.object({
  id: z.string(),
  type: z.literal('addModule'),
  device: z.string(),
  slot: z.number(),
  module: z.string(),
});

export const RemoveModulePayloadSchema = z.object({
  id: z.string(),
  type: z.literal('removeModule'),
  device: z.string(),
  slot: z.number(),
});

// ============================================================================
// Link Commands
// ============================================================================

export const AddLinkPayloadSchema = z.object({
  id: z.string(),
  type: z.literal('addLink'),
  device1: z.string(),
  port1: z.string(),
  device2: z.string(),
  port2: z.string(),
  linkType: z.enum([
    'straight', 'cross', 'roll', 'fiber', 'phone',
    'cable', 'serial', 'auto', 'console', 'wireless',
    'coaxial', 'octal', 'cellular', 'usb', 'custom_io'
  ]).default('auto'),
});

export type AddLinkPayload = z.infer<typeof AddLinkPayloadSchema>;

export const RemoveLinkPayloadSchema = z.object({
  id: z.string(),
  type: z.literal('removeLink'),
  device: z.string(),
  port: z.string(),
});

// ============================================================================
// Host Configuration Commands
// ============================================================================

export const ConfigHostPayloadSchema = z.object({
  id: z.string(),
  type: z.literal('configHost'),
  device: z.string(),
  ip: z.string().optional(),
  mask: z.string().optional(),
  gateway: z.string().optional(),
  dns: z.string().optional(),
  dhcp: z.boolean().optional(),
});

// ============================================================================
// IOS Commands
// ============================================================================

export const ConfigIosPayloadSchema = z.object({
  id: z.string(),
  type: z.literal('configIos'),
  device: z.string(),
  commands: z.array(z.string()),
  save: z.boolean().default(true),
});

export const ExecIosPayloadSchema = z.object({
  id: z.string(),
  type: z.literal('execIos'),
  device: z.string(),
  command: z.string(),
  parse: z.boolean().default(true),
  timeout: z.number().default(5000),
});

// ============================================================================
// Snapshot Commands
// ============================================================================

export const SnapshotPayloadSchema = z.object({
  id: z.string(),
  type: z.literal('snapshot'),
});

export const InspectPayloadSchema = z.object({
  id: z.string(),
  type: z.literal('inspect'),
  device: z.string(),
  includeXml: z.boolean().default(false),
});

// ============================================================================
// Hardware Commands
// ============================================================================

export const HardwareInfoPayloadSchema = z.object({
  id: z.string(),
  type: z.literal('hardwareInfo'),
  device: z.string(),
});

export const HardwareCatalogPayloadSchema = z.object({
  id: z.string(),
  type: z.literal('hardwareCatalog'),
  deviceType: z.string().optional(),
});

// ============================================================================
// Command Log Commands
// ============================================================================

export const CommandLogPayloadSchema = z.object({
  id: z.string(),
  type: z.literal('commandLog'),
  device: z.string().optional(),
  limit: z.number().default(100),
});

// ============================================================================
// Union Type
// ============================================================================

export const CommandPayloadSchema = z.discriminatedUnion('type', [
  AddDevicePayloadSchema,
  RemoveDevicePayloadSchema,
  ListDevicesPayloadSchema,
  RenameDevicePayloadSchema,
  AddModulePayloadSchema,
  RemoveModulePayloadSchema,
  AddLinkPayloadSchema,
  RemoveLinkPayloadSchema,
  ConfigHostPayloadSchema,
  ConfigIosPayloadSchema,
  ExecIosPayloadSchema,
  SnapshotPayloadSchema,
  InspectPayloadSchema,
  HardwareInfoPayloadSchema,
  HardwareCatalogPayloadSchema,
  CommandLogPayloadSchema,
]);

export type CommandPayload = z.infer<typeof CommandPayloadSchema>;

// Payload type map for type-safe command handling
export interface CommandPayloadTypeMap {
  'addDevice': z.infer<typeof AddDevicePayloadSchema>;
  'removeDevice': z.infer<typeof RemoveDevicePayloadSchema>;
  'listDevices': z.infer<typeof ListDevicesPayloadSchema>;
  'renameDevice': z.infer<typeof RenameDevicePayloadSchema>;
  'addModule': z.infer<typeof AddModulePayloadSchema>;
  'removeModule': z.infer<typeof RemoveModulePayloadSchema>;
  'addLink': z.infer<typeof AddLinkPayloadSchema>;
  'removeLink': z.infer<typeof RemoveLinkPayloadSchema>;
  'configHost': z.infer<typeof ConfigHostPayloadSchema>;
  'configIos': z.infer<typeof ConfigIosPayloadSchema>;
  'execIos': z.infer<typeof ExecIosPayloadSchema>;
  'snapshot': z.infer<typeof SnapshotPayloadSchema>;
  'inspect': z.infer<typeof InspectPayloadSchema>;
  'hardwareInfo': z.infer<typeof HardwareInfoPayloadSchema>;
  'hardwareCatalog': z.infer<typeof HardwareCatalogPayloadSchema>;
  'commandLog': z.infer<typeof CommandLogPayloadSchema>;
}

export type CommandType = keyof CommandPayloadTypeMap;

// ============================================================================
// Command File Structure
// ============================================================================

export const CommandFileSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  payload: CommandPayloadSchema,
});

export type CommandFile = z.infer<typeof CommandFileSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/** Generate unique command ID */
export function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a command file structure */
export function createCommandFile(payload: CommandPayload): CommandFile {
  return {
    id: payload.id,
    timestamp: Date.now(),
    payload,
  };
}
