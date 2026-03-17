import { z } from 'zod';
import { IPCidrSchema, IPAddressSchema, MACAddressSchema } from './common.ts';
import { OSPFSchema, EIGRPSchema, VTPSchema } from './protocols.ts';
import { ACLSchema, NATSchema } from './security.ts';

// Tipos de dispositivos soportados
export const DeviceTypeSchema = z.enum([
  'router',
  'switch',
  'multilayer-switch',
  'pc',
  'server',
  'access-point',
  'firewall',
  'cloud',
  'modem',
  'printer',
  'wireless-router'
]);

// Tipos de interfaces
export const InterfaceTypeSchema = z.enum([
  'ethernet',
  'fastethernet',
  'gigabitethernet',
  'serial',
  'loopback',
  'vlan',
  'tunnel'
]);

// Schema para VLAN
export const VLANSchema = z.object({
  id: z.number().min(1).max(4094).describe('ID de VLAN (1-4094)'),
  name: z.string().min(1).max(32).describe('Nombre de la VLAN'),
  description: z.string().optional().describe('Descripción opcional'),
  ports: z.array(z.string()).optional().describe('Puertos asignados a esta VLAN'),
  ip: IPCidrSchema.optional().describe('Dirección IP de la interfaz SVI'),
  active: z.boolean().default(true).describe('Estado de la VLAN')
});

// Schema para interfaz de red
export const InterfaceSchema = z.object({
  name: z.string().describe('Nombre de la interfaz (ej: GigabitEthernet0/0)'),
  type: InterfaceTypeSchema.default('gigabitethernet'),
  ip: IPCidrSchema.optional().describe('Dirección IP con CIDR'),
  description: z.string().optional(),
  enabled: z.boolean().default(true),
  shutdown: z.boolean().default(false),
  vlan: z.number().optional().describe('VLAN para puertos de acceso'),
  mode: z.enum(['access', 'trunk', 'routed']).optional(),
  trunkAllowedVlans: z.array(z.number()).optional(),
  encapsulation: z.enum(['dot1q', 'isl']).optional(),
  duplex: z.enum(['auto', 'full', 'half']).default('auto'),
  speed: z.union([z.number(), z.enum(['auto'])]).default('auto'),
  macAddress: MACAddressSchema.optional()
});

// Schema para dispositivo completo
export const DeviceSchema = z.object({
  name: z.string().min(1).describe('Nombre del dispositivo (ej: Router-1)'),
  type: DeviceTypeSchema.describe('Tipo de dispositivo'),
  model: z.string().optional().describe('Modelo del dispositivo (ej: Cisco 2960)'),
  iosVersion: z.string().optional().describe('Versión de IOS'),
  hostname: z.string().optional().describe('Hostname del dispositivo'),
  
  // Conectividad
  management: z.object({
    ip: IPAddressSchema.describe('IP de management'),
    subnetMask: IPAddressSchema.describe('Máscara de subred'),
    gateway: IPAddressSchema.optional(),
    vlan: z.number().default(1).describe('VLAN de management')
  }).optional(),
  
  ssh: z.object({
    enabled: z.boolean().default(true),
    version: z.number().default(2),
    port: z.number().default(22)
  }).optional(),
  
  telnet: z.object({
    enabled: z.boolean().default(false),
    port: z.number().default(23)
  }).optional(),
  
  credentials: z.object({
    username: z.string().default('admin'),
    password: z.string().describe('Contraseña o variable de entorno ${ENV_VAR}'),
    enablePassword: z.string().optional()
  }).optional(),
  
  // Configuración de interfaces
  interfaces: z.array(InterfaceSchema).optional(),
  
  // VLANs (para switches)
  vlans: z.array(VLANSchema).optional(),
  vtp: VTPSchema.optional(),
  
  // Protocolos de enrutamiento
  routing: z.object({
    static: z.array(z.object({
      network: IPCidrSchema.describe('Red destino'),
      nextHop: z.union([IPAddressSchema, z.literal('null0')]).describe('Siguiente salto'),
      administrativeDistance: z.number().min(1).max(255).default(1),
      description: z.string().optional()
    })).optional(),
    ospf: OSPFSchema.optional(),
    eigrp: EIGRPSchema.optional()
  }).optional(),
  
  // Seguridad
  acls: z.array(ACLSchema).optional(),
  nat: NATSchema.optional(),
  
  // Líneas de acceso
  lines: z.object({
    console: z.object({
      password: z.string().optional(),
      login: z.boolean().default(true),
      execTimeout: z.number().default(10)
    }).optional(),
    vty: z.object({
      start: z.number().default(0),
      end: z.number().default(15),
      password: z.string().optional(),
      login: z.boolean().default(true),
      transportInput: z.enum(['all', 'ssh', 'telnet', 'none']).default('ssh')
    }).optional()
  }).optional()
});

export type DeviceType = z.infer<typeof DeviceTypeSchema>;
export type InterfaceType = z.infer<typeof InterfaceTypeSchema>;
export type VLAN = z.infer<typeof VLANSchema>;
export type Interface = z.infer<typeof InterfaceSchema>;
export type Device = z.infer<typeof DeviceSchema>;