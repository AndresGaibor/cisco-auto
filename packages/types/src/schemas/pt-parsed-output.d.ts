import { z } from 'zod';
/**
 * PT Control - Parsed IOS Output Schemas
 * For structured representation of show command output
 */
export declare const InterfaceBriefSchema: z.ZodObject<{
    interface: z.ZodString;
    ipAddress: z.ZodString;
    ok: z.ZodString;
    method: z.ZodString;
    status: z.ZodEnum<{
        up: "up";
        down: "down";
        "administratively down": "administratively down";
    }>;
    protocol: z.ZodEnum<{
        up: "up";
        down: "down";
    }>;
}, z.core.$strip>;
export declare const ShowIpInterfaceBriefSchema: z.ZodObject<{
    raw: z.ZodString;
    interfaces: z.ZodArray<z.ZodObject<{
        interface: z.ZodString;
        ipAddress: z.ZodString;
        ok: z.ZodString;
        method: z.ZodString;
        status: z.ZodEnum<{
            up: "up";
            down: "down";
            "administratively down": "administratively down";
        }>;
        protocol: z.ZodEnum<{
            up: "up";
            down: "down";
        }>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type InterfaceBrief = z.infer<typeof InterfaceBriefSchema>;
export type ShowIpInterfaceBrief = z.infer<typeof ShowIpInterfaceBriefSchema>;
export declare const InterfaceDetailSchema: z.ZodObject<{
    name: z.ZodString;
    status: z.ZodString;
    protocol: z.ZodString;
    hardware: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    ipAddress: z.ZodOptional<z.ZodString>;
    subnetMask: z.ZodOptional<z.ZodString>;
    mtu: z.ZodOptional<z.ZodNumber>;
    bandwidth: z.ZodOptional<z.ZodNumber>;
    delay: z.ZodOptional<z.ZodNumber>;
    reliability: z.ZodOptional<z.ZodString>;
    txload: z.ZodOptional<z.ZodString>;
    rxload: z.ZodOptional<z.ZodString>;
    duplex: z.ZodOptional<z.ZodString>;
    speed: z.ZodOptional<z.ZodString>;
    input: z.ZodOptional<z.ZodObject<{
        packets: z.ZodOptional<z.ZodNumber>;
        bytes: z.ZodOptional<z.ZodNumber>;
        errors: z.ZodOptional<z.ZodNumber>;
        dropped: z.ZodOptional<z.ZodNumber>;
        overruns: z.ZodOptional<z.ZodNumber>;
        frame: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    output: z.ZodOptional<z.ZodObject<{
        packets: z.ZodOptional<z.ZodNumber>;
        bytes: z.ZodOptional<z.ZodNumber>;
        errors: z.ZodOptional<z.ZodNumber>;
        dropped: z.ZodOptional<z.ZodNumber>;
        underruns: z.ZodOptional<z.ZodNumber>;
        collisions: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ShowInterfacesSchema: z.ZodObject<{
    raw: z.ZodString;
    interfaces: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        status: z.ZodString;
        protocol: z.ZodString;
        hardware: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ipAddress: z.ZodOptional<z.ZodString>;
        subnetMask: z.ZodOptional<z.ZodString>;
        mtu: z.ZodOptional<z.ZodNumber>;
        bandwidth: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        reliability: z.ZodOptional<z.ZodString>;
        txload: z.ZodOptional<z.ZodString>;
        rxload: z.ZodOptional<z.ZodString>;
        duplex: z.ZodOptional<z.ZodString>;
        speed: z.ZodOptional<z.ZodString>;
        input: z.ZodOptional<z.ZodObject<{
            packets: z.ZodOptional<z.ZodNumber>;
            bytes: z.ZodOptional<z.ZodNumber>;
            errors: z.ZodOptional<z.ZodNumber>;
            dropped: z.ZodOptional<z.ZodNumber>;
            overruns: z.ZodOptional<z.ZodNumber>;
            frame: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        output: z.ZodOptional<z.ZodObject<{
            packets: z.ZodOptional<z.ZodNumber>;
            bytes: z.ZodOptional<z.ZodNumber>;
            errors: z.ZodOptional<z.ZodNumber>;
            dropped: z.ZodOptional<z.ZodNumber>;
            underruns: z.ZodOptional<z.ZodNumber>;
            collisions: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type InterfaceDetail = z.infer<typeof InterfaceDetailSchema>;
export type ShowInterfaces = z.infer<typeof ShowInterfacesSchema>;
export declare const VlanEntrySchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    status: z.ZodEnum<{
        active: "active";
        suspended: "suspended";
        "act/unsup": "act/unsup";
    }>;
    ports: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const ShowVlanSchema: z.ZodObject<{
    raw: z.ZodString;
    vlans: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        status: z.ZodEnum<{
            active: "active";
            suspended: "suspended";
            "act/unsup": "act/unsup";
        }>;
        ports: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type VlanEntry = z.infer<typeof VlanEntrySchema>;
export type ShowVlan = z.infer<typeof ShowVlanSchema>;
export declare const TrunkPortSchema: z.ZodObject<{
    port: z.ZodString;
    mode: z.ZodString;
    encapsulation: z.ZodString;
    status: z.ZodString;
    nativeVlan: z.ZodNumber;
    allowedVlans: z.ZodArray<z.ZodNumber>;
    activeVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    pruningVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
}, z.core.$strip>;
export declare const ShowInterfacesTrunkSchema: z.ZodObject<{
    raw: z.ZodString;
    trunks: z.ZodArray<z.ZodObject<{
        port: z.ZodString;
        mode: z.ZodString;
        encapsulation: z.ZodString;
        status: z.ZodString;
        nativeVlan: z.ZodNumber;
        allowedVlans: z.ZodArray<z.ZodNumber>;
        activeVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        pruningVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type TrunkPort = z.infer<typeof TrunkPortSchema>;
export type ShowInterfacesTrunk = z.infer<typeof ShowInterfacesTrunkSchema>;
export declare const SwitchportInfoSchema: z.ZodObject<{
    interface: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    administrativeMode: z.ZodString;
    operationalMode: z.ZodString;
    administrativeTrunkingEncapsulation: z.ZodOptional<z.ZodString>;
    accessVlan: z.ZodOptional<z.ZodNumber>;
    nativeVlan: z.ZodOptional<z.ZodNumber>;
    trunkingVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    pruningVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
}, z.core.$strip>;
export declare const ShowInterfacesSwitchportSchema: z.ZodObject<{
    raw: z.ZodString;
    ports: z.ZodArray<z.ZodObject<{
        interface: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        administrativeMode: z.ZodString;
        operationalMode: z.ZodString;
        administrativeTrunkingEncapsulation: z.ZodOptional<z.ZodString>;
        accessVlan: z.ZodOptional<z.ZodNumber>;
        nativeVlan: z.ZodOptional<z.ZodNumber>;
        trunkingVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        pruningVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type SwitchportInfo = z.infer<typeof SwitchportInfoSchema>;
export type ShowInterfacesSwitchport = z.infer<typeof ShowInterfacesSwitchportSchema>;
export declare const RouteEntrySchema: z.ZodObject<{
    type: z.ZodEnum<{
        C: "C";
        L: "L";
        S: "S";
        R: "R";
        O: "O";
        D: "D";
        B: "B";
        E: "E";
        I: "I";
        M: "M";
        U: "U";
        "*": "*";
    }>;
    network: z.ZodString;
    mask: z.ZodOptional<z.ZodString>;
    administrativeDistance: z.ZodOptional<z.ZodNumber>;
    metric: z.ZodOptional<z.ZodNumber>;
    nextHop: z.ZodOptional<z.ZodString>;
    interface: z.ZodOptional<z.ZodString>;
    via: z.ZodOptional<z.ZodString>;
    age: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ShowIpRouteSchema: z.ZodObject<{
    raw: z.ZodString;
    gatewayOfLastResort: z.ZodOptional<z.ZodString>;
    routes: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            C: "C";
            L: "L";
            S: "S";
            R: "R";
            O: "O";
            D: "D";
            B: "B";
            E: "E";
            I: "I";
            M: "M";
            U: "U";
            "*": "*";
        }>;
        network: z.ZodString;
        mask: z.ZodOptional<z.ZodString>;
        administrativeDistance: z.ZodOptional<z.ZodNumber>;
        metric: z.ZodOptional<z.ZodNumber>;
        nextHop: z.ZodOptional<z.ZodString>;
        interface: z.ZodOptional<z.ZodString>;
        via: z.ZodOptional<z.ZodString>;
        age: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    legend: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>;
export type RouteEntry = z.infer<typeof RouteEntrySchema>;
export type ShowIpRoute = z.infer<typeof ShowIpRouteSchema>;
export declare const RoutingProtocolSchema: z.ZodObject<{
    name: z.ZodString;
    routerId: z.ZodOptional<z.ZodString>;
    autonomousSystem: z.ZodOptional<z.ZodNumber>;
    networks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    passiveInterfaces: z.ZodOptional<z.ZodArray<z.ZodString>>;
    routingInformationSources: z.ZodOptional<z.ZodArray<z.ZodObject<{
        ip: z.ZodString;
        from: z.ZodOptional<z.ZodString>;
        administrativeDistance: z.ZodNumber;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const ShowIpProtocolsSchema: z.ZodObject<{
    raw: z.ZodString;
    protocols: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        routerId: z.ZodOptional<z.ZodString>;
        autonomousSystem: z.ZodOptional<z.ZodNumber>;
        networks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        passiveInterfaces: z.ZodOptional<z.ZodArray<z.ZodString>>;
        routingInformationSources: z.ZodOptional<z.ZodArray<z.ZodObject<{
            ip: z.ZodString;
            from: z.ZodOptional<z.ZodString>;
            administrativeDistance: z.ZodNumber;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type RoutingProtocol = z.infer<typeof RoutingProtocolSchema>;
export type ShowIpProtocols = z.infer<typeof ShowIpProtocolsSchema>;
export declare const RunningConfigSectionSchema: z.ZodObject<{
    section: z.ZodString;
    content: z.ZodString;
}, z.core.$strip>;
export declare const ShowRunningConfigSchema: z.ZodObject<{
    raw: z.ZodString;
    hostname: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    sections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        section: z.ZodString;
        content: z.ZodString;
    }, z.core.$strip>>>;
    interfaces: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    vlans: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    routing: z.ZodOptional<z.ZodArray<z.ZodString>>;
    acls: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    ntp: z.ZodOptional<z.ZodArray<z.ZodString>>;
    lines: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type RunningConfigSection = z.infer<typeof RunningConfigSectionSchema>;
export type ShowRunningConfig = z.infer<typeof ShowRunningConfigSchema>;
export declare const ArpEntrySchema: z.ZodObject<{
    protocol: z.ZodString;
    address: z.ZodString;
    age: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
    mac: z.ZodString;
    type: z.ZodEnum<{
        ARPA: "ARPA";
        SNAP: "SNAP";
        Other: "Other";
    }>;
    interface: z.ZodString;
}, z.core.$strip>;
export declare const ShowIpArpSchema: z.ZodObject<{
    raw: z.ZodString;
    entries: z.ZodArray<z.ZodObject<{
        protocol: z.ZodString;
        address: z.ZodString;
        age: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
        mac: z.ZodString;
        type: z.ZodEnum<{
            ARPA: "ARPA";
            SNAP: "SNAP";
            Other: "Other";
        }>;
        interface: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type ArpEntry = z.infer<typeof ArpEntrySchema>;
export type ShowIpArp = z.infer<typeof ShowIpArpSchema>;
export declare const MacEntrySchema: z.ZodObject<{
    vlan: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
    macAddress: z.ZodString;
    type: z.ZodEnum<{
        static: "static";
        dynamic: "dynamic";
        secure: "secure";
        self: "self";
    }>;
    ports: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const ShowMacAddressTableSchema: z.ZodObject<{
    raw: z.ZodString;
    entries: z.ZodArray<z.ZodObject<{
        vlan: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
        macAddress: z.ZodString;
        type: z.ZodEnum<{
            static: "static";
            dynamic: "dynamic";
            secure: "secure";
            self: "self";
        }>;
        ports: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type MacEntry = z.infer<typeof MacEntrySchema>;
export type ShowMacAddressTable = z.infer<typeof ShowMacAddressTableSchema>;
export declare const StpPortSchema: z.ZodObject<{
    port: z.ZodString;
    role: z.ZodEnum<{
        root: "root";
        designated: "designated";
        alternate: "alternate";
        backup: "backup";
        edge: "edge";
    }>;
    state: z.ZodEnum<{
        forwarding: "forwarding";
        blocking: "blocking";
        learning: "learning";
        listening: "listening";
        disabled: "disabled";
    }>;
    cost: z.ZodNumber;
    priority: z.ZodNumber;
}, z.core.$strip>;
export declare const StpVlanSchema: z.ZodObject<{
    vlan: z.ZodNumber;
    bridgeId: z.ZodString;
    rootBridge: z.ZodBoolean;
    rootBridgeId: z.ZodOptional<z.ZodString>;
    rootPort: z.ZodOptional<z.ZodString>;
    interfaces: z.ZodArray<z.ZodObject<{
        port: z.ZodString;
        role: z.ZodEnum<{
            root: "root";
            designated: "designated";
            alternate: "alternate";
            backup: "backup";
            edge: "edge";
        }>;
        state: z.ZodEnum<{
            forwarding: "forwarding";
            blocking: "blocking";
            learning: "learning";
            listening: "listening";
            disabled: "disabled";
        }>;
        cost: z.ZodNumber;
        priority: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ShowSpanningTreeSchema: z.ZodObject<{
    raw: z.ZodString;
    vlans: z.ZodArray<z.ZodObject<{
        vlan: z.ZodNumber;
        bridgeId: z.ZodString;
        rootBridge: z.ZodBoolean;
        rootBridgeId: z.ZodOptional<z.ZodString>;
        rootPort: z.ZodOptional<z.ZodString>;
        interfaces: z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            role: z.ZodEnum<{
                root: "root";
                designated: "designated";
                alternate: "alternate";
                backup: "backup";
                edge: "edge";
            }>;
            state: z.ZodEnum<{
                forwarding: "forwarding";
                blocking: "blocking";
                learning: "learning";
                listening: "listening";
                disabled: "disabled";
            }>;
            cost: z.ZodNumber;
            priority: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type StpPort = z.infer<typeof StpPortSchema>;
export type StpVlan = z.infer<typeof StpVlanSchema>;
export type ShowSpanningTree = z.infer<typeof ShowSpanningTreeSchema>;
export declare const ShowVersionSchema: z.ZodObject<{
    raw: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    hostname: z.ZodOptional<z.ZodString>;
    uptime: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodString>;
    processor: z.ZodOptional<z.ZodString>;
    memory: z.ZodOptional<z.ZodString>;
    interfaces: z.ZodOptional<z.ZodArray<z.ZodString>>;
    configRegister: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ShowVersion = z.infer<typeof ShowVersionSchema>;
export declare const CdpNeighborSchema: z.ZodObject<{
    deviceId: z.ZodString;
    localInterface: z.ZodString;
    holdtime: z.ZodNumber;
    capability: z.ZodString;
    platform: z.ZodString;
    portId: z.ZodString;
}, z.core.$strip>;
export declare const ShowCdpNeighborsSchema: z.ZodObject<{
    raw: z.ZodString;
    neighbors: z.ZodArray<z.ZodObject<{
        deviceId: z.ZodString;
        localInterface: z.ZodString;
        holdtime: z.ZodNumber;
        capability: z.ZodString;
        platform: z.ZodString;
        portId: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type CdpNeighbor = z.infer<typeof CdpNeighborSchema>;
export type ShowCdpNeighbors = z.infer<typeof ShowCdpNeighborsSchema>;
export declare const ParsedOutputSchema: z.ZodUnion<readonly [z.ZodObject<{
    raw: z.ZodString;
    interfaces: z.ZodArray<z.ZodObject<{
        interface: z.ZodString;
        ipAddress: z.ZodString;
        ok: z.ZodString;
        method: z.ZodString;
        status: z.ZodEnum<{
            up: "up";
            down: "down";
            "administratively down": "administratively down";
        }>;
        protocol: z.ZodEnum<{
            up: "up";
            down: "down";
        }>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    interfaces: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        status: z.ZodString;
        protocol: z.ZodString;
        hardware: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        ipAddress: z.ZodOptional<z.ZodString>;
        subnetMask: z.ZodOptional<z.ZodString>;
        mtu: z.ZodOptional<z.ZodNumber>;
        bandwidth: z.ZodOptional<z.ZodNumber>;
        delay: z.ZodOptional<z.ZodNumber>;
        reliability: z.ZodOptional<z.ZodString>;
        txload: z.ZodOptional<z.ZodString>;
        rxload: z.ZodOptional<z.ZodString>;
        duplex: z.ZodOptional<z.ZodString>;
        speed: z.ZodOptional<z.ZodString>;
        input: z.ZodOptional<z.ZodObject<{
            packets: z.ZodOptional<z.ZodNumber>;
            bytes: z.ZodOptional<z.ZodNumber>;
            errors: z.ZodOptional<z.ZodNumber>;
            dropped: z.ZodOptional<z.ZodNumber>;
            overruns: z.ZodOptional<z.ZodNumber>;
            frame: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        output: z.ZodOptional<z.ZodObject<{
            packets: z.ZodOptional<z.ZodNumber>;
            bytes: z.ZodOptional<z.ZodNumber>;
            errors: z.ZodOptional<z.ZodNumber>;
            dropped: z.ZodOptional<z.ZodNumber>;
            underruns: z.ZodOptional<z.ZodNumber>;
            collisions: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    vlans: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        status: z.ZodEnum<{
            active: "active";
            suspended: "suspended";
            "act/unsup": "act/unsup";
        }>;
        ports: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    trunks: z.ZodArray<z.ZodObject<{
        port: z.ZodString;
        mode: z.ZodString;
        encapsulation: z.ZodString;
        status: z.ZodString;
        nativeVlan: z.ZodNumber;
        allowedVlans: z.ZodArray<z.ZodNumber>;
        activeVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        pruningVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    ports: z.ZodArray<z.ZodObject<{
        interface: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        administrativeMode: z.ZodString;
        operationalMode: z.ZodString;
        administrativeTrunkingEncapsulation: z.ZodOptional<z.ZodString>;
        accessVlan: z.ZodOptional<z.ZodNumber>;
        nativeVlan: z.ZodOptional<z.ZodNumber>;
        trunkingVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        pruningVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    gatewayOfLastResort: z.ZodOptional<z.ZodString>;
    routes: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<{
            C: "C";
            L: "L";
            S: "S";
            R: "R";
            O: "O";
            D: "D";
            B: "B";
            E: "E";
            I: "I";
            M: "M";
            U: "U";
            "*": "*";
        }>;
        network: z.ZodString;
        mask: z.ZodOptional<z.ZodString>;
        administrativeDistance: z.ZodOptional<z.ZodNumber>;
        metric: z.ZodOptional<z.ZodNumber>;
        nextHop: z.ZodOptional<z.ZodString>;
        interface: z.ZodOptional<z.ZodString>;
        via: z.ZodOptional<z.ZodString>;
        age: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    legend: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    protocols: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        routerId: z.ZodOptional<z.ZodString>;
        autonomousSystem: z.ZodOptional<z.ZodNumber>;
        networks: z.ZodOptional<z.ZodArray<z.ZodString>>;
        passiveInterfaces: z.ZodOptional<z.ZodArray<z.ZodString>>;
        routingInformationSources: z.ZodOptional<z.ZodArray<z.ZodObject<{
            ip: z.ZodString;
            from: z.ZodOptional<z.ZodString>;
            administrativeDistance: z.ZodNumber;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    hostname: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    sections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        section: z.ZodString;
        content: z.ZodString;
    }, z.core.$strip>>>;
    interfaces: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    vlans: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    routing: z.ZodOptional<z.ZodArray<z.ZodString>>;
    acls: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    ntp: z.ZodOptional<z.ZodArray<z.ZodString>>;
    lines: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    entries: z.ZodArray<z.ZodObject<{
        protocol: z.ZodString;
        address: z.ZodString;
        age: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
        mac: z.ZodString;
        type: z.ZodEnum<{
            ARPA: "ARPA";
            SNAP: "SNAP";
            Other: "Other";
        }>;
        interface: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    entries: z.ZodArray<z.ZodObject<{
        vlan: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
        macAddress: z.ZodString;
        type: z.ZodEnum<{
            static: "static";
            dynamic: "dynamic";
            secure: "secure";
            self: "self";
        }>;
        ports: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    vlans: z.ZodArray<z.ZodObject<{
        vlan: z.ZodNumber;
        bridgeId: z.ZodString;
        rootBridge: z.ZodBoolean;
        rootBridgeId: z.ZodOptional<z.ZodString>;
        rootPort: z.ZodOptional<z.ZodString>;
        interfaces: z.ZodArray<z.ZodObject<{
            port: z.ZodString;
            role: z.ZodEnum<{
                root: "root";
                designated: "designated";
                alternate: "alternate";
                backup: "backup";
                edge: "edge";
            }>;
            state: z.ZodEnum<{
                forwarding: "forwarding";
                blocking: "blocking";
                learning: "learning";
                listening: "listening";
                disabled: "disabled";
            }>;
            cost: z.ZodNumber;
            priority: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    hostname: z.ZodOptional<z.ZodString>;
    uptime: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodString>;
    processor: z.ZodOptional<z.ZodString>;
    memory: z.ZodOptional<z.ZodString>;
    interfaces: z.ZodOptional<z.ZodArray<z.ZodString>>;
    configRegister: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    raw: z.ZodString;
    neighbors: z.ZodArray<z.ZodObject<{
        deviceId: z.ZodString;
        localInterface: z.ZodString;
        holdtime: z.ZodNumber;
        capability: z.ZodString;
        platform: z.ZodString;
        portId: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>]>;
export type ParsedOutput = z.infer<typeof ParsedOutputSchema>;
export type ParserFunction = (output: string) => ParsedOutput;
export interface ParserRegistry {
    'show ip interface brief': ParserFunction;
    'show interfaces': ParserFunction;
    'show vlan': ParserFunction;
    'show vlan brief': ParserFunction;
    'show interfaces trunk': ParserFunction;
    'show interfaces switchport': ParserFunction;
    'show ip route': ParserFunction;
    'show ip protocols': ParserFunction;
    'show running-config': ParserFunction;
    'show ip arp': ParserFunction;
    'show mac address-table': ParserFunction;
    'show spanning-tree': ParserFunction;
    'show version': ParserFunction;
    'show cdp neighbors': ParserFunction;
}
//# sourceMappingURL=pt-parsed-output.d.ts.map