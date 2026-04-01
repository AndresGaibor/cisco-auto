import { z } from 'zod';
/**
 * Lab Schemas - Laboratory topology and validation
 * Single Source of Truth for lab-related schemas
 */
export declare const ConnectionSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    fromInterface: z.ZodString;
    toInterface: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<{
        ethernet: "ethernet";
        serial: "serial";
        console: "console";
        coaxial: "coaxial";
        fiber: "fiber";
        wireless: "wireless";
    }>>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ValidationSchema: z.ZodObject<{
    connectivity: z.ZodOptional<z.ZodArray<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
        expected: z.ZodDefault<z.ZodEnum<{
            success: "success";
            fail: "fail";
        }>>;
        protocol: z.ZodDefault<z.ZodEnum<{
            tcp: "tcp";
            udp: "udp";
            icmp: "icmp";
        }>>;
    }, z.core.$strip>>>;
    routing: z.ZodOptional<z.ZodArray<z.ZodObject<{
        device: z.ZodString;
        protocol: z.ZodOptional<z.ZodEnum<{
            static: "static";
            ospf: "ospf";
            eigrp: "eigrp";
            bgp: "bgp";
        }>>;
        expectedRoutes: z.ZodNumber;
    }, z.core.$strip>>>;
    vlans: z.ZodOptional<z.ZodArray<z.ZodObject<{
        switch: z.ZodString;
        vlanId: z.ZodNumber;
        expectedPorts: z.ZodNumber;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const LabSchema: z.ZodObject<{
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        version: z.ZodDefault<z.ZodString>;
        author: z.ZodOptional<z.ZodString>;
        difficulty: z.ZodDefault<z.ZodEnum<{
            beginner: "beginner";
            intermediate: "intermediate";
            advanced: "advanced";
        }>>;
        estimatedTime: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    topology: z.ZodObject<{
        devices: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodEnum<{
                server: "server";
                router: "router";
                switch: "switch";
                "multilayer-switch": "multilayer-switch";
                pc: "pc";
                "access-point": "access-point";
                firewall: "firewall";
                cloud: "cloud";
                modem: "modem";
                printer: "printer";
                "wireless-router": "wireless-router";
            }>;
            model: z.ZodOptional<z.ZodString>;
            iosVersion: z.ZodOptional<z.ZodString>;
            hostname: z.ZodOptional<z.ZodString>;
            management: z.ZodOptional<z.ZodObject<{
                ip: z.ZodString;
                subnetMask: z.ZodString;
                gateway: z.ZodOptional<z.ZodString>;
                vlan: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>>;
            ssh: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                version: z.ZodDefault<z.ZodNumber>;
                port: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>>;
            telnet: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                port: z.ZodDefault<z.ZodNumber>;
            }, z.core.$strip>>;
            credentials: z.ZodOptional<z.ZodObject<{
                username: z.ZodDefault<z.ZodString>;
                password: z.ZodString;
                enablePassword: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            interfaces: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodDefault<z.ZodEnum<{
                    ethernet: "ethernet";
                    fastethernet: "fastethernet";
                    gigabitethernet: "gigabitethernet";
                    serial: "serial";
                    loopback: "loopback";
                    vlan: "vlan";
                    tunnel: "tunnel";
                }>>;
                ip: z.ZodOptional<z.ZodString>;
                description: z.ZodOptional<z.ZodString>;
                enabled: z.ZodDefault<z.ZodBoolean>;
                shutdown: z.ZodDefault<z.ZodBoolean>;
                vlan: z.ZodOptional<z.ZodNumber>;
                mode: z.ZodOptional<z.ZodEnum<{
                    access: "access";
                    trunk: "trunk";
                    routed: "routed";
                }>>;
                trunkAllowedVlans: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
                encapsulation: z.ZodOptional<z.ZodEnum<{
                    dot1q: "dot1q";
                    isl: "isl";
                }>>;
                duplex: z.ZodDefault<z.ZodEnum<{
                    auto: "auto";
                    full: "full";
                    half: "half";
                }>>;
                speed: z.ZodDefault<z.ZodUnion<readonly [z.ZodNumber, z.ZodEnum<{
                    auto: "auto";
                }>]>>;
                macAddress: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>>;
            vlans: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodNumber;
                name: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
                ports: z.ZodOptional<z.ZodArray<z.ZodString>>;
                ip: z.ZodOptional<z.ZodString>;
                active: z.ZodDefault<z.ZodBoolean>;
            }, z.core.$strip>>>;
            vtp: z.ZodOptional<z.ZodObject<{
                domain: z.ZodString;
                mode: z.ZodDefault<z.ZodEnum<{
                    server: "server";
                    client: "client";
                    transparent: "transparent";
                }>>;
                version: z.ZodDefault<z.ZodEnum<{
                    1: "1";
                    2: "2";
                    3: "3";
                }>>;
                password: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            routing: z.ZodOptional<z.ZodObject<{
                static: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    network: z.ZodString;
                    nextHop: z.ZodUnion<readonly [z.ZodString, z.ZodLiteral<"null0">]>;
                    administrativeDistance: z.ZodDefault<z.ZodNumber>;
                    description: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
                ospf: z.ZodOptional<z.ZodObject<{
                    processId: z.ZodDefault<z.ZodNumber>;
                    routerId: z.ZodOptional<z.ZodString>;
                    networks: z.ZodArray<z.ZodObject<{
                        network: z.ZodString;
                        area: z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>;
                        areaType: z.ZodOptional<z.ZodEnum<{
                            standard: "standard";
                            stub: "stub";
                            "totally-stubby": "totally-stubby";
                            nssa: "nssa";
                            "totally-nssa": "totally-nssa";
                        }>>;
                    }, z.core.$strip>>;
                    defaultRoute: z.ZodDefault<z.ZodBoolean>;
                    passiveInterfaces: z.ZodOptional<z.ZodArray<z.ZodString>>;
                }, z.core.$strip>>;
                eigrp: z.ZodOptional<z.ZodObject<{
                    autonomousSystem: z.ZodNumber;
                    routerId: z.ZodOptional<z.ZodString>;
                    networks: z.ZodArray<z.ZodString>;
                    passiveInterfaces: z.ZodOptional<z.ZodArray<z.ZodString>>;
                    noAutoSummary: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
            acls: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                type: z.ZodDefault<z.ZodEnum<{
                    standard: "standard";
                    extended: "extended";
                }>>;
                entries: z.ZodArray<z.ZodObject<{
                    action: z.ZodEnum<{
                        permit: "permit";
                        deny: "deny";
                    }>;
                    protocol: z.ZodDefault<z.ZodEnum<{
                        ip: "ip";
                        tcp: "tcp";
                        udp: "udp";
                        icmp: "icmp";
                    }>>;
                    source: z.ZodString;
                    sourceWildcard: z.ZodOptional<z.ZodString>;
                    destination: z.ZodOptional<z.ZodString>;
                    destinationWildcard: z.ZodOptional<z.ZodString>;
                    port: z.ZodOptional<z.ZodString>;
                    log: z.ZodDefault<z.ZodBoolean>;
                }, z.core.$strip>>;
            }, z.core.$strip>>>;
            nat: z.ZodOptional<z.ZodObject<{
                type: z.ZodEnum<{
                    static: "static";
                    dynamic: "dynamic";
                    overload: "overload";
                }>;
                insideInterface: z.ZodString;
                outsideInterface: z.ZodString;
                mappings: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    insideLocal: z.ZodString;
                    insideGlobal: z.ZodOptional<z.ZodString>;
                    poolName: z.ZodOptional<z.ZodString>;
                }, z.core.$strip>>>;
                pool: z.ZodOptional<z.ZodObject<{
                    name: z.ZodString;
                    startIp: z.ZodString;
                    endIp: z.ZodString;
                    netmask: z.ZodString;
                }, z.core.$strip>>;
                acl: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>>;
            lines: z.ZodOptional<z.ZodObject<{
                console: z.ZodOptional<z.ZodObject<{
                    password: z.ZodOptional<z.ZodString>;
                    login: z.ZodDefault<z.ZodBoolean>;
                    execTimeout: z.ZodDefault<z.ZodNumber>;
                }, z.core.$strip>>;
                vty: z.ZodOptional<z.ZodObject<{
                    start: z.ZodDefault<z.ZodNumber>;
                    end: z.ZodDefault<z.ZodNumber>;
                    password: z.ZodOptional<z.ZodString>;
                    login: z.ZodDefault<z.ZodBoolean>;
                    transportInput: z.ZodDefault<z.ZodEnum<{
                        ssh: "ssh";
                        telnet: "telnet";
                        all: "all";
                        none: "none";
                    }>>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        connections: z.ZodOptional<z.ZodArray<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            fromInterface: z.ZodString;
            toInterface: z.ZodString;
            type: z.ZodDefault<z.ZodEnum<{
                ethernet: "ethernet";
                serial: "serial";
                console: "console";
                coaxial: "coaxial";
                fiber: "fiber";
                wireless: "wireless";
            }>>;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
    objectives: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        points: z.ZodDefault<z.ZodNumber>;
        validation: z.ZodDefault<z.ZodEnum<{
            connectivity: "connectivity";
            configuration: "configuration";
            show_command: "show_command";
        }>>;
    }, z.core.$strip>>>;
    validation: z.ZodOptional<z.ZodObject<{
        connectivity: z.ZodOptional<z.ZodArray<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
            expected: z.ZodDefault<z.ZodEnum<{
                success: "success";
                fail: "fail";
            }>>;
            protocol: z.ZodDefault<z.ZodEnum<{
                tcp: "tcp";
                udp: "udp";
                icmp: "icmp";
            }>>;
        }, z.core.$strip>>>;
        routing: z.ZodOptional<z.ZodArray<z.ZodObject<{
            device: z.ZodString;
            protocol: z.ZodOptional<z.ZodEnum<{
                static: "static";
                ospf: "ospf";
                eigrp: "eigrp";
                bgp: "bgp";
            }>>;
            expectedRoutes: z.ZodNumber;
        }, z.core.$strip>>>;
        vlans: z.ZodOptional<z.ZodArray<z.ZodObject<{
            switch: z.ZodString;
            vlanId: z.ZodNumber;
            expectedPorts: z.ZodNumber;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    instructions: z.ZodOptional<z.ZodString>;
    resources: z.ZodOptional<z.ZodObject<{
        pkaFile: z.ZodOptional<z.ZodString>;
        pktFile: z.ZodOptional<z.ZodString>;
        solution: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare function zodValidateLab(data: unknown): Lab;
export declare function validateLabSafe(data: unknown): {
    success: boolean;
    data?: Lab;
    errors?: string[];
};
export type Connection = z.infer<typeof ConnectionSchema>;
export type Validation = z.infer<typeof ValidationSchema>;
export type Lab = z.infer<typeof LabSchema>;
//# sourceMappingURL=lab.d.ts.map