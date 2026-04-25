import { z } from 'zod';
import { isValidIpv4Address } from '../../value-objects/ipv4-address.vo.js';
import { isValidInterfaceName } from '../../value-objects/interface-name.vo.js';
import { Asn } from '../../value-objects/asn.vo.js';

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
 * Schema para validar ASN (Autonomous System Number) usando Value Object
 */
const asnSchema = z.union([z.number().int(), z.string()]).refine(
  (val) => Asn.isValid(val),
  { message: 'Número de sistema autónomo inválido' }
);

/**
 * Patrón para validar redes en formato CIDR
 */
const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

function isValidCidrNetwork(value: string): boolean {
  if (!cidrPattern.test(value)) return false;
  const [ip, prefix] = value.split('/');
  if (!ip || !prefix) return false;
  const prefixNum = parseInt(prefix, 10);
  if (isNaN(prefixNum) || prefixNum < 0 || prefixNum > 32) return false;
  return isValidIpv4Address(ip);
}

/**
 * Schema para validar vecinos BGP
 */
const bgpNeighborSchema = z.object({
  ip: ipv4AddressSchema,
  remoteAs: asnSchema,
  description: z.string().optional(),
});

/**
 * Schema principal de configuración BGP
 */
export const bgpConfigSchema = z.object({
  device: z.string().min(1, 'Nombre de dispositivo requerido'),
  type: z.literal('bgp'),
  autonomousSystem: asnSchema,
  neighbors: z.array(bgpNeighborSchema).min(1, 'Debe haber al menos un vecino BGP'),
  networks: z.array(
    z.string().refine(
      (val) => isValidCidrNetwork(val),
      { message: 'Red inválida (formato esperado: IP/prefijo, ej: 192.168.1.0/24)' }
    )
  ).min(1, 'Debe haber al menos una red BGP'),
});

export type BgpConfig = z.output<typeof bgpConfigSchema>;
export type BgpConfigInput = z.input<typeof bgpConfigSchema>;
