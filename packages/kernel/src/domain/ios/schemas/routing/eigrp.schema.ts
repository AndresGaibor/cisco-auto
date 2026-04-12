import { z } from 'zod';
import { isValidIpv4Address } from '../../value-objects/ipv4-address.vo.js';
import { isValidInterfaceName } from '../../value-objects/interface-name.vo.js';
import { WildcardMask } from '../../value-objects/wildcard-mask.vo.js';
import { Asn } from '../../value-objects/asn.vo.js';

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
 * Schema para validar nombres de interfaz Cisco IOS
 */
const interfaceNameSchema = z.string().refine(
  (val) => isValidInterfaceName(val),
  { message: 'Nombre de interfaz inválido' }
);

/**
 * Schema para validar ASN (Autonomous System Number) usando Value Object
 */
const asnSchema = z.union([z.number().int(), z.string()]).refine(
  (val) => Asn.isValid(val),
  { message: 'Número de sistema autónomo inválido' }
);

/**
 * Schema principal de configuración EIGRP
 */
export const eigrpConfigSchema = z.object({
  device: z.string().min(1, 'Nombre de dispositivo requerido'),
  type: z.literal('eigrp'),
  autonomousSystem: asnSchema,
  networks: z.array(z.object({
    network: ipv4AddressSchema,
    wildcard: wildcardMaskSchema,
  })).min(1, 'Debe haber al menos una red EIGRP'),
  passiveInterfaces: z.array(interfaceNameSchema).optional(),
});

export type EigrpConfig = z.output<typeof eigrpConfigSchema>;
export type EigrpConfigInput = z.input<typeof eigrpConfigSchema>;
