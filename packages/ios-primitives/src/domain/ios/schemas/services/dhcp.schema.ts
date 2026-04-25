import { z } from 'zod';
import { isValidIpv4Address } from '../../value-objects/ipv4-address.vo.js';
import { IpWithPrefix } from '../../value-objects/ip-with-prefix.vo.js';

/**
 * Schema para validar direcciones IPv4 usando Value Object
 */
const ipv4AddressSchema = z.string().refine(
  (val) => isValidIpv4Address(val),
  { message: 'Dirección IPv4 inválida' }
);

/**
 * Schema para validar red en notación CIDR usando Value Object
 */
const ipWithPrefixSchema = z.string().refine(
  (val) => IpWithPrefix.isValid(val),
  { message: 'Formato CIDR inválido (ejemplo esperado: 192.168.1.0/24)' }
);

/**
 * Schema para configuración de pool DHCP
 */
export const dhcpPoolSchema = z.object({
  name: z.string().min(1, 'Nombre del pool DHCP requerido'),
  network: ipWithPrefixSchema,
  defaultRouter: ipv4AddressSchema,
  dnsServers: z.array(ipv4AddressSchema).optional(),
  domainName: z.string().optional(),
  excludedAddresses: z.array(ipv4AddressSchema).optional(),
  lease: z.number().int().positive().optional(),
});

/**
 * Schema principal de configuración DHCP
 */
export const dhcpConfigSchema = z.object({
  device: z.string().min(1, 'Nombre de dispositivo requerido'),
  pools: z.array(dhcpPoolSchema).min(1, 'Debe haber al menos un pool DHCP'),
});

export type DhcpConfig = z.output<typeof dhcpConfigSchema>;
export type DhcpConfigInput = z.input<typeof dhcpConfigSchema>;
export type DhcpPoolConfig = z.output<typeof dhcpPoolSchema>;
export type DhcpPoolConfigInput = z.input<typeof dhcpPoolSchema>;
