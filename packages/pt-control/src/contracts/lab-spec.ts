import { z } from 'zod';

/**
 * Especificación de un dispositivo en el laboratorio.
 * Describe el estado deseado de un dispositivo sin depender de la implementación PT específica.
 */
export const LabDeviceSpecSchema = z.object({
  /** Nombre lógico del dispositivo (ej: 'CORE3650', 'SW1', 'PC1') */
  name: z.string(),
  /** Modelo lógico del dispositivo (puede mapear a un modelo PT diferente) */
  model: z.string(),
  /** Modelo PT real a usar si difiere del lógico */
  ptModel: z.string().optional(),
  /** Rol del dispositivo en el laboratorio */
  role: z.enum(['core', 'access-switch', 'pc', 'server', 'router']).optional(),
  /** Posición X en canvas PT */
  x: z.number(),
  /** Posición Y en canvas PT */
  y: z.number(),
  /** Si el recurso está soportado completamente */
  supported: z.enum(['true', 'false', 'partial']).optional(),
  /** Notas sobre limitaciones o consideraciones especiales */
  notes: z.array(z.string()).optional(),
});
export type LabDeviceSpec = z.infer<typeof LabDeviceSpecSchema>;

/**
 * Especificación de un enlace en el laboratorio.
 */
export const LabLinkSpecSchema = z.object({
  /** Dispositivo origen */
  fromDevice: z.string(),
  /** Puerto origen */
  fromPort: z.string(),
  /** Dispositivo destino */
  toDevice: z.string(),
  /** Puerto destino */
  toPort: z.string(),
  /** Tipo de cable */
  cableType: z.enum(['straight', 'crossover', 'rollover', 'fiber', 'serial']).optional(),
  /** Si el enlace está soportado */
  supported: z.enum(['true', 'false', 'partial']).optional(),
});
export type LabLinkSpec = z.infer<typeof LabLinkSpecSchema>;

/**
 * Configuración de VLAN.
 */
export const LabVlanSpecSchema = z.object({
  /** ID de VLAN */
  id: z.number().min(1).max(4094),
  /** Nombre de la VLAN */
  name: z.string(),
  /** Dispositivos donde debe existir esta VLAN */
  devices: z.array(z.string()),
});
export type LabVlanSpec = z.infer<typeof LabVlanSpecSchema>;

/**
 * Configuración de puerto trunk.
 */
export const LabTrunkSpecSchema = z.object({
  /** Dispositivo */
  device: z.string(),
  /** Puerto a configurar como trunk */
  port: z.string(),
  /** VLAN nativa */
  nativeVlan: z.number().optional(),
  /** VLANs permitidas (si no se especifica, todas) */
  allowedVlans: z.array(z.number()).optional(),
});
export type LabTrunkSpec = z.infer<typeof LabTrunkSpecSchema>;

/**
 * Configuración de puerto access.
 */
export const LabAccessPortSpecSchema = z.object({
  /** Dispositivo */
  device: z.string(),
  /** Puerto */
  port: z.string(),
  /** VLAN de acceso */
  vlan: z.number(),
  /** Habilitar PortFast */
  portfast: z.boolean().default(false),
});
export type LabAccessPortSpec = z.infer<typeof LabAccessPortSpecSchema>;

/**
 * Configuración de SVI (Switch Virtual Interface).
 */
export const LabSviSpecSchema = z.object({
  /** Dispositivo */
  device: z.string(),
  /** VLAN de la SVI */
  vlan: z.number(),
  /** Dirección IP */
  ip: z.string(),
  /** Máscara de subred */
  mask: z.string(),
  /** Descripción opcional */
  description: z.string().optional(),
});
export type LabSviSpec = z.infer<typeof LabSviSpecSchema>;

/**
 * Configuración de ruta estática.
 */
export const LabStaticRouteSpecSchema = z.object({
  /** Dispositivo */
  device: z.string(),
  /** Red de destino */
  network: z.string(),
  /** Máscara */
  mask: z.string(),
  /** Next-hop o interfaz de salida */
  nextHop: z.string(),
});
export type LabStaticRouteSpec = z.infer<typeof LabStaticRouteSpecSchema>;

/**
 * Configuración de pool DHCP.
 */
export const LabDhcpPoolSpecSchema = z.object({
  /** Dispositivo que actúa como servidor DHCP */
  device: z.string(),
  /** Nombre del pool */
  poolName: z.string(),
  /** ID de VLAN asociada (opcional - si se especifica, la config se deriva de la SVI de la VLAN) */
  vlanId: z.number().min(1).max(4094).optional(),
  /** Red a servir (opcional si se especifica vlanId) */
  network: z.string().optional(),
  /** Máscara (opcional si se especifica vlanId) */
  mask: z.string().optional(),
  /** Default gateway (opcional si se especifica vlanId) */
  defaultRouter: z.string().optional(),
  /** DNS server */
  dnsServer: z.string().optional(),
  /** Direcciones excluidas (rangos) */
  excludedRanges: z.array(z.object({
    start: z.string(),
    end: z.string(),
  })).default([]),
});
export type LabDhcpPoolSpec = z.infer<typeof LabDhcpPoolSpecSchema>;

/**
 * Configuración de host (PC o Server).
 */
export const LabHostSpecSchema = z.object({
  /** Nombre del host */
  device: z.string(),
  /** Usar DHCP */
  dhcp: z.boolean().default(false),
  /** IP estática (si dhcp=false) */
  ip: z.string().optional(),
  /** Máscara (si dhcp=false) */
  mask: z.string().optional(),
  /** Gateway (si dhcp=false) */
  gateway: z.string().optional(),
  /** DNS (si dhcp=false) */
  dns: z.string().optional(),
});
export type LabHostSpec = z.infer<typeof LabHostSpecSchema>;

/**
 * Configuración de servicio en Server-PT.
 * Marca explícitamente qué servicios están soportados por la API.
 */
export const LabServiceSpecSchema = z.object({
  /** Dispositivo servidor */
  device: z.string(),
  /** Tipo de servicio */
  type: z.enum(['dns', 'dhcp', 'web', 'email', 'ftp', 'tftp']),
  /** Si el servicio está habilitado */
  enabled: z.boolean().default(true),
  /** Si la configuración del servicio está soportada por PT API */
  supportedByApi: z.enum(['true', 'false', 'partial']).default('false'),
  /** Configuración específica del servicio (estructura libre) */
  config: z.record(z.string(), z.any()).optional(),
  /** Notas sobre el servicio */
  notes: z.array(z.string()).default([]),
});
export type LabServiceSpec = z.infer<typeof LabServiceSpecSchema>;

/**
 * Check de verificación del laboratorio.
 */
export const LabCheckSpecSchema = z.object({
  /** Nombre del check */
  name: z.string(),
  /** Tipo de check */
  type: z.enum(['topology', 'vlan', 'trunk', 'svi', 'routing', 'host', 'service', 'connectivity']),
  /** Descripción del check */
  description: z.string(),
  /** Si el check puede ejecutarse de forma fiable */
  reliable: z.boolean().default(true),
  /** Parámetros del check */
  params: z.record(z.string(), z.any()).optional(),
});
export type LabCheckSpec = z.infer<typeof LabCheckSpecSchema>;

/**
 * Políticas de reparación del laboratorio.
 */
export const LabRepairPolicySchema = z.object({
  /** Modo de reparación por defecto */
  defaultMode: z.enum(['incremental', 'rebuild']).default('incremental'),
  /** Si se debe limpiar topología antes de aplicar (solo en rebuild) */
  clearTopologyOnRebuild: z.boolean().default(true),
  /** Si se debe verificar después de aplicar */
  verifyAfterApply: z.boolean().default(true),
  /** Reintentos máximos por operación */
  maxRetries: z.number().default(3),
  /** Timeout por operación (ms) */
  operationTimeout: z.number().default(30000),
});
export type LabRepairPolicy = z.infer<typeof LabRepairPolicySchema>;

/**
 * Especificación completa del laboratorio.
 * Define el estado deseado del laboratorio de forma declarativa.
 */
export const LabSpecSchema = z.object({
  /** Identificador único del laboratorio */
  labId: z.string(),
  /** Versión del spec */
  version: z.string().default('1.0.0'),
  /** Nombre del laboratorio */
  name: z.string(),
  /** Descripción */
  description: z.string().optional(),
  /** Tags para clasificación */
  tags: z.array(z.string()).default([]),
  
  // Estado deseado de recursos
  /** Dispositivos */
  devices: z.array(LabDeviceSpecSchema),
  /** Enlaces */
  links: z.array(LabLinkSpecSchema),
  /** VLANs */
  vlans: z.array(LabVlanSpecSchema).default([]),
  /** Trunks */
  trunks: z.array(LabTrunkSpecSchema).default([]),
  /** Puertos access */
  accessPorts: z.array(LabAccessPortSpecSchema).default([]),
  /** SVIs */
  svis: z.array(LabSviSpecSchema).default([]),
  /** Rutas estáticas */
  staticRoutes: z.array(LabStaticRouteSpecSchema).default([]),
  /** Pools DHCP */
  dhcpPools: z.array(LabDhcpPoolSpecSchema).default([]),
  /** Hosts */
  hosts: z.array(LabHostSpecSchema).default([]),
  /** Servicios */
  services: z.array(LabServiceSpecSchema).default([]),
  
  // Verificación y políticas
  /** Checks de verificación */
  checks: z.array(LabCheckSpecSchema).default([]),
  /** Políticas de reparación */
  repairPolicy: LabRepairPolicySchema.optional(),
  
  // Metadatos
  /** Notas generales del laboratorio */
  notes: z.array(z.string()).default([]),
  /** Timestamp de creación */
  createdAt: z.number().optional(),
  /** Timestamp de última actualización */
  updatedAt: z.number().optional(),
});
export type LabSpec = z.infer<typeof LabSpecSchema>;
