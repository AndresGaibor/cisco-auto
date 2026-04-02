/**
 * PT Control - Command Payload Types
 * 
 * @deprecated Import directly from @cisco-auto/types instead
 * This file is kept for backwards compatibility during migration
 */

// Re-export from @cisco-auto/types for backwards compatibility
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
} from '@cisco-auto/types/schemas/pt-commands';

// Re-export the type map interface (not a Zod schema)
export interface PTControlCommandPayloadTypeMap {
  'addDevice': z.infer<typeof AddDevicePayloadSchema>;
  'removeDevice': z.infer<typeof RemoveDevicePayloadSchema>;
  'listDevices': z.infer<typeof ListDevicesPayloadSchema>;
  'renameDevice': z.infer<typeof RenameDevicePayloadSchema>;
  'moveDevice': z.infer<typeof MoveDevicePayloadSchema>;
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
  'listCanvasRects': z.infer<typeof ListCanvasRectsPayloadSchema>;
  'getRect': z.infer<typeof GetRectPayloadSchema>;
  'devicesInRect': z.infer<typeof DevicesInRectPayloadSchema>;
  'resolveCapabilities': z.infer<typeof ResolveCapabilitiesPayloadSchema>;
  'execInteractive': z.infer<typeof ExecInteractivePayloadSchema>;
}

import type { z } from 'zod';
import {
  AddDevicePayloadSchema,
  RemoveDevicePayloadSchema,
  ListDevicesPayloadSchema,
  RenameDevicePayloadSchema,
  MoveDevicePayloadSchema,
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
  ListCanvasRectsPayloadSchema,
  GetRectPayloadSchema,
  DevicesInRectPayloadSchema,
  ResolveCapabilitiesPayloadSchema,
  ExecInteractivePayloadSchema,
} from '@cisco-auto/types/schemas/pt-commands';
