import { z } from 'zod';

/**
 * PT Control - Parsed IOS Output Schemas
 * For structured representation of show command output
 */

// ============================================================================
// show ip interface brief
// ============================================================================

export const InterfaceBriefSchema = z.object({
  interface: z.string(),
  ipAddress: z.string(),
  ok: z.string(), // Method (manual, NVRAM, etc.)
  method: z.string(),
  status: z.enum(['up', 'down', 'administratively down']),
  protocol: z.enum(['up', 'down']),
});

export const ShowIpInterfaceBriefSchema = z.object({
  raw: z.string(),
  interfaces: z.array(InterfaceBriefSchema),
});

/**
 * Entrada de show ip interface brief
 * Usar para parsing de salida de comando
 */
export type InterfaceBrief = z.infer<typeof InterfaceBriefSchema>;

/**
 * Resultado parseado de show ip interface brief
 */
export type ShowIpInterfaceBrief = z.infer<typeof ShowIpInterfaceBriefSchema>;

// ============================================================================
// show interfaces
// ============================================================================

export const InterfaceDetailSchema = z.object({
  name: z.string(),
  status: z.string(),
  protocol: z.string(),
  hardware: z.string().optional(),
  description: z.string().optional(),
  ipAddress: z.string().optional(),
  subnetMask: z.string().optional(),
  mtu: z.number().optional(),
  bandwidth: z.number().optional(),
  delay: z.number().optional(),
  reliability: z.string().optional(),
  txload: z.string().optional(),
  rxload: z.string().optional(),
  duplex: z.string().optional(),
  speed: z.string().optional(),
  input: z.object({
    packets: z.number().optional(),
    bytes: z.number().optional(),
    errors: z.number().optional(),
    dropped: z.number().optional(),
    overruns: z.number().optional(),
    frame: z.number().optional(),
  }).optional(),
  output: z.object({
    packets: z.number().optional(),
    bytes: z.number().optional(),
    errors: z.number().optional(),
    dropped: z.number().optional(),
    underruns: z.number().optional(),
    collisions: z.number().optional(),
  }).optional(),
});

export const ShowInterfacesSchema = z.object({
  raw: z.string(),
  interfaces: z.array(InterfaceDetailSchema),
});

/**
 * Detalle de una interfaz de show interfaces
 */
export type InterfaceDetail = z.infer<typeof InterfaceDetailSchema>;

/**
 * Resultado parseado de show interfaces
 */
export type ShowInterfaces = z.infer<typeof ShowInterfacesSchema>;

// ============================================================================
// show vlan / show vlan brief
// ============================================================================

export const VlanEntrySchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(['active', 'suspended', 'act/unsup']),
  ports: z.array(z.string()),
});

export const ShowVlanSchema = z.object({
  raw: z.string(),
  vlans: z.array(VlanEntrySchema),
});

/**
 * Entrada de VLAN de show vlan brief
 */
export type VlanEntry = z.infer<typeof VlanEntrySchema>;

/**
 * Resultado parseado de show vlan brief
 */
export type ShowVlan = z.infer<typeof ShowVlanSchema>;

// ============================================================================
// show interfaces trunk
// ============================================================================

export const TrunkPortSchema = z.object({
  port: z.string(),
  mode: z.string(),
  encapsulation: z.string(),
  status: z.string(),
  nativeVlan: z.number(),
  allowedVlans: z.array(z.number()),
  activeVlans: z.array(z.number()).optional(),
  pruningVlans: z.array(z.number()).optional(),
});

export const ShowInterfacesTrunkSchema = z.object({
  raw: z.string(),
  trunks: z.array(TrunkPortSchema),
});

/**
 * Puerto trunk de show interfaces trunk
 */
export type TrunkPort = z.infer<typeof TrunkPortSchema>;

/**
 * Resultado parseado de show interfaces trunk
 */
export type ShowInterfacesTrunk = z.infer<typeof ShowInterfacesTrunkSchema>;

// ============================================================================
// show interfaces switchport
// ============================================================================

export const SwitchportInfoSchema = z.object({
  interface: z.string(),
  name: z.string().optional(),
  administrativeMode: z.string(),
  operationalMode: z.string(),
  administrativeTrunkingEncapsulation: z.string().optional(),
  accessVlan: z.number().optional(),
  nativeVlan: z.number().optional(),
  trunkingVlans: z.array(z.number()).optional(),
  pruningVlans: z.array(z.number()).optional(),
});

export const ShowInterfacesSwitchportSchema = z.object({
  raw: z.string(),
  ports: z.array(SwitchportInfoSchema),
});

/**
 * Info de switchport de show interfaces switchport
 */
export type SwitchportInfo = z.infer<typeof SwitchportInfoSchema>;

/**
 * Resultado parseado de show interfaces switchport
 */
export type ShowInterfacesSwitchport = z.infer<typeof ShowInterfacesSwitchportSchema>;

// ============================================================================
// show ip route
// ============================================================================

export const RouteEntrySchema = z.object({
  type: z.enum(['C', 'L', 'S', 'R', 'O', 'D', 'B', 'E', 'I', 'M', 'U', '*']),
  network: z.string(),
  mask: z.string().optional(),
  administrativeDistance: z.number().optional(),
  metric: z.number().optional(),
  nextHop: z.string().optional(),
  interface: z.string().optional(),
  via: z.string().optional(), // For OSPF/EIGRP
  age: z.string().optional(), // For dynamic routes
});

export const ShowIpRouteSchema = z.object({
  raw: z.string(),
  gatewayOfLastResort: z.string().optional(),
  routes: z.array(RouteEntrySchema),
  legend: z.record(z.string(), z.string()).optional(),
});

/**
 * Entrada de ruta de show ip route
 * El campo 'type' indica: C=connected, L=local, S=static, O=OSPF, etc.
 */
export type RouteEntry = z.infer<typeof RouteEntrySchema>;

/**
 * Resultado parseado de show ip route
 */
export type ShowIpRoute = z.infer<typeof ShowIpRouteSchema>;

// ============================================================================
// show ip protocols
// ============================================================================

export const RoutingProtocolSchema = z.object({
  name: z.string(),
  routerId: z.string().optional(),
  autonomousSystem: z.number().optional(),
  networks: z.array(z.string()).optional(),
  passiveInterfaces: z.array(z.string()).optional(),
  routingInformationSources: z.array(z.object({
    ip: z.string(),
    from: z.string().optional(),
    administrativeDistance: z.number(),
  })).optional(),
});

export const ShowIpProtocolsSchema = z.object({
  raw: z.string(),
  protocols: z.array(RoutingProtocolSchema),
});

/**
 * Protocolo de enrutamiento activo de show ip protocols
 */
export type RoutingProtocol = z.infer<typeof RoutingProtocolSchema>;

/**
 * Resultado parseado de show ip protocols
 */
export type ShowIpProtocols = z.infer<typeof ShowIpProtocolsSchema>;

// ============================================================================
// show running-config
// ============================================================================

export const RunningConfigSectionSchema = z.object({
  section: z.string(),
  content: z.string(),
});

export const ShowRunningConfigSchema = z.object({
  raw: z.string(),
  hostname: z.string().optional(),
  version: z.string().optional(),
  sections: z.array(RunningConfigSectionSchema).optional(),
  interfaces: z.record(z.string(), z.string()).optional(),
  vlans: z.record(z.string(), z.string()).optional(),
  routing: z.array(z.string()).optional(),
  acls: z.record(z.string(), z.string()).optional(),
  ntp: z.array(z.string()).optional(),
  lines: z.array(z.string()).optional(),
});

/**
 * Sección de show running-config (interface, router, etc.)
 */
export type RunningConfigSection = z.infer<typeof RunningConfigSectionSchema>;

/**
 * Resultado parseado de show running-config
 */
export type ShowRunningConfig = z.infer<typeof ShowRunningConfigSchema>;

// ============================================================================
// show ip arp
// ============================================================================

export const ArpEntrySchema = z.object({
  protocol: z.string(),
  address: z.string(),
  age: z.union([z.number(), z.string()]), // Can be "-" for incomplete
  mac: z.string(),
  type: z.enum(['ARPA', 'SNAP', 'Other']),
  interface: z.string(),
});

export const ShowIpArpSchema = z.object({
  raw: z.string(),
  entries: z.array(ArpEntrySchema),
});

/**
 * Entrada ARP de show ip arp
 */
export type ArpEntry = z.infer<typeof ArpEntrySchema>;

/**
 * Resultado parseado de show ip arp
 */
export type ShowIpArp = z.infer<typeof ShowIpArpSchema>;

// ============================================================================
// show mac address-table
// ============================================================================

export const MacEntrySchema = z.object({
  vlan: z.union([z.number(), z.string()]), // Can be "All"
  macAddress: z.string(),
  type: z.enum(['dynamic', 'static', 'secure', 'self']),
  ports: z.array(z.string()),
});

export const ShowMacAddressTableSchema = z.object({
  raw: z.string(),
  entries: z.array(MacEntrySchema),
});

/**
 * Entrada de MAC de show mac address-table
 */
export type MacEntry = z.infer<typeof MacEntrySchema>;

/**
 * Resultado parseado de show mac address-table
 */
export type ShowMacAddressTable = z.infer<typeof ShowMacAddressTableSchema>;

// ============================================================================
// show spanning-tree
// ============================================================================

export const StpPortSchema = z.object({
  port: z.string(),
  role: z.enum(['root', 'designated', 'alternate', 'backup', 'edge']),
  state: z.enum(['forwarding', 'blocking', 'learning', 'listening', 'disabled']),
  cost: z.number(),
  priority: z.number(),
});

export const StpVlanSchema = z.object({
  vlan: z.number(),
  bridgeId: z.string(),
  rootBridge: z.boolean(),
  rootBridgeId: z.string().optional(),
  rootPort: z.string().optional(),
  interfaces: z.array(StpPortSchema),
});

export const ShowSpanningTreeSchema = z.object({
  raw: z.string(),
  vlans: z.array(StpVlanSchema),
});

/**
 * Puerto STP de show spanning-tree
 */
export type StpPort = z.infer<typeof StpPortSchema>;

/**
 * VLAN STP de show spanning-tree
 */
export type StpVlan = z.infer<typeof StpVlanSchema>;

/**
 * Resultado parseado de show spanning-tree
 */
export type ShowSpanningTree = z.infer<typeof ShowSpanningTreeSchema>;

// ============================================================================
// show version
// ============================================================================

export const ShowVersionSchema = z.object({
  raw: z.string(),
  version: z.string().optional(),
  hostname: z.string().optional(),
  uptime: z.string().optional(),
  image: z.string().optional(),
  processor: z.string().optional(),
  memory: z.string().optional(),
  interfaces: z.array(z.string()).optional(),
  configRegister: z.string().optional(),
});

/**
 * Resultado parseado de show version
 */
export type ShowVersion = z.infer<typeof ShowVersionSchema>;

// ============================================================================
// show cdp neighbors
// ============================================================================

export const CdpNeighborSchema = z.object({
  deviceId: z.string(),
  localInterface: z.string(),
  holdtime: z.number(),
  capability: z.string(),
  platform: z.string(),
  portId: z.string(),
});

export const ShowCdpNeighborsSchema = z.object({
  raw: z.string(),
  neighbors: z.array(CdpNeighborSchema),
});

export type CdpNeighbor = z.infer<typeof CdpNeighborSchema>;

/**
 * Resultado parseado de show cdp neighbors
 */
export type ShowCdpNeighbors = z.infer<typeof ShowCdpNeighborsSchema>;

// ============================================================================
// Union Type for all parsed outputs
// ============================================================================

/**
 * Unión de todos los outputs parseados
 * Usar para validación de resultados de parsing
 */
export const ParsedOutputSchema = z.union([
  ShowIpInterfaceBriefSchema,
  ShowInterfacesSchema,
  ShowVlanSchema,
  ShowInterfacesTrunkSchema,
  ShowInterfacesSwitchportSchema,
  ShowIpRouteSchema,
  ShowIpProtocolsSchema,
  ShowRunningConfigSchema,
  ShowIpArpSchema,
  ShowMacAddressTableSchema,
  ShowSpanningTreeSchema,
  ShowVersionSchema,
  ShowCdpNeighborsSchema,
]);

/**
 * Output parseado de cualquier comando show
 */
export type ParsedOutput = z.infer<typeof ParsedOutputSchema>;

// ============================================================================
// Parser Registry Type
// ============================================================================

/**
 * Función que parsea output de comando IOS
 */
export type ParserFunction = (output: string) => ParsedOutput;

/**
 * Registro de parsers por nombre de comando
 * Usar para registrar parsers de comandos show
 */
export interface ParserRegistry {
  'show ip interface brief': ParserFunction;
  'show interfaces': ParserFunction;
  'show vlan': ParserFunction;
  'show vlan brief': ParserFunction;
  'show interfaces trunk': ParserFunction;
  'show interfaces switchport': ParserFunction;
  'show ip route': ParserFunction;
  'show ip protocols': ParserFunction;
  'show running-config': ParserFunction;
  'show ip arp': ParserFunction;
  'show mac address-table': ParserFunction;
  'show spanning-tree': ParserFunction;
  'show version': ParserFunction;
  'show cdp neighbors': ParserFunction;
}
