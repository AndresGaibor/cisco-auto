import { z } from 'zod';
/**
 * Security Schemas - ACLs and NAT configuration
 * Single Source of Truth for security-related schemas
 */
export declare const ACLSchema: z.ZodObject<{
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
}, z.core.$strip>;
export declare const NATSchema: z.ZodObject<{
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
}, z.core.$strip>;
export type ACL = z.infer<typeof ACLSchema>;
export type NAT = z.infer<typeof NATSchema>;
//# sourceMappingURL=security.d.ts.map