import { z } from 'zod';

// Patrón básico para validar direcciones IPv6
const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
const ipv6Compressed = /^::$|^([0-9a-fA-F]{0,4}:)*::([0-9a-fA-F]{0,4}:)*[0-9a-fA-F]{0,4}$/;
const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

function isValidIPv6(value: string): boolean {
  const addr = value.split('/')[0] ?? value;
  return ipv6Regex.test(addr) || ipv6Compressed.test(addr);
}

function isValidIPv6Prefix(value: string): boolean {
  if (!value.includes('/')) return false;
  const [addr, len] = value.split('/');
  if (!addr || !len) return false;
  const prefixLen = parseInt(len);
  return isValidIPv6(addr) && prefixLen >= 0 && prefixLen <= 128;
}

function isValidIPv4(value: string): boolean {
  if (!ipv4Regex.test(value)) return false;
  return value.split('.').every((octet) => {
    const num = Number(octet);
    return num >= 0 && num <= 255;
  });
}

// Schema para configuración de interfaz IPv6
const ipv6InterfaceSchema = z.object({
  name: z.string().min(1),
  address: z.string().refine(isValidIPv6, { message: 'Invalid IPv6 address' }).optional(),
  linkLocal: z.string().refine(isValidIPv6, { message: 'Invalid IPv6 link-local address' }).optional(),
  eui64: z.boolean().optional(),
  autoConfig: z.enum(['slaac', 'dhcpv6']).optional(),
  ospfv3: z.object({
    processId: z.number().int().min(1).max(65535),
    area: z.string().min(1),
  }).optional(),
  ripng: z.object({
    enable: z.boolean(),
    name: z.string().optional(),
  }).optional(),
});

// Schema para ruta estática IPv6
const ipv6StaticRouteSchema = z.object({
  network: z.string().refine(isValidIPv6Prefix, { message: 'Invalid IPv6 network prefix' }),
  nextHop: z.string().refine(isValidIPv6, { message: 'Invalid IPv6 next-hop' }).optional(),
  interface: z.string().min(1).optional(),
  distance: z.number().int().min(1).max(255).optional(),
  name: z.string().optional(),
});

// Schema para OSPFv3
const ospfv3AreaSchema = z.object({
  areaId: z.string().min(1),
  type: z.enum(['normal', 'stub', 'nssa']).optional(),
  stubNoSummary: z.boolean().optional(),
  nssaDefaultOriginate: z.boolean().optional(),
});

const ospfv3Schema = z.object({
  processId: z.number().int().min(1).max(65535),
  routerId: z.string().refine(isValidIPv4, { message: 'Invalid OSPFv3 router-id' }).optional(),
  areas: z.array(ospfv3AreaSchema).min(1, { message: 'At least one OSPFv3 area is required' }),
  autoCostReferenceBandwidth: z.number().int().min(1).optional(),
  defaultInformation: z.enum(['originate', 'originate always']).optional(),
});

// Schema para RIPng
const ripngSchema = z.object({
  name: z.string().min(1),
  networks: z.array(z.string()).optional(),
  redistribute: z.array(z.enum(['ospf', 'static', 'connected'])).optional(),
  defaultInformation: z.boolean().optional(),
});

// Schema raíz de configuración IPv6
export const ipv6ConfigSchema = z.object({
  deviceName: z.string().min(1),
  routing: z.boolean().optional(),
  interfaces: z.array(ipv6InterfaceSchema).optional(),
  staticRoutes: z.array(ipv6StaticRouteSchema).optional(),
  ripng: ripngSchema.optional(),
  ospfv3: ospfv3Schema.optional(),
});

export type Ipv6Config = z.output<typeof ipv6ConfigSchema>;
export type Ipv6ConfigInput = z.input<typeof ipv6ConfigSchema>;
