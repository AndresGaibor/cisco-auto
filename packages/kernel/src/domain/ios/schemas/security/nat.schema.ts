import { z } from 'zod';
import { isValidIpv4Address } from '../../value-objects/ipv4-address.vo.js';
import { isValidInterfaceName } from '../../value-objects/interface-name.vo.js';

/**
 * Schema para validar direcciones IPv4 usando Value Object
 */
const ipv4AddressSchema = z.string().refine(
  (val) => isValidIpv4Address(val),
  { message: 'Dirección IPv4 inválida' }
);

/**
 * Schema para validar nombres de interfaz Cisco IOS
 */
const interfaceNameSchema = z.string().refine(
  (val) => isValidInterfaceName(val),
  { message: 'Nombre de interfaz inválido' }
);

/**
 * Schema para NAT estático
 */
const natStaticSchema = z.object({
  localIp: ipv4AddressSchema,
  globalIp: ipv4AddressSchema,
});

/**
 * Schema para pool NAT dinámico
 */
const natPoolSchema = z.object({
  name: z.string().min(1, 'Nombre del pool requerido'),
  startIp: ipv4AddressSchema,
  endIp: ipv4AddressSchema,
  netmask: z.string().min(1, 'Máscara de red requerida'),
});

/**
 * Schema principal de configuración NAT
 */
export const natConfigSchema = z.object({
  device: z.string().min(1, 'Nombre de dispositivo requerido'),
  type: z.enum(['static', 'dynamic', 'pat']),
  insideInterface: interfaceNameSchema,
  outsideInterface: interfaceNameSchema,
  staticMappings: z.array(natStaticSchema).optional(),
  pool: natPoolSchema.optional(),
});

export type NatConfig = z.output<typeof natConfigSchema>;
export type NatConfigInput = z.input<typeof natConfigSchema>;
