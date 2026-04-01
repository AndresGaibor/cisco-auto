import { z } from 'zod';
/**
 * PT Control - Command Payload Schemas
 * For commands sent from CLI to Packet Tracer
 */
export declare const CommandBaseSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
}, z.core.$strip>;
export type CommandBase = z.infer<typeof CommandBaseSchema>;
export declare const AddDevicePayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"addDevice">;
    name: z.ZodString;
    model: z.ZodString;
    x: z.ZodDefault<z.ZodNumber>;
    y: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const RemoveDevicePayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"removeDevice">;
    name: z.ZodString;
}, z.core.$strip>;
export declare const ListDevicesPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"listDevices">;
    filter: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString>]>>;
    startsWith: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const RenameDevicePayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"renameDevice">;
    oldName: z.ZodString;
    newName: z.ZodString;
}, z.core.$strip>;
export declare const AddModulePayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"addModule">;
    device: z.ZodString;
    slot: z.ZodNumber;
    module: z.ZodString;
}, z.core.$strip>;
export declare const RemoveModulePayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"removeModule">;
    device: z.ZodString;
    slot: z.ZodNumber;
}, z.core.$strip>;
export declare const LinkTypeSchema: z.ZodEnum<{
    serial: "serial";
    auto: "auto";
    console: "console";
    coaxial: "coaxial";
    fiber: "fiber";
    wireless: "wireless";
    straight: "straight";
    cross: "cross";
    roll: "roll";
    phone: "phone";
    cable: "cable";
    octal: "octal";
    cellular: "cellular";
    usb: "usb";
    custom_io: "custom_io";
}>;
export declare const AddLinkPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"addLink">;
    device1: z.ZodString;
    port1: z.ZodString;
    device2: z.ZodString;
    port2: z.ZodString;
    linkType: z.ZodDefault<z.ZodEnum<{
        serial: "serial";
        auto: "auto";
        console: "console";
        coaxial: "coaxial";
        fiber: "fiber";
        wireless: "wireless";
        straight: "straight";
        cross: "cross";
        roll: "roll";
        phone: "phone";
        cable: "cable";
        octal: "octal";
        cellular: "cellular";
        usb: "usb";
        custom_io: "custom_io";
    }>>;
}, z.core.$strip>;
export type AddLinkPayload = z.infer<typeof AddLinkPayloadSchema>;
export declare const AddLinkPayloadRawSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"addLink">;
    port1: z.ZodString;
    port2: z.ZodString;
    device1: z.ZodOptional<z.ZodString>;
    device2: z.ZodOptional<z.ZodString>;
    dev1: z.ZodOptional<z.ZodString>;
    dev2: z.ZodOptional<z.ZodString>;
    linkType: z.ZodOptional<z.ZodEnum<{
        serial: "serial";
        auto: "auto";
        console: "console";
        coaxial: "coaxial";
        fiber: "fiber";
        wireless: "wireless";
        straight: "straight";
        cross: "cross";
        roll: "roll";
        phone: "phone";
        cable: "cable";
        octal: "octal";
        cellular: "cellular";
        usb: "usb";
        custom_io: "custom_io";
    }>>;
    cableType: z.ZodOptional<z.ZodEnum<{
        serial: "serial";
        auto: "auto";
        console: "console";
        coaxial: "coaxial";
        fiber: "fiber";
        wireless: "wireless";
        straight: "straight";
        cross: "cross";
        roll: "roll";
        phone: "phone";
        cable: "cable";
        octal: "octal";
        cellular: "cellular";
        usb: "usb";
        custom_io: "custom_io";
    }>>;
}, z.core.$strip>;
export type AddLinkPayloadRaw = z.infer<typeof AddLinkPayloadRawSchema>;
export declare function parseAddLinkPayload(input: AddLinkPayloadRaw): AddLinkPayload;
export declare const RemoveLinkPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"removeLink">;
    device: z.ZodString;
    port: z.ZodString;
}, z.core.$strip>;
export declare const ConfigHostPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"configHost">;
    device: z.ZodString;
    ip: z.ZodOptional<z.ZodString>;
    mask: z.ZodOptional<z.ZodString>;
    gateway: z.ZodOptional<z.ZodString>;
    dns: z.ZodOptional<z.ZodString>;
    dhcp: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const ConfigIosPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"configIos">;
    device: z.ZodString;
    commands: z.ZodArray<z.ZodString>;
    save: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const ExecIosPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"execIos">;
    device: z.ZodString;
    command: z.ZodString;
    parse: z.ZodDefault<z.ZodBoolean>;
    timeout: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const SnapshotPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"snapshot">;
}, z.core.$strip>;
export declare const InspectPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"inspect">;
    device: z.ZodString;
    includeXml: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const ListCanvasRectsPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"listCanvasRects">;
}, z.core.$strip>;
export declare const GetRectPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"getRect">;
    rectId: z.ZodString;
}, z.core.$strip>;
export declare const DevicesInRectPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"devicesInRect">;
    rectId: z.ZodString;
    includeClusters: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const ResolveCapabilitiesPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"resolveCapabilities">;
    device: z.ZodString;
}, z.core.$strip>;
export declare const ExecInteractivePayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"execInteractive">;
    device: z.ZodString;
    command: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        timeout: z.ZodDefault<z.ZodNumber>;
        parse: z.ZodDefault<z.ZodBoolean>;
        ensurePrivileged: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const HardwareInfoPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"hardwareInfo">;
    device: z.ZodString;
}, z.core.$strip>;
export declare const HardwareCatalogPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"hardwareCatalog">;
    deviceType: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const CommandLogPayloadSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"commandLog">;
    device: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const CommandPayloadSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"addDevice">;
    name: z.ZodString;
    model: z.ZodString;
    x: z.ZodDefault<z.ZodNumber>;
    y: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"removeDevice">;
    name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"listDevices">;
    filter: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString>]>>;
    startsWith: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"renameDevice">;
    oldName: z.ZodString;
    newName: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"addModule">;
    device: z.ZodString;
    slot: z.ZodNumber;
    module: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"removeModule">;
    device: z.ZodString;
    slot: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"addLink">;
    device1: z.ZodString;
    port1: z.ZodString;
    device2: z.ZodString;
    port2: z.ZodString;
    linkType: z.ZodDefault<z.ZodEnum<{
        serial: "serial";
        auto: "auto";
        console: "console";
        coaxial: "coaxial";
        fiber: "fiber";
        wireless: "wireless";
        straight: "straight";
        cross: "cross";
        roll: "roll";
        phone: "phone";
        cable: "cable";
        octal: "octal";
        cellular: "cellular";
        usb: "usb";
        custom_io: "custom_io";
    }>>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"removeLink">;
    device: z.ZodString;
    port: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"configHost">;
    device: z.ZodString;
    ip: z.ZodOptional<z.ZodString>;
    mask: z.ZodOptional<z.ZodString>;
    gateway: z.ZodOptional<z.ZodString>;
    dns: z.ZodOptional<z.ZodString>;
    dhcp: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"configIos">;
    device: z.ZodString;
    commands: z.ZodArray<z.ZodString>;
    save: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"execIos">;
    device: z.ZodString;
    command: z.ZodString;
    parse: z.ZodDefault<z.ZodBoolean>;
    timeout: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"snapshot">;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"inspect">;
    device: z.ZodString;
    includeXml: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"hardwareInfo">;
    device: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"hardwareCatalog">;
    deviceType: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"commandLog">;
    device: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"listCanvasRects">;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"getRect">;
    rectId: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"devicesInRect">;
    rectId: z.ZodString;
    includeClusters: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"resolveCapabilities">;
    device: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    type: z.ZodLiteral<"execInteractive">;
    device: z.ZodString;
    command: z.ZodString;
    options: z.ZodOptional<z.ZodObject<{
        timeout: z.ZodDefault<z.ZodNumber>;
        parse: z.ZodDefault<z.ZodBoolean>;
        ensurePrivileged: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>], "type">;
export type CommandPayload = z.infer<typeof CommandPayloadSchema>;
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
    'listCanvasRects': z.infer<typeof ListCanvasRectsPayloadSchema>;
    'getRect': z.infer<typeof GetRectPayloadSchema>;
    'devicesInRect': z.infer<typeof DevicesInRectPayloadSchema>;
    'resolveCapabilities': z.infer<typeof ResolveCapabilitiesPayloadSchema>;
    'execInteractive': z.infer<typeof ExecInteractivePayloadSchema>;
}
export type CommandType = keyof CommandPayloadTypeMap;
export declare const CommandFileSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodNumber;
    payload: z.ZodDiscriminatedUnion<[z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"addDevice">;
        name: z.ZodString;
        model: z.ZodString;
        x: z.ZodDefault<z.ZodNumber>;
        y: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"removeDevice">;
        name: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"listDevices">;
        filter: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodArray<z.ZodString>]>>;
        startsWith: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"renameDevice">;
        oldName: z.ZodString;
        newName: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"addModule">;
        device: z.ZodString;
        slot: z.ZodNumber;
        module: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"removeModule">;
        device: z.ZodString;
        slot: z.ZodNumber;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"addLink">;
        device1: z.ZodString;
        port1: z.ZodString;
        device2: z.ZodString;
        port2: z.ZodString;
        linkType: z.ZodDefault<z.ZodEnum<{
            serial: "serial";
            auto: "auto";
            console: "console";
            coaxial: "coaxial";
            fiber: "fiber";
            wireless: "wireless";
            straight: "straight";
            cross: "cross";
            roll: "roll";
            phone: "phone";
            cable: "cable";
            octal: "octal";
            cellular: "cellular";
            usb: "usb";
            custom_io: "custom_io";
        }>>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"removeLink">;
        device: z.ZodString;
        port: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"configHost">;
        device: z.ZodString;
        ip: z.ZodOptional<z.ZodString>;
        mask: z.ZodOptional<z.ZodString>;
        gateway: z.ZodOptional<z.ZodString>;
        dns: z.ZodOptional<z.ZodString>;
        dhcp: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"configIos">;
        device: z.ZodString;
        commands: z.ZodArray<z.ZodString>;
        save: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"execIos">;
        device: z.ZodString;
        command: z.ZodString;
        parse: z.ZodDefault<z.ZodBoolean>;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"snapshot">;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"inspect">;
        device: z.ZodString;
        includeXml: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"hardwareInfo">;
        device: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"hardwareCatalog">;
        deviceType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"commandLog">;
        device: z.ZodOptional<z.ZodString>;
        limit: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"listCanvasRects">;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"getRect">;
        rectId: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"devicesInRect">;
        rectId: z.ZodString;
        includeClusters: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"resolveCapabilities">;
        device: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"execInteractive">;
        device: z.ZodString;
        command: z.ZodString;
        options: z.ZodOptional<z.ZodObject<{
            timeout: z.ZodDefault<z.ZodNumber>;
            parse: z.ZodDefault<z.ZodBoolean>;
            ensurePrivileged: z.ZodDefault<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>], "type">;
}, z.core.$strip>;
export type CommandFile = z.infer<typeof CommandFileSchema>;
/** Generate unique command ID */
export declare function generateCommandId(): string;
/** Create a command file structure */
export declare function createCommandFile(payload: CommandPayload): CommandFile;
//# sourceMappingURL=pt-commands.d.ts.map