import { z } from 'zod';
/**
 * Common Schemas - Base types used across the monorepo
 * Single Source of Truth for IP, MAC, and other common validations
 */
export declare const IPCidrSchema: z.ZodString;
export declare const IPAddressSchema: z.ZodString;
export declare const MACAddressSchema: z.ZodString;
export type IPCidr = z.infer<typeof IPCidrSchema>;
export type IPAddress = z.infer<typeof IPAddressSchema>;
export type MACAddress = z.infer<typeof MACAddressSchema>;
//# sourceMappingURL=common.d.ts.map