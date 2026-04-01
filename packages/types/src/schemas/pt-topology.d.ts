import { z } from 'zod';
/**
 * PT Control - Topology Snapshot Schemas
 * For representing real-time Packet Tracer topology state
 */
export declare const PortStateSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        up: "up";
        down: "down";
        "administratively down": "administratively down";
    }>>;
    protocol: z.ZodOptional<z.ZodEnum<{
        up: "up";
        down: "down";
    }>>;
    ipAddress: z.ZodOptional<z.ZodString>;
    subnetMask: z.ZodOptional<z.ZodString>;
    macAddress: z.ZodOptional<z.ZodString>;
    speed: z.ZodOptional<z.ZodString>;
    duplex: z.ZodOptional<z.ZodEnum<{
        auto: "auto";
        full: "full";
        half: "half";
    }>>;
    vlan: z.ZodOptional<z.ZodNumber>;
    mode: z.ZodOptional<z.ZodEnum<{
        unknown: "unknown";
        dynamic: "dynamic";
        access: "access";
        trunk: "trunk";
    }>>;
    link: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PortState = z.infer<typeof PortStateSchema>;
export declare const DeviceTypeSchema: z.ZodEnum<{
    server: "server";
    router: "router";
    switch: "switch";
    pc: "pc";
    cloud: "cloud";
    switch_layer3: "switch_layer3";
    wireless_router: "wireless_router";
    access_point: "access_point";
    multilayer_device: "multilayer_device";
    generic: "generic";
}>;
export type DeviceType = z.infer<typeof DeviceTypeSchema>;
export declare const DeviceStateSchema: z.ZodObject<{
    name: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    model: z.ZodString;
    type: z.ZodEnum<{
        server: "server";
        router: "router";
        switch: "switch";
        pc: "pc";
        cloud: "cloud";
        switch_layer3: "switch_layer3";
        wireless_router: "wireless_router";
        access_point: "access_point";
        multilayer_device: "multilayer_device";
        generic: "generic";
    }>;
    power: z.ZodDefault<z.ZodBoolean>;
    x: z.ZodOptional<z.ZodNumber>;
    y: z.ZodOptional<z.ZodNumber>;
    uuid: z.ZodOptional<z.ZodString>;
    ports: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
            "administratively down": "administratively down";
        }>>;
        protocol: z.ZodOptional<z.ZodEnum<{
            up: "up";
            down: "down";
        }>>;
        ipAddress: z.ZodOptional<z.ZodString>;
        subnetMask: z.ZodOptional<z.ZodString>;
        macAddress: z.ZodOptional<z.ZodString>;
        speed: z.ZodOptional<z.ZodString>;
        duplex: z.ZodOptional<z.ZodEnum<{
            auto: "auto";
            full: "full";
            half: "half";
        }>>;
        vlan: z.ZodOptional<z.ZodNumber>;
        mode: z.ZodOptional<z.ZodEnum<{
            unknown: "unknown";
            dynamic: "dynamic";
            access: "access";
            trunk: "trunk";
        }>>;
        link: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    hostname: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    configRegister: z.ZodOptional<z.ZodString>;
    ip: z.ZodOptional<z.ZodString>;
    mask: z.ZodOptional<z.ZodString>;
    gateway: z.ZodOptional<z.ZodString>;
    dns: z.ZodOptional<z.ZodString>;
    dhcp: z.ZodOptional<z.ZodBoolean>;
    ssid: z.ZodOptional<z.ZodString>;
    wirelessMode: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type DeviceState = z.infer<typeof DeviceStateSchema>;
export declare const CableTypeSchema: z.ZodEnum<{
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
export type CableType = z.infer<typeof CableTypeSchema>;
export declare const LinkStateSchema: z.ZodObject<{
    id: z.ZodString;
    device1: z.ZodString;
    port1: z.ZodString;
    device2: z.ZodString;
    port2: z.ZodString;
    cableType: z.ZodEnum<{
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
}, z.core.$strip>;
export type LinkState = z.infer<typeof LinkStateSchema>;
export declare const TopologySnapshotSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodNumber;
    devices: z.ZodRecord<z.ZodString, z.ZodObject<{
        name: z.ZodString;
        displayName: z.ZodOptional<z.ZodString>;
        model: z.ZodString;
        type: z.ZodEnum<{
            server: "server";
            router: "router";
            switch: "switch";
            pc: "pc";
            cloud: "cloud";
            switch_layer3: "switch_layer3";
            wireless_router: "wireless_router";
            access_point: "access_point";
            multilayer_device: "multilayer_device";
            generic: "generic";
        }>;
        power: z.ZodDefault<z.ZodBoolean>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
        uuid: z.ZodOptional<z.ZodString>;
        ports: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                "administratively down": "administratively down";
            }>>;
            protocol: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
            }>>;
            ipAddress: z.ZodOptional<z.ZodString>;
            subnetMask: z.ZodOptional<z.ZodString>;
            macAddress: z.ZodOptional<z.ZodString>;
            speed: z.ZodOptional<z.ZodString>;
            duplex: z.ZodOptional<z.ZodEnum<{
                auto: "auto";
                full: "full";
                half: "half";
            }>>;
            vlan: z.ZodOptional<z.ZodNumber>;
            mode: z.ZodOptional<z.ZodEnum<{
                unknown: "unknown";
                dynamic: "dynamic";
                access: "access";
                trunk: "trunk";
            }>>;
            link: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        hostname: z.ZodOptional<z.ZodString>;
        version: z.ZodOptional<z.ZodString>;
        configRegister: z.ZodOptional<z.ZodString>;
        ip: z.ZodOptional<z.ZodString>;
        mask: z.ZodOptional<z.ZodString>;
        gateway: z.ZodOptional<z.ZodString>;
        dns: z.ZodOptional<z.ZodString>;
        dhcp: z.ZodOptional<z.ZodBoolean>;
        ssid: z.ZodOptional<z.ZodString>;
        wirelessMode: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    links: z.ZodRecord<z.ZodString, z.ZodObject<{
        id: z.ZodString;
        device1: z.ZodString;
        port1: z.ZodString;
        device2: z.ZodString;
        port2: z.ZodString;
        cableType: z.ZodEnum<{
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
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodObject<{
        deviceCount: z.ZodNumber;
        linkCount: z.ZodNumber;
        generatedBy: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type TopologySnapshot = z.infer<typeof TopologySnapshotSchema>;
export declare const DeviceDeltaSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    op: z.ZodLiteral<"add">;
    device: z.ZodObject<{
        name: z.ZodString;
        displayName: z.ZodOptional<z.ZodString>;
        model: z.ZodString;
        type: z.ZodEnum<{
            server: "server";
            router: "router";
            switch: "switch";
            pc: "pc";
            cloud: "cloud";
            switch_layer3: "switch_layer3";
            wireless_router: "wireless_router";
            access_point: "access_point";
            multilayer_device: "multilayer_device";
            generic: "generic";
        }>;
        power: z.ZodDefault<z.ZodBoolean>;
        x: z.ZodOptional<z.ZodNumber>;
        y: z.ZodOptional<z.ZodNumber>;
        uuid: z.ZodOptional<z.ZodString>;
        ports: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodOptional<z.ZodString>;
            status: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
                "administratively down": "administratively down";
            }>>;
            protocol: z.ZodOptional<z.ZodEnum<{
                up: "up";
                down: "down";
            }>>;
            ipAddress: z.ZodOptional<z.ZodString>;
            subnetMask: z.ZodOptional<z.ZodString>;
            macAddress: z.ZodOptional<z.ZodString>;
            speed: z.ZodOptional<z.ZodString>;
            duplex: z.ZodOptional<z.ZodEnum<{
                auto: "auto";
                full: "full";
                half: "half";
            }>>;
            vlan: z.ZodOptional<z.ZodNumber>;
            mode: z.ZodOptional<z.ZodEnum<{
                unknown: "unknown";
                dynamic: "dynamic";
                access: "access";
                trunk: "trunk";
            }>>;
            link: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        hostname: z.ZodOptional<z.ZodString>;
        version: z.ZodOptional<z.ZodString>;
        configRegister: z.ZodOptional<z.ZodString>;
        ip: z.ZodOptional<z.ZodString>;
        mask: z.ZodOptional<z.ZodString>;
        gateway: z.ZodOptional<z.ZodString>;
        dns: z.ZodOptional<z.ZodString>;
        dhcp: z.ZodOptional<z.ZodBoolean>;
        ssid: z.ZodOptional<z.ZodString>;
        wirelessMode: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    op: z.ZodLiteral<"remove">;
    name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    op: z.ZodLiteral<"update">;
    name: z.ZodString;
    changes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>], "op">;
export type DeviceDelta = z.infer<typeof DeviceDeltaSchema>;
export declare const LinkDeltaSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    op: z.ZodLiteral<"add">;
    link: z.ZodObject<{
        id: z.ZodString;
        device1: z.ZodString;
        port1: z.ZodString;
        device2: z.ZodString;
        port2: z.ZodString;
        cableType: z.ZodEnum<{
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
    }, z.core.$strip>;
}, z.core.$strip>, z.ZodObject<{
    op: z.ZodLiteral<"remove">;
    id: z.ZodString;
}, z.core.$strip>], "op">;
export type LinkDelta = z.infer<typeof LinkDeltaSchema>;
export declare const TopologyDeltaSchema: z.ZodObject<{
    from: z.ZodNumber;
    to: z.ZodNumber;
    devices: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        op: z.ZodLiteral<"add">;
        device: z.ZodObject<{
            name: z.ZodString;
            displayName: z.ZodOptional<z.ZodString>;
            model: z.ZodString;
            type: z.ZodEnum<{
                server: "server";
                router: "router";
                switch: "switch";
                pc: "pc";
                cloud: "cloud";
                switch_layer3: "switch_layer3";
                wireless_router: "wireless_router";
                access_point: "access_point";
                multilayer_device: "multilayer_device";
                generic: "generic";
            }>;
            power: z.ZodDefault<z.ZodBoolean>;
            x: z.ZodOptional<z.ZodNumber>;
            y: z.ZodOptional<z.ZodNumber>;
            uuid: z.ZodOptional<z.ZodString>;
            ports: z.ZodDefault<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodOptional<z.ZodString>;
                status: z.ZodOptional<z.ZodEnum<{
                    up: "up";
                    down: "down";
                    "administratively down": "administratively down";
                }>>;
                protocol: z.ZodOptional<z.ZodEnum<{
                    up: "up";
                    down: "down";
                }>>;
                ipAddress: z.ZodOptional<z.ZodString>;
                subnetMask: z.ZodOptional<z.ZodString>;
                macAddress: z.ZodOptional<z.ZodString>;
                speed: z.ZodOptional<z.ZodString>;
                duplex: z.ZodOptional<z.ZodEnum<{
                    auto: "auto";
                    full: "full";
                    half: "half";
                }>>;
                vlan: z.ZodOptional<z.ZodNumber>;
                mode: z.ZodOptional<z.ZodEnum<{
                    unknown: "unknown";
                    dynamic: "dynamic";
                    access: "access";
                    trunk: "trunk";
                }>>;
                link: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            hostname: z.ZodOptional<z.ZodString>;
            version: z.ZodOptional<z.ZodString>;
            configRegister: z.ZodOptional<z.ZodString>;
            ip: z.ZodOptional<z.ZodString>;
            mask: z.ZodOptional<z.ZodString>;
            gateway: z.ZodOptional<z.ZodString>;
            dns: z.ZodOptional<z.ZodString>;
            dhcp: z.ZodOptional<z.ZodBoolean>;
            ssid: z.ZodOptional<z.ZodString>;
            wirelessMode: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>, z.ZodObject<{
        op: z.ZodLiteral<"remove">;
        name: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        op: z.ZodLiteral<"update">;
        name: z.ZodString;
        changes: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>], "op">>>;
    links: z.ZodDefault<z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        op: z.ZodLiteral<"add">;
        link: z.ZodObject<{
            id: z.ZodString;
            device1: z.ZodString;
            port1: z.ZodString;
            device2: z.ZodString;
            port2: z.ZodString;
            cableType: z.ZodEnum<{
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
        }, z.core.$strip>;
    }, z.core.$strip>, z.ZodObject<{
        op: z.ZodLiteral<"remove">;
        id: z.ZodString;
    }, z.core.$strip>], "op">>>;
}, z.core.$strip>;
export type TopologyDelta = z.infer<typeof TopologyDeltaSchema>;
/** Create a link ID from device and port names */
export declare function createLinkId(device1: string, port1: string, device2: string, port2: string): string;
/** Create empty snapshot */
export declare function createEmptySnapshot(): TopologySnapshot;
/** Calculate delta between two snapshots */
export declare function calculateDelta(from: TopologySnapshot, to: TopologySnapshot): TopologyDelta;
//# sourceMappingURL=pt-topology.d.ts.map