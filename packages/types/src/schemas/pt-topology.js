import { z } from 'zod';
/**
 * PT Control - Topology Snapshot Schemas
 * For representing real-time Packet Tracer topology state
 */
// ============================================================================
// Port Types
// ============================================================================
export const PortStateSchema = z.object({
    name: z.string(),
    type: z.string().optional(),
    status: z.enum(['up', 'down', 'administratively down']).optional(),
    protocol: z.enum(['up', 'down']).optional(),
    ipAddress: z.string().optional(),
    subnetMask: z.string().optional(),
    macAddress: z.string().optional(),
    speed: z.string().optional(),
    duplex: z.enum(['auto', 'full', 'half']).optional(),
    vlan: z.number().optional(),
    mode: z.enum(['access', 'trunk', 'dynamic', 'unknown']).optional(),
    link: z.string().optional(), // Connected device:port
});
// ============================================================================
// Device Types
// ============================================================================
export const DeviceTypeSchema = z.enum([
    'router',
    'switch',
    'switch_layer3',
    'pc',
    'server',
    'wireless_router',
    'access_point',
    'cloud',
    'multilayer_device',
    'generic',
]);
export const DeviceStateSchema = z.object({
    name: z.string(),
    displayName: z.string().optional(),
    model: z.string(),
    type: DeviceTypeSchema,
    power: z.boolean().default(true),
    x: z.number().optional(),
    y: z.number().optional(),
    uuid: z.string().optional(),
    ports: z.array(PortStateSchema).default([]),
    // IOS-specific
    hostname: z.string().optional(),
    version: z.string().optional(),
    configRegister: z.string().optional(),
    // Host-specific (PC/Server)
    ip: z.string().optional(),
    mask: z.string().optional(),
    gateway: z.string().optional(),
    dns: z.string().optional(),
    dhcp: z.boolean().optional(),
    // Wireless
    ssid: z.string().optional(),
    wirelessMode: z.string().optional(),
});
// ============================================================================
// Link Types
// ============================================================================
export const CableTypeSchema = z.enum([
    'straight',
    'cross',
    'roll',
    'fiber',
    'phone',
    'cable',
    'serial',
    'auto',
    'console',
    'wireless',
    'coaxial',
    'octal',
    'cellular',
    'usb',
    'custom_io',
]);
export const LinkStateSchema = z.object({
    id: z.string(), // device1:port1-device2:port2
    device1: z.string(),
    port1: z.string(),
    device2: z.string(),
    port2: z.string(),
    cableType: CableTypeSchema,
});
// ============================================================================
// Topology Snapshot
// ============================================================================
export const TopologySnapshotSchema = z.object({
    version: z.string().default('1.0'),
    timestamp: z.number(),
    devices: z.record(z.string(), DeviceStateSchema),
    links: z.record(z.string(), LinkStateSchema),
    metadata: z.object({
        deviceCount: z.number(),
        linkCount: z.number(),
        generatedBy: z.string().optional(),
    }).optional(),
});
// ============================================================================
// Delta Types (for diffing)
// ============================================================================
export const DeviceDeltaSchema = z.discriminatedUnion('op', [
    z.object({ op: z.literal('add'), device: DeviceStateSchema }),
    z.object({ op: z.literal('remove'), name: z.string() }),
    z.object({ op: z.literal('update'), name: z.string(), changes: z.record(z.string(), z.unknown()) }),
]);
export const LinkDeltaSchema = z.discriminatedUnion('op', [
    z.object({ op: z.literal('add'), link: LinkStateSchema }),
    z.object({ op: z.literal('remove'), id: z.string() }),
]);
export const TopologyDeltaSchema = z.object({
    from: z.number(), // timestamp
    to: z.number(), // timestamp
    devices: z.array(DeviceDeltaSchema).default([]),
    links: z.array(LinkDeltaSchema).default([]),
});
// ============================================================================
// Helper Functions
// ============================================================================
/** Create a link ID from device and port names */
export function createLinkId(device1, port1, device2, port2) {
    // Sort to ensure consistent ID regardless of direction
    const [a, b] = [`${device1}:${port1}`, `${device2}:${port2}`].sort();
    return `${a}-${b}`;
}
/** Create empty snapshot */
export function createEmptySnapshot() {
    return {
        version: '1.0',
        timestamp: Date.now(),
        devices: {},
        links: {},
        metadata: {
            deviceCount: 0,
            linkCount: 0,
        },
    };
}
/** Calculate delta between two snapshots */
export function calculateDelta(from, to) {
    const deviceDeltas = [];
    const linkDeltas = [];
    // Device changes
    const allDeviceNames = new Set([
        ...Object.keys(from.devices),
        ...Object.keys(to.devices),
    ]);
    for (const name of allDeviceNames) {
        const fromDevice = from.devices[name];
        const toDevice = to.devices[name];
        if (!fromDevice && toDevice) {
            deviceDeltas.push({ op: 'add', device: toDevice });
        }
        else if (fromDevice && !toDevice) {
            deviceDeltas.push({ op: 'remove', name });
        }
        else if (fromDevice && toDevice) {
            const changes = {};
            const allKeys = new Set([
                ...Object.keys(fromDevice),
                ...Object.keys(toDevice),
            ]);
            for (const key of allKeys) {
                if (JSON.stringify(fromDevice[key]) !==
                    JSON.stringify(toDevice[key])) {
                    changes[key] = toDevice[key];
                }
            }
            if (Object.keys(changes).length > 0) {
                deviceDeltas.push({ op: 'update', name, changes });
            }
        }
    }
    // Link changes
    const allLinkIds = new Set([
        ...Object.keys(from.links),
        ...Object.keys(to.links),
    ]);
    for (const id of allLinkIds) {
        const fromLink = from.links[id];
        const toLink = to.links[id];
        if (!fromLink && toLink) {
            linkDeltas.push({ op: 'add', link: toLink });
        }
        else if (fromLink && !toLink) {
            linkDeltas.push({ op: 'remove', id });
        }
        // Links don't have partial updates - they're either present or not
    }
    return {
        from: from.timestamp,
        to: to.timestamp,
        devices: deviceDeltas,
        links: linkDeltas,
    };
}
//# sourceMappingURL=pt-topology.js.map