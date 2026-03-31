import { z } from 'zod';

/**
 * Common Schemas - Base types used across the monorepo
 * Single Source of Truth for IP, MAC, and other common validations
 */

// Schema para dirección IP con CIDR
export const IPCidrSchema = z.string().regex(
  /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/,
  'Debe ser una dirección IP válida con máscara CIDR (ej: 192.168.1.1/24)'
);

// Schema para dirección IP sin CIDR
export const IPAddressSchema = z.string().regex(
  /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  'Debe ser una dirección IP válida (ej: 192.168.1.1)'
);

// Schema para dirección MAC
export const MACAddressSchema = z.string().regex(
  /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
  'Debe ser una dirección MAC válida (ej: AA:BB:CC:DD:EE:FF)'
);

// Type exports
export type IPCidr = z.infer<typeof IPCidrSchema>;
export type IPAddress = z.infer<typeof IPAddressSchema>;
export type MACAddress = z.infer<typeof MACAddressSchema>;
