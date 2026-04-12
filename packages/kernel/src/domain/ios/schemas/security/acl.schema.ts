import { z } from 'zod';
import { isValidIpv4Address } from '../../value-objects/ipv4-address.vo.js';
import { WildcardMask } from '../../value-objects/wildcard-mask.vo.js';

/**
 * Schema para validar direcciones IPv4 usando Value Object
 */
const ipv4AddressSchema = z.string().refine(
  (val) => isValidIpv4Address(val),
  { message: 'Dirección IPv4 inválida' }
);

/**
 * Schema para validar wildcard masks usando Value Object
 */
const wildcardMaskSchema = z.string().refine(
  (val) => WildcardMask.isValid(val),
  { message: 'Wildcard mask inválido' }
);

/**
 * Patrón para especificación de puertos (números, rangos, operadores)
 */
const portPattern = /^(\d+|eq \d+|lt \d+|gt \d+|neq \d+|range \d+ \d+)$/;

/**
 * Schema para validar especificación de puertos
 */
const portSpecSchema = z.string().refine(
  (val) => portPattern.test(val),
  { message: 'Especificación de puerto inválida' }
);

/**
 * Schema para protocolo ACL (nombre o número)
 */
const aclProtocolSchema = z.union([
  z.enum(['ip', 'tcp', 'udp', 'icmp']),
  z.number().int().min(0).max(255),
]);

/**
 * Schema para regla ACL
 */
export const aclRuleSchema = z.object({
  action: z.enum(['permit', 'deny']),
  protocol: aclProtocolSchema,
  source: ipv4AddressSchema,
  sourceWildcard: wildcardMaskSchema.optional(),
  sourcePort: portSpecSchema.optional(),
  destination: ipv4AddressSchema.optional(),
  destinationWildcard: wildcardMaskSchema.optional(),
  destinationPort: portSpecSchema.optional(),
  log: z.boolean().optional().default(false),
});

/**
 * Schema principal de configuración ACL
 */
export const aclConfigSchema = z.object({
  device: z.string().min(1, 'Nombre de dispositivo requerido'),
  name: z.string().min(1, 'Nombre de ACL requerido'),
  type: z.enum(['standard', 'extended']),
  rules: z.array(aclRuleSchema).min(1, 'Debe haber al menos una regla'),
  appliedOn: z.string().optional(),
  direction: z.enum(['in', 'out']).optional(),
});

export type AclConfig = z.output<typeof aclConfigSchema>;
export type AclConfigInput = z.input<typeof aclConfigSchema>;
