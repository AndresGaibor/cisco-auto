import { z } from 'zod';
import { isValidIpv4Address } from '../../value-objects/ipv4-address.vo.js';
import { isValidInterfaceName } from '../../value-objects/interface-name.vo.js';
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
 * Schema para validar nombres de interfaz Cisco IOS
 */
const interfaceNameSchema = z.string().refine(
  (val) => isValidInterfaceName(val),
  { message: 'Nombre de interfaz inválido' }
);

/**
 * Schema para configuración de áreas OSPF
 */
export const ospfAreaSchema = z.object({
  areaId: z.union([
    z.number().int().min(0).max(4294967295),
    ipv4AddressSchema,
  ]),
  networks: z.array(z.object({
    network: ipv4AddressSchema,
    wildcard: wildcardMaskSchema,
  })).min(1, 'Debe haber al menos una red en el área'),
  stub: z.boolean().optional(),
  nssa: z.boolean().optional(),
});

/**
 * Schema principal de configuración OSPF
 */
export const ospfConfigSchema = z.object({
  device: z.string().min(1, 'Nombre de dispositivo requerido'),
  type: z.literal('ospf'),
  processId: z.number().int().min(1).max(65535),
  routerId: ipv4AddressSchema.optional(),
  networks: z.array(z.object({
    network: ipv4AddressSchema,
    wildcard: wildcardMaskSchema,
    area: z.union([
      z.number().int().min(0).max(4294967295),
      ipv4AddressSchema,
    ]),
  })).min(1, 'Debe haber al menos una red OSPF'),
  passiveInterfaces: z.array(interfaceNameSchema).optional(),
  areas: z.record(z.string(), z.object({
    stub: z.boolean().optional(),
    nssa: z.boolean().optional(),
  })).optional(),
});

export type OspfConfig = z.output<typeof ospfConfigSchema>;
export type OspfConfigInput = z.input<typeof ospfConfigSchema>;
