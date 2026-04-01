import { z } from 'zod';
/**
 * PT Control - Command Payload Schemas
 * For commands sent from CLI to Packet Tracer
 */
// ============================================================================
// Base Types
// ============================================================================
export const CommandBaseSchema = z.object({
    id: z.string(),
    type: z.string(),
});
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
export const LinkTypeSchema = z.enum([
    'straight', 'cross', 'roll', 'fiber', 'phone',
    'cable', 'serial', 'auto', 'console', 'wireless',
    'coaxial', 'octal', 'cellular', 'usb', 'custom_io'
]);
export const AddLinkPayloadSchema = z.object({
    id: z.string(),
    type: z.literal('addLink'),
    device1: z.string(),
    port1: z.string(),
    device2: z.string(),
    port2: z.string(),
    linkType: LinkTypeSchema.default('auto'),
});
export const AddLinkPayloadRawSchema = z.object({
    id: z.string(),
    type: z.literal('addLink'),
    port1: z.string(),
    port2: z.string(),
    device1: z.string().optional(),
    device2: z.string().optional(),
    dev1: z.string().optional(),
    dev2: z.string().optional(),
    linkType: LinkTypeSchema.optional(),
    cableType: LinkTypeSchema.optional(),
});
export function parseAddLinkPayload(input) {
    if (!input.device1 && !input.dev1) {
        throw new Error('Either device1 (v2) or dev1 (legacy) must be provided');
    }
    if (!input.device2 && !input.dev2) {
        throw new Error('Either device2 (v2) or dev2 (legacy) must be provided');
    }
    return {
        id: input.id,
        type: 'addLink',
        device1: input.device1 || input.dev1,
        port1: input.port1,
        device2: input.device2 || input.dev2,
        port2: input.port2,
        linkType: input.linkType || input.cableType || 'auto',
    };
}
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
// Canvas/Rect Commands
// ============================================================================
export const ListCanvasRectsPayloadSchema = z.object({
    id: z.string(),
    type: z.literal('listCanvasRects'),
});
export const GetRectPayloadSchema = z.object({
    id: z.string(),
    type: z.literal('getRect'),
    rectId: z.string(),
});
export const DevicesInRectPayloadSchema = z.object({
    id: z.string(),
    type: z.literal('devicesInRect'),
    rectId: z.string(),
    includeClusters: z.boolean().default(false),
});
export const ResolveCapabilitiesPayloadSchema = z.object({
    id: z.string(),
    type: z.literal('resolveCapabilities'),
    device: z.string(),
});
export const ExecInteractivePayloadSchema = z.object({
    id: z.string(),
    type: z.literal('execInteractive'),
    device: z.string(),
    command: z.string(),
    options: z.object({
        timeout: z.number().default(30000),
        parse: z.boolean().default(true),
        ensurePrivileged: z.boolean().default(false),
    }).optional(),
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
    ListCanvasRectsPayloadSchema,
    GetRectPayloadSchema,
    DevicesInRectPayloadSchema,
    ResolveCapabilitiesPayloadSchema,
    ExecInteractivePayloadSchema,
]);
// ============================================================================
// Command File Structure
// ============================================================================
export const CommandFileSchema = z.object({
    id: z.string(),
    timestamp: z.number(),
    payload: CommandPayloadSchema,
});
// ============================================================================
// Helper Functions
// ============================================================================
/** Generate unique command ID */
export function generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
/** Create a command file structure */
export function createCommandFile(payload) {
    return {
        id: payload.id,
        timestamp: Date.now(),
        payload,
    };
}
//# sourceMappingURL=pt-commands.js.map