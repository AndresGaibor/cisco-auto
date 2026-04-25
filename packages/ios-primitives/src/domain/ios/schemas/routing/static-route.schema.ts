import { z } from 'zod';
import { isValidIpv4Address } from '../../value-objects/ipv4-address.vo.js';
import { isValidSubnetMask } from '../../value-objects/ipv4-address.vo.js';
import { isValidInterfaceName } from '../../value-objects/interface-name.vo.js';

/**
 * Schema para validar direcciones IPv4 usando Value Object
 */
const ipv4AddressSchema = z.string().refine(
  (val) => isValidIpv4Address(val),
  { message: 'Dirección IPv4 inválida' }
);

/**
 * Schema para validar máscaras de subred usando Value Object
 */
const subnetMaskSchema = z.string().refine(
  (val) => isValidSubnetMask(val),
  { message: 'Máscara de subred inválida' }
);

/**
 * Schema para validar nombres de interfaz Cisco IOS
 */
const interfaceNameSchema = z.string().refine(
  (val) => isValidInterfaceName(val),
  { message: 'Nombre de interfaz inválido' }
);

/**
 * Schema para validar next hop (puede ser IP o interfaz)
 */
const nextHopSchema = z.string().refine(
  (val) => isValidIpv4Address(val) || isValidInterfaceName(val),
  { message: 'Next hop inválido (debe ser dirección IPv4 o nombre de interfaz)' }
);

/**
 * Schema principal de configuración de ruta estática
 */
export const staticRouteConfigSchema = z.object({
  device: z.string().min(1, 'Nombre de dispositivo requerido'),
  type: z.literal('static-route'),
  destination: ipv4AddressSchema,
  mask: subnetMaskSchema,
  nextHop: nextHopSchema,
  administrativeDistance: z.number().int().min(1).max(255).optional(),
});

export type StaticRouteConfig = z.output<typeof staticRouteConfigSchema>;
export type StaticRouteConfigInput = z.input<typeof staticRouteConfigSchema>;
