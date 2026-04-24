import { z } from 'zod';
import { IPAddressSchema } from './common.js';

/**
 * Security Schemas - ACLs and NAT configuration
 * Single Source of Truth for security-related schemas
 */

// Schema para ACL
export const ACLSchema = z.object({
  name: z.string().describe('Nombre de la ACL'),
  type: z.enum(['standard', 'extended']).default('extended'),
  entries: z.array(z.object({
    action: z.enum(['permit', 'deny']),
    protocol: z.enum(['ip', 'tcp', 'udp', 'icmp']).default('ip'),
    source: z.string(),
    sourceWildcard: z.string().optional(),
    destination: z.string().optional(),
    destinationWildcard: z.string().optional(),
    port: z.string().optional(),
    log: z.boolean().default(false)
  }))
});

// Schema para NAT
export const NATSchema = z.object({
  type: z.enum(['static', 'dynamic', 'overload']).describe('Tipo de NAT'),
  insideInterface: z.string().describe('Interfaz inside'),
  outsideInterface: z.string().describe('Interfaz outside'),
  mappings: z.array(z.object({
    insideLocal: IPAddressSchema.describe('IP local interna'),
    insideGlobal: IPAddressSchema.optional().describe('IP pública (para static NAT)'),
    poolName: z.string().optional().describe('Nombre del pool (para dynamic NAT)')
  })).optional(),
  pool: z.object({
    name: z.string(),
    startIp: IPAddressSchema,
    endIp: IPAddressSchema,
    netmask: IPAddressSchema
  }).optional(),
  acl: z.string().optional().describe('ACL para NAT overload')
});

/**
 * Lista de Control de Acceso (ACL)
 * Usar para filtrar tráfico en interfaces de router
 */
export type ACL = z.infer<typeof ACLSchema>;

/**
 * Configuración de NAT (Network Address Translation)
 * Usar para traducir direcciones IP privadas a públicas
 */
export type NAT = z.infer<typeof NATSchema>;
