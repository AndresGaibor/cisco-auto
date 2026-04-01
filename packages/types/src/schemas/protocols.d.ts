import { z } from 'zod';
/**
 * Protocol Schemas - Routing and switching protocols
 * Single Source of Truth for OSPF, EIGRP, VTP schemas
 */
export declare const OSPFSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const EIGRPSchema: z.ZodObject<{
    autonomousSystem: z.ZodNumber;
    routerId: z.ZodOptional<z.ZodString>;
    networks: z.ZodArray<z.ZodString>;
    passiveInterfaces: z.ZodOptional<z.ZodArray<z.ZodString>>;
    noAutoSummary: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const VTPSchema: z.ZodObject<{
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
}, z.core.$strip>;
export type OSPF = z.infer<typeof OSPFSchema>;
export type EIGRP = z.infer<typeof EIGRPSchema>;
export type VTP = z.infer<typeof VTPSchema>;
//# sourceMappingURL=protocols.d.ts.map