import { z } from 'zod';
import { IPAddressSchema, IPCidrSchema } from './common.js';

/**
 * Protocol Schemas - Routing and switching protocols
 * Single Source of Truth for OSPF, EIGRP, VTP schemas
 */

// Schema para enrutamiento OSPF
export const OSPFSchema = z.object({
  processId: z.number().default(1).describe('ID del proceso OSPF'),
  routerId: IPAddressSchema.optional().describe('Router ID (dirección IP)'),
  networks: z.array(z.object({
    network: IPCidrSchema.describe('Red con wildcard mask (ej: 10.0.0.0/0.0.0.255)'),
    area: z.union([z.number(), IPAddressSchema]).describe('Área OSPF'),
    areaType: z.enum(['standard', 'stub', 'totally-stubby', 'nssa', 'totally-nssa']).optional()
  })),
  defaultRoute: z.boolean().default(false).describe('Advertise default route'),
  passiveInterfaces: z.array(z.string()).optional()
});

// Schema para enrutamiento EIGRP
export const EIGRPSchema = z.object({
  autonomousSystem: z.number().describe('Número de sistema autónomo EIGRP'),
  routerId: IPAddressSchema.optional(),
  networks: z.array(IPAddressSchema.describe('Redes a anunciar')),
  passiveInterfaces: z.array(z.string()).optional(),
  noAutoSummary: z.boolean().default(true)
});

// Schema para VTP (VLAN Trunking Protocol)
export const VTPSchema = z.object({
  domain: z.string().describe('Nombre del dominio VTP'),
  mode: z.enum(['server', 'client', 'transparent']).default('server'),
  version: z.enum(['1', '2', '3']).default('2'),
  password: z.string().optional()
});

// Type exports
export type OSPF = z.infer<typeof OSPFSchema>;
export type EIGRP = z.infer<typeof EIGRPSchema>;
export type VTP = z.infer<typeof VTPSchema>;
