import { z } from 'zod';

// Patrón para validar dirección IPv4
const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

function isValidIpv4(value: string): boolean {
  if (!ipv4Regex.test(value)) return false;
  return value.split('.').every((octet) => {
    const num = Number(octet);
    return num >= 0 && num <= 255;
  });
}

// Patrón para validar wildcard mask
function isValidWildcard(value: string): boolean {
  if (!ipv4Regex.test(value)) return false;
  return value.split('.').every((octet) => {
    const num = Number(octet);
    return num >= 0 && num <= 255;
  });
}

// Schema para ruta estática
const staticRouteSchema = z.object({
  network: z.string().refine(isValidIpv4, { message: 'Invalid network address' }),
  mask: z.string().refine(isValidIpv4, { message: 'Invalid subnet mask' }),
  nextHop: z.string().refine(isValidIpv4, { message: 'Invalid next-hop address' }),
  administrativeDistance: z.number().int().min(1).max(255).optional(),
});

// Schema para área OSPF
const ospfAreaNetworkSchema = z.object({
  network: z.string().refine(isValidIpv4, { message: 'Invalid network address' }),
  wildcard: z.string().refine(isValidWildcard, { message: 'Invalid wildcard mask' }),
});

const ospfAreaSchema = z.object({
  areaId: z.union([z.number().int().min(0), z.string().regex(/^\d+(\.\d+)*$/)]),
  networks: z.array(ospfAreaNetworkSchema),
});

const ospfSchema = z.object({
  processId: z.number().int().min(1).max(65535),
  routerId: z.string().refine(isValidIpv4, { message: 'Invalid router-id' }).optional(),
  areas: z.array(ospfAreaSchema).min(1, { message: 'At least one OSPF area is required' }),
  passiveInterfaces: z.array(z.string().min(1)).optional(),
});

// Schema para EIGRP
const eigrpSchema = z.object({
  asNumber: z.number().int().min(1).max(65535),
  routerId: z.string().refine(isValidIpv4, { message: 'Invalid router-id' }).optional(),
  networks: z.array(z.string().refine(isValidIpv4, { message: 'Invalid network address' })).min(1, { message: 'At least one EIGRP network is required' }),
  passiveInterfaces: z.array(z.string().min(1)).optional(),
});

// Schema para vecino BGP
const bgpNeighborSchema = z.object({
  ip: z.string().refine(isValidIpv4, { message: 'Invalid neighbor IP' }),
  remoteAs: z.number().int().min(1).max(4294967295),
  description: z.string().optional(),
  nextHopSelf: z.boolean().optional(),
});

// Schema para red BGP
const bgpNetworkSchema = z.object({
  network: z.string().refine(isValidIpv4, { message: 'Invalid network address' }),
  mask: z.string().refine(isValidIpv4, { message: 'Invalid subnet mask' }).optional(),
});

const bgpSchema = z.object({
  asn: z.number().int().min(1).max(4294967295),
  routerId: z.string().refine(isValidIpv4, { message: 'Invalid router-id' }).optional(),
  neighbors: z.array(bgpNeighborSchema).min(1, { message: 'At least one BGP neighbor is required' }),
  networks: z.array(bgpNetworkSchema).optional(),
});

// Schema raíz de configuración de routing
export const routingConfigSchema = z.object({
  deviceName: z.string().min(1),
  staticRoutes: z.array(staticRouteSchema).optional(),
  ospf: ospfSchema.optional(),
  eigrp: eigrpSchema.optional(),
  bgp: bgpSchema.optional(),
});

export type RoutingConfig = z.output<typeof routingConfigSchema>;
export type RoutingConfigInput = z.input<typeof routingConfigSchema>;
