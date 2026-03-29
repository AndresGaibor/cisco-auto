# Fase 1: Catálogo de Dispositivos

> **Estado:** ✅ COMPLETADO  
> **Tests:** Incluidos en Fase 0  
> **Dependencias:** Fase 0 completada

## Objetivo

Expandir el catálogo de dispositivos de 11 tipos genéricos a **50+ dispositivos específicos** de Packet Tracer, con modelos concretos, puertos reales, módulos soportados y capacidades declaradas.

---

## Estado Actual vs Objetivo

### Actual (11 tipos genéricos)

```typescript
type DeviceType = 
  | 'router'
  | 'switch'
  | 'multilayer-switch'
  | 'pc'
  | 'server'
  | 'access-point'
  | 'firewall'
  | 'cloud'
  | 'modem'
  | 'printer'
  | 'wireless-router';
```

### Objetivo (50+ modelos específicos)

```
Routers (17+ modelos)
├── ISR 4000 Series: ISR4321, ISR4331, ISR4351, ISR4451
├── ISR G2 Series: 1941, 2901, 2911, 2921, 2951
├── ISR Series: 1841, 2811
├── Legacy: 2620XM, 2621XM
├── Cellular: 819, 829
├── Industrial: CGR1240, IR-8340, IR-1101
└── New: C8200

Switches (12+ modelos)
├── L3 Multilayer: 3560-24PS, 3650-24PS
├── L2 Access: 2960, 2950-24, 2950T-24
├── Industrial: IE2000, IE-3400, IE-9320
└── Generic: Bridge-PT, Switch-PT

End Devices (17+ modelos)
├── PCs: PC-PT
├── Laptops: Laptop-PT
├── Servers: Server-PT, Meraki-Server
├── Printers: Printer-PT
├── Phones: 7960 IP Phone, Home-VoIP-PT, Analog-Phone-PT
├── Mobile: TabletPC-PT, SMARTPHONE-PT, WirelessEndDevice-PT
├── Media: TV-PT
└── Industrial: DataHistorianServer, CyberObserver

Wireless (8+ modelos)
├── APs: AccessPoint-PT, AccessPoint-PT-A, AccessPoint-PT-N, AccessPoint-PT-AC
├── Cisco: Aironet 3702i, LAP-PT
├── Controllers: WLC-PT, WLC-2504, WLC-3504
└── Home: Home Gateway, WRT300N

Security (5+ modelos)
├── ASA: ASA 5505, ASA 5506
├── Meraki: Meraki-MX65W
└── Industrial: ISA-3000

WAN/Cloud (5+ modelos)
├── Cloud: Cloud-PT
├── Modems: DSL-Modem-PT, Cable-Modem-PT
├── Cellular: Cell Tower
└── CO: Central Office Server
```

---

## Estructura de Directorios

```
src/core/
├── catalog/
│   ├── index.ts                      # Exports
│   ├── types.ts                      # Tipos del catálogo
│   ├── device-catalog.ts             # Catálogo principal
│   │
│   ├── models/
│   │   ├── routers/
│   │   │   ├── index.ts
│   │   │   ├── isr-4000-series.ts
│   │   │   ├── isr-g2-series.ts
│   │   │   ├── isr-series.ts
│   │   │   ├── legacy-routers.ts
│   │   │   ├── cellular-routers.ts
│   │   │   └── industrial-routers.ts
│   │   │
│   │   ├── switches/
│   │   │   ├── index.ts
│   │   │   ├── catalyst-3500-series.ts
│   │   │   ├── catalyst-2900-series.ts
│   │   │   ├── industrial-switches.ts
│   │   │   └── legacy-switches.ts
│   │   │
│   │   ├── end-devices/
│   │   │   ├── index.ts
│   │   │   ├── computers.ts
│   │   │   ├── phones.ts
│   │   │   ├── mobile.ts
│   │   │   └── servers.ts
│   │   │
│   │   ├── wireless/
│   │   │   ├── index.ts
│   │   │   ├── access-points.ts
│   │   │   └── controllers.ts
│   │   │
│   │   ├── security/
│   │   │   ├── index.ts
│   │   │   └── firewalls.ts
│   │   │
│   │   └── wan/
│   │       ├── index.ts
│   │       └── wan-devices.ts
│   │
│   └── capabilities/
│       ├── index.ts
│       ├── routing-capabilities.ts
│       ├── switching-capabilities.ts
│       ├── wireless-capabilities.ts
│       └── security-capabilities.ts
```

---

## Tipos del Catálogo

### Tarea 1.1: Definir Tipos de Catálogo

**Archivo:** `src/core/catalog/types.ts`

```typescript
// src/core/catalog/types.ts

/**
 * Familia de dispositivos
 */
export type DeviceFamily =
  | 'router'
  | 'switch'
  | 'multilayer-switch'
  | 'hub'
  | 'access-point'
  | 'wireless-router'
  | 'wireless-controller'
  | 'firewall'
  | 'cloud'
  | 'modem'
  | 'pc'
  | 'laptop'
  | 'server'
  | 'printer'
  | 'ip-phone'
  | 'analog-phone'
  | 'tablet'
  | 'smartphone'
  | 'tv'
  | 'home-gateway'
  | 'sensor'
  | 'actuator'
  | 'plc'
  | 'industrial-router'
  | 'industrial-switch'
  | 'cell-tower'
  | 'repeater'
  | 'sniffer'
  | 'unknown';

/**
 * Definición de puerto físico
 */
export interface PortDefinition {
  /** Nombre del puerto (ej: "FastEthernet0/1") */
  name: string;
  /** Tipo de puerto */
  type: 'fast-ethernet' | 'gigabit-ethernet' | 'ten-gigabit-ethernet' | 'serial' | 'fiber' | 'console' | 'aux' | 'usb';
  /** Velocidad en Mbps */
  speed: number;
  /** ¿Soporta PoE? */
  poe?: boolean;
  /** Descripción */
  description?: string;
}

/**
 * Definición de slot/módulo
 */
export interface SlotDefinition {
  /** Número de slot */
  slot: number;
  /** Nombre del slot */
  name: string;
  /** Módulos compatibles */
  compatibleModules: string[];
  /** Módulo instalado por defecto */
  defaultModule?: string;
}

/**
 * Módulo HWIC/WIC
 */
export interface ModuleDefinition {
  /** ID del módulo */
  id: string;
  /** Nombre del módulo */
  name: string;
  /** Tipo de módulo */
  type: 'hwic' | 'wic' | 'nm' | 'sm' | 'pvdm';
  /** Puertos que añade */
  ports: PortDefinition[];
  /** Descripción */
  description?: string;
}

/**
 * Capacidades del dispositivo
 */
export interface DeviceCapabilities {
  // L2
  supportsVlans: boolean;
  maxVlans: number;
  supportsTrunk: boolean;
  supportsVtp: boolean;
  supportsStp: boolean;
  supportsEtherChannel: boolean;
  supportsPortSecurity: boolean;
  
  // L3
  supportsRouting: boolean;
  routingProtocols: ('static' | 'rip' | 'ospf' | 'eigrp' | 'bgp')[];
  supportsIpv6: boolean;
  supportsNat: boolean;
  
  // Seguridad
  supportsAcl: boolean;
  maxAcls: number;
  supportsFirewall: boolean;
  supportsVpn: boolean;
  
  // Wireless
  supportsWireless: boolean;
  wirelessStandards: ('802.11a' | '802.11b' | '802.11g' | '802.11n' | '802.11ac')[];
  
  // Servicios
  supportsDhcp: boolean;
  supportsDns: boolean;
  supportsHttp: boolean;
  supportsFtp: boolean;
  supportsSmtp: boolean;
  supportsNtp: boolean;
  
  // Management
  supportsSsh: boolean;
  supportsTelnet: boolean;
  supportsSnmp: boolean;
  supportsNetflow: boolean;
  
  // Hardware
  supportsModules: boolean;
  maxModules: number;
  supportsPoe: boolean;
  poeBudget?: number;  // Watts
}

/**
 * Entrada del catálogo de dispositivos
 */
export interface CatalogEntry {
  /** ID único en el catálogo */
  id: string;
  
  /** Nombre para mostrar */
  displayName: string;
  
  /** Familia del dispositivo */
  family: DeviceFamily;
  
  /** Modelo específico */
  model: string;
  
  /** Serie del dispositivo */
  series: string;
  
  /** Vendor */
  vendor: 'cisco' | 'generic' | 'meraki';
  
  /** Versión de Packet Tracer donde aparece */
  packetTracerVersion: string;
  
  /** Puertos fijos (no modulares) */
  fixedPorts: PortDefinition[];
  
  /** Slots disponibles */
  slots: SlotDefinition[];
  
  /** Módulos compatibles */
  compatibleModules: string[];
  
  /** Capacidades */
  capabilities: DeviceCapabilities;
  
  /** IOS por defecto */
  defaultIos?: string;
  
  /** Imagen/thumbnail */
  icon?: string;
  
  /** Descripción */
  description?: string;
  
  /** Notas de implementación */
  notes?: string;
}
```

---

### Tarea 1.2: Implementar Routers ISR 4000 Series

**Archivo:** `src/core/catalog/models/routers/isr-4000-series.ts`

```typescript
// src/core/catalog/models/routers/isr-4000-series.ts

import type { CatalogEntry, DeviceCapabilities } from '../../types';

const isr4000Capabilities: DeviceCapabilities = {
  // L2
  supportsVlans: true,
  maxVlans: 4094,
  supportsTrunk: true,
  supportsVtp: false,
  supportsStp: false,
  supportsEtherChannel: false,
  supportsPortSecurity: false,
  
  // L3
  supportsRouting: true,
  routingProtocols: ['static', 'rip', 'ospf', 'eigrp', 'bgp'],
  supportsIpv6: true,
  supportsNat: true,
  
  // Seguridad
  supportsAcl: true,
  maxAcls: 100,
  supportsFirewall: true,
  supportsVpn: true,
  
  // Wireless
  supportsWireless: false,
  wirelessStandards: [],
  
  // Servicios
  supportsDhcp: true,
  supportsDns: false,
  supportsHttp: false,
  supportsFtp: false,
  supportsSmtp: false,
  supportsNtp: true,
  
  // Management
  supportsSsh: true,
  supportsTelnet: true,
  supportsSnmp: true,
  supportsNetflow: true,
  
  // Hardware
  supportsModules: true,
  maxModules: 4,
  supportsPoe: false
};

export const isr4321: CatalogEntry = {
  id: 'cisco-isr4321',
  displayName: 'Cisco ISR 4321',
  family: 'router',
  model: 'ISR4321',
  series: 'ISR 4000',
  vendor: 'cisco',
  packetTracerVersion: '7.0+',
  
  fixedPorts: [
    { name: 'GigabitEthernet0/0/0', type: 'gigabit-ethernet', speed: 1000 },
    { name: 'GigabitEthernet0/0/1', type: 'gigabit-ethernet', speed: 1000 },
    { name: 'GigabitEthernet0', type: 'gigabit-ethernet', speed: 1000 },  // Management
    { name: 'Console', type: 'console', speed: 0 },
    { name: 'Aux', type: 'aux', speed: 0 },
    { name: 'USB', type: 'usb', speed: 480 }
  ],
  
  slots: [
    { slot: 0, name: 'NIM 0', compatibleModules: ['NIM-1GE-CU-SFP', 'NIM-2GE-CU-SFP', 'NIM-4GE-CU-SFP'], defaultModule: undefined },
    { slot: 1, name: 'NIM 1', compatibleModules: ['NIM-1GE-CU-SFP', 'NIM-2GE-CU-SFP', 'NIM-4GE-CU-SFP'], defaultModule: undefined },
    { slot: 2, name: 'NIM 2', compatibleModules: ['NIM-1GE-CU-SFP', 'NIM-2GE-CU-SFP', 'NIM-4GE-CU-SFP'], defaultModule: undefined },
    { slot: 3, name: 'SM 0', compatibleModules: ['SM-1T3E3', 'SM-2T3E3'], defaultModule: undefined }
  ],
  
  compatibleModules: [
    'NIM-1GE-CU-SFP',
    'NIM-2GE-CU-SFP', 
    'NIM-4GE-CU-SFP',
    'NIM-8X1GE-CU-SFP',
    'NIM-ES2-4',
    'NIM-ES2-8',
    'NIM-ES2-16',
    'SM-1T3E3',
    'SM-2T3E3'
  ],
  
  capabilities: isr4000Capabilities,
  
  defaultIos: '16.9.5',
  
  description: 'ISR 4321 - Entry-level branch router with 50-300 Mbps throughput',
  
  notes: 'Default configuration includes 2 built-in GigabitEthernet ports and 1 management port'
};

export const isr4331: CatalogEntry = {
  id: 'cisco-isr4331',
  displayName: 'Cisco ISR 4331',
  family: 'router',
  model: 'ISR4331',
  series: 'ISR 4000',
  vendor: 'cisco',
  packetTracerVersion: '7.0+',
  
  fixedPorts: [
    { name: 'GigabitEthernet0/0/0', type: 'gigabit-ethernet', speed: 1000 },
    { name: 'GigabitEthernet0/0/1', type: 'gigabit-ethernet', speed: 1000 },
    { name: 'GigabitEthernet0/0/2', type: 'gigabit-ethernet', speed: 1000 },
    { name: 'GigabitEthernet0', type: 'gigabit-ethernet', speed: 1000 },
    { name: 'Console', type: 'console', speed: 0 },
    { name: 'Aux', type: 'aux', speed: 0 },
    { name: 'USB', type: 'usb', speed: 480 }
  ],
  
  slots: [
    { slot: 0, name: 'NIM 0', compatibleModules: ['NIM-1GE-CU-SFP', 'NIM-2GE-CU-SFP', 'NIM-4GE-CU-SFP'], defaultModule: undefined },
    { slot: 1, name: 'NIM 1', compatibleModules: ['NIM-1GE-CU-SFP', 'NIM-2GE-CU-SFP', 'NIM-4GE-CU-SFP'], defaultModule: undefined },
    { slot: 2, name: 'NIM 2', compatibleModules: ['NIM-1GE-CU-SFP', 'NIM-2GE-CU-SFP', 'NIM-4GE-CU-SFP'], defaultModule: undefined },
    { slot: 3, name: 'NIM 3', compatibleModules: ['NIM-1GE-CU-SFP', 'NIM-2GE-CU-SFP', 'NIM-4GE-CU-SFP'], defaultModule: undefined },
    { slot: 4, name: 'SM 0', compatibleModules: ['SM-1T3E3', 'SM-2T3E3'], defaultModule: undefined }
  ],
  
  compatibleModules: [
    'NIM-1GE-CU-SFP',
    'NIM-2GE-CU-SFP',
    'NIM-4GE-CU-SFP',
    'NIM-8X1GE-CU-SFP',
    'NIM-ES2-4',
    'NIM-ES2-8',
    'NIM-ES2-16',
    'NIM-MSP-1',
    'SM-1T3E3',
    'SM-2T3E3'
  ],
  
  capabilities: isr4000Capabilities,
  
  defaultIos: '16.9.5',
  
  description: 'ISR 4331 - Mid-range branch router with 100-500 Mbps throughput'
};

export const isr4000SeriesRouters: CatalogEntry[] = [isr4321, isr4331];
```

---

### Tarea 1.3: Implementar Switches Catalyst 2960

**Archivo:** `src/core/catalog/models/switches/catalyst-2900-series.ts`

```typescript
// src/core/catalog/models/switches/catalyst-2900-series.ts

import type { CatalogEntry, DeviceCapabilities } from '../../types';

const catalyst2900Capabilities: DeviceCapabilities = {
  // L2
  supportsVlans: true,
  maxVlans: 255,
  supportsTrunk: true,
  supportsVtp: true,
  supportsStp: true,
  supportsEtherChannel: true,
  supportsPortSecurity: true,
  
  // L3
  supportsRouting: false,
  routingProtocols: [],
  supportsIpv6: false,
  supportsNat: false,
  
  // Seguridad
  supportsAcl: true,
  maxAcls: 50,
  supportsFirewall: false,
  supportsVpn: false,
  
  // Wireless
  supportsWireless: false,
  wirelessStandards: [],
  
  // Servicios
  supportsDhcp: true,  // DHCP snooping/relay
  supportsDns: false,
  supportsHttp: false,
  supportsFtp: false,
  supportsSmtp: false,
  supportsNtp: true,
  
  // Management
  supportsSsh: true,
  supportsTelnet: true,
  supportsSnmp: true,
  supportsNetflow: false,
  
  // Hardware
  supportsModules: false,
  maxModules: 0,
  supportsPoe: false
};

export const catalyst2960: CatalogEntry = {
  id: 'cisco-2960-24tt-l',
  displayName: 'Cisco 2960-24TT-L',
  family: 'switch',
  model: '2960-24TT-L',
  series: 'Catalyst 2960',
  vendor: 'cisco',
  packetTracerVersion: '6.0+',
  
  fixedPorts: [
    // 24 FastEthernet ports (0/1 to 0/24)
    ...Array.from({ length: 24 }, (_, i) => ({
      name: `FastEthernet0/${i + 1}`,
      type: 'fast-ethernet' as const,
      speed: 100
    })),
    // 2 GigabitEthernet uplinks (0/1 and 0/2)
    { name: 'GigabitEthernet0/1', type: 'gigabit-ethernet' as const, speed: 1000 },
    { name: 'GigabitEthernet0/2', type: 'gigabit-ethernet' as const, speed: 1000 },
    // Management
    { name: 'Console', type: 'console' as const, speed: 0 }
  ],
  
  slots: [],
  compatibleModules: [],
  
  capabilities: catalyst2900Capabilities,
  
  defaultIos: '15.0(2)SE',
  
  description: 'Catalyst 2960-24TT-L - 24 FastEthernet + 2 GigabitEthernet uplinks',
  
  notes: 'Standard CCNA lab switch. Port numbering starts at Fa0/1, not Fa0/0'
};

export const catalyst2960_48tt: CatalogEntry = {
  id: 'cisco-2960-48tt-l',
  displayName: 'Cisco 2960-48TT-L',
  family: 'switch',
  model: '2960-48TT-L',
  series: 'Catalyst 2960',
  vendor: 'cisco',
  packetTracerVersion: '7.0+',
  
  fixedPorts: [
    ...Array.from({ length: 48 }, (_, i) => ({
      name: `FastEthernet0/${i + 1}`,
      type: 'fast-ethernet' as const,
      speed: 100
    })),
    { name: 'GigabitEthernet0/1', type: 'gigabit-ethernet' as const, speed: 1000 },
    { name: 'GigabitEthernet0/2', type: 'gigabit-ethernet' as const, speed: 1000 },
    { name: 'Console', type: 'console' as const, speed: 0 }
  ],
  
  slots: [],
  compatibleModules: [],
  
  capabilities: catalyst2900Capabilities,
  
  defaultIos: '15.0(2)SE',
  
  description: 'Catalyst 2960-48TT-L - 48 FastEthernet + 2 GigabitEthernet uplinks'
};

export const catalyst2900SeriesSwitches: CatalogEntry[] = [catalyst2960, catalyst2960_48tt];
```

---

### Tarea 1.4: Implementar Multilayer Switches (3560/3650)

**Archivo:** `src/core/catalog/models/switches/catalyst-3500-series.ts`

```typescript
// src/core/catalog/models/switches/catalyst-3500-series.ts

import type { CatalogEntry, DeviceCapabilities } from '../../types';

const catalyst3500Capabilities: DeviceCapabilities = {
  // L2
  supportsVlans: true,
  maxVlans: 1005,
  supportsTrunk: true,
  supportsVtp: true,
  supportsStp: true,
  supportsEtherChannel: true,
  supportsPortSecurity: true,
  
  // L3
  supportsRouting: true,  // L3 switch
  routingProtocols: ['static', 'rip', 'ospf', 'eigrp'],
  supportsIpv6: true,
  supportsNat: false,
  
  // Seguridad
  supportsAcl: true,
  maxAcls: 100,
  supportsFirewall: false,
  supportsVpn: false,
  
  // Wireless
  supportsWireless: false,
  wirelessStandards: [],
  
  // Servicios
  supportsDhcp: true,
  supportsDns: false,
  supportsHttp: false,
  supportsFtp: false,
  supportsSmtp: false,
  supportsNtp: true,
  
  // Management
  supportsSsh: true,
  supportsTelnet: true,
  supportsSnmp: true,
  supportsNetflow: true,
  
  // Hardware
  supportsModules: false,
  maxModules: 0,
  supportsPoe: true,
  poeBudget: 370
};

export const catalyst3560_24ps: CatalogEntry = {
  id: 'cisco-3560-24ps',
  displayName: 'Cisco 3560-24PS',
  family: 'multilayer-switch',
  model: '3560-24PS',
  series: 'Catalyst 3560',
  vendor: 'cisco',
  packetTracerVersion: '6.0+',
  
  fixedPorts: [
    ...Array.from({ length: 24 }, (_, i) => ({
      name: `FastEthernet0/${i + 1}`,
      type: 'fast-ethernet' as const,
      speed: 100,
      poe: true
    })),
    { name: 'GigabitEthernet0/1', type: 'gigabit-ethernet' as const, speed: 1000 },
    { name: 'GigabitEthernet0/2', type: 'gigabit-ethernet' as const, speed: 1000 },
    { name: 'Console', type: 'console' as const, speed: 0 }
  ],
  
  slots: [],
  compatibleModules: [],
  
  capabilities: catalyst3500Capabilities,
  
  defaultIos: '15.0(2)SE',
  
  description: 'Catalyst 3560-24PS - 24 PoE FastEthernet + 2 GigabitEthernet uplinks. L3 routing capable.',
  
  notes: 'Supports inter-VLAN routing. PoE power budget: 370W'
};

export const catalyst3650_24ps: CatalogEntry = {
  id: 'cisco-3650-24ps',
  displayName: 'Cisco 3650-24PS',
  family: 'multilayer-switch',
  model: '3650-24PS',
  series: 'Catalyst 3650',
  vendor: 'cisco',
  packetTracerVersion: '7.0+',
  
  fixedPorts: [
    ...Array.from({ length: 24 }, (_, i) => ({
      name: `GigabitEthernet1/0/${i + 1}`,
      type: 'gigabit-ethernet' as const,
      speed: 1000,
      poe: true
    })),
    { name: 'GigabitEthernet1/1/1', type: 'gigabit-ethernet' as const, speed: 1000 },
    { name: 'GigabitEthernet1/1/2', type: 'gigabit-ethernet' as const, speed: 1000 },
    { name: 'GigabitEthernet1/1/3', type: 'gigabit-ethernet' as const, speed: 1000 },
    { name: 'GigabitEthernet1/1/4', type: 'gigabit-ethernet' as const, speed: 1000 },
    { name: 'Console', type: 'console' as const, speed: 0 }
  ],
  
  slots: [],
  compatibleModules: [],
  
  capabilities: {
    ...catalyst3500Capabilities,
    maxVlans: 4094,
    poeBudget: 740
  },
  
  defaultIos: '16.9.5',
  
  description: 'Catalyst 3650-24PS - 24 PoE GigabitEthernet. Modern L3 switch with UADP ASIC.',
  
  notes: 'Newer numbering scheme: Gi1/0/x for access ports, Gi1/1/x for uplinks. Supports StackWise-480.'
};

export const catalyst3500SeriesSwitches: CatalogEntry[] = [catalyst3560_24ps, catalyst3650_24ps];
```

---

### Tarea 1.5: Implementar End Devices

**Archivo:** `src/core/catalog/models/end-devices/computers.ts`

```typescript
// src/core/catalog/models/end-devices/computers.ts

import type { CatalogEntry, DeviceCapabilities } from '../../types';

const endDeviceCapabilities: DeviceCapabilities = {
  supportsVlans: false,
  maxVlans: 0,
  supportsTrunk: false,
  supportsVtp: false,
  supportsStp: false,
  supportsEtherChannel: false,
  supportsPortSecurity: false,
  supportsRouting: false,
  routingProtocols: [],
  supportsIpv6: true,
  supportsNat: false,
  supportsAcl: false,
  maxAcls: 0,
  supportsFirewall: false,
  supportsVpn: false,
  supportsWireless: false,
  wirelessStandards: [],
  supportsDhcp: true,  // DHCP client
  supportsDns: true,   // DNS client
  supportsHttp: true,  // HTTP client
  supportsFtp: true,   // FTP client
  supportsSmtp: true,  // SMTP client
  supportsNtp: true,
  supportsSsh: true,   // SSH client
  supportsTelnet: true, // Telnet client
  supportsSnmp: false,
  supportsNetflow: false,
  supportsModules: false,
  maxModules: 0,
  supportsPoe: false
};

const laptopCapabilities: DeviceCapabilities = {
  ...endDeviceCapabilities,
  supportsWireless: true,
  wirelessStandards: ['802.11n', '802.11ac']
};

export const pcPt: CatalogEntry = {
  id: 'pc-pt',
  displayName: 'PC-PT',
  family: 'pc',
  model: 'PC-PT',
  series: 'End Device',
  vendor: 'generic',
  packetTracerVersion: '5.0+',
  
  fixedPorts: [
    { name: 'FastEthernet0', type: 'fast-ethernet', speed: 100 },
    { name: 'RS232', type: 'console', speed: 0 }
  ],
  
  slots: [],
  compatibleModules: [],
  
  capabilities: endDeviceCapabilities,
  
  description: 'Generic PC for end-user simulation',
  
  notes: 'Has Desktop tab with IP configuration, Command Prompt, Web Browser, etc.'
};

export const laptopPt: CatalogEntry = {
  id: 'laptop-pt',
  displayName: 'Laptop-PT',
  family: 'laptop',
  model: 'Laptop-PT',
  series: 'End Device',
  vendor: 'generic',
  packetTracerVersion: '6.0+',
  
  fixedPorts: [
    { name: 'FastEthernet0', type: 'fast-ethernet', speed: 100 },
    { name: 'Wireless0', type: 'gigabit-ethernet', speed: 1000 },  // WiFi
    { name: 'RS232', type: 'console', speed: 0 }
  ],
  
  slots: [],
  compatibleModules: [],
  
  capabilities: laptopCapabilities,
  
  description: 'Laptop with wired and wireless connectivity'
};

export const tabletPt: CatalogEntry = {
  id: 'tablet-pc-pt',
  displayName: 'TabletPC-PT',
  family: 'tablet',
  model: 'TabletPC-PT',
  series: 'Mobile Device',
  vendor: 'generic',
  packetTracerVersion: '7.0+',
  
  fixedPorts: [
    { name: 'Wireless0', type: 'gigabit-ethernet', speed: 1000 }
  ],
  
  slots: [],
  compatibleModules: [],
  
  capabilities: {
    ...laptopCapabilities,
    supportsWireless: true,
    wirelessStandards: ['802.11n', '802.11ac']
  },
  
  description: 'Tablet device - wireless only'
};

export const smartphonePt: CatalogEntry = {
  id: 'smartphone-pt',
  displayName: 'SMARTPHONE-PT',
  family: 'smartphone',
  model: 'SMARTPHONE-PT',
  series: 'Mobile Device',
  vendor: 'generic',
  packetTracerVersion: '7.0+',
  
  fixedPorts: [
    { name: 'Wireless0', type: 'gigabit-ethernet', speed: 1000 },
    { name: 'USB', type: 'usb', speed: 480 }
  ],
  
  slots: [],
  compatibleModules: [],
  
  capabilities: {
    ...laptopCapabilities,
    supportsWireless: true,
    wirelessStandards: ['802.11n', '802.11ac']
  },
  
  description: 'Smartphone - wireless connectivity'
};

export const computerDevices: CatalogEntry[] = [pcPt, laptopPt, tabletPt, smartphonePt];
```

---

### Tarea 1.6: Catálogo Principal

**Archivo:** `src/core/catalog/device-catalog.ts`

```typescript
// src/core/catalog/device-catalog.ts

import type { CatalogEntry, DeviceFamily } from './types';

// Importar todos los modelos
import { isr4000SeriesRouters } from './models/routers/isr-4000-series';
import { isrG2SeriesRouters } from './models/routers/isr-g2-series';
import { isrSeriesRouters } from './models/routers/isr-series';
import { legacyRouters } from './models/routers/legacy-routers';
import { cellularRouters } from './models/routers/cellular-routers';
import { industrialRouters } from './models/routers/industrial-routers';

import { catalyst2900SeriesSwitches } from './models/switches/catalyst-2900-series';
import { catalyst3500SeriesSwitches } from './models/switches/catalyst-3500-series';
import { industrialSwitches } from './models/switches/industrial-switches';

import { computerDevices } from './models/end-devices/computers';
import { phoneDevices } from './models/end-devices/phones';
import { serverDevices } from './models/end-devices/servers';

import { accessPointDevices } from './models/wireless/access-points';
import { wirelessControllerDevices } from './models/wireless/controllers';

import { firewallDevices } from './models/security/firewalls';
import { wanDevices } from './models/wan/wan-devices';

/**
 * Catálogo completo de dispositivos Packet Tracer
 */
export const deviceCatalog: CatalogEntry[] = [
  // Routers
  ...isr4000SeriesRouters,
  ...isrG2SeriesRouters,
  ...isrSeriesRouters,
  ...legacyRouters,
  ...cellularRouters,
  ...industrialRouters,
  
  // Switches
  ...catalyst2900SeriesSwitches,
  ...catalyst3500SeriesSwitches,
  ...industrialSwitches,
  
  // End Devices
  ...computerDevices,
  ...phoneDevices,
  ...serverDevices,
  
  // Wireless
  ...accessPointDevices,
  ...wirelessControllerDevices,
  
  // Security
  ...firewallDevices,
  
  // WAN
  ...wanDevices
];

/**
 * Índice por ID para búsqueda rápida
 */
const catalogById = new Map<string, CatalogEntry>(
  deviceCatalog.map(entry => [entry.id, entry])
);

/**
 * Índice por familia
 */
const catalogByFamily = new Map<DeviceFamily, CatalogEntry[]>();
deviceCatalog.forEach(entry => {
  const family = entry.family;
  if (!catalogByFamily.has(family)) {
    catalogByFamily.set(family, []);
  }
  catalogByFamily.get(family)!.push(entry);
});

/**
 * Funciones de búsqueda
 */
export function getDeviceById(id: string): CatalogEntry | undefined {
  return catalogById.get(id);
}

export function getDevicesByFamily(family: DeviceFamily): CatalogEntry[] {
  return catalogByFamily.get(family) || [];
}

export function getDevicesBySeries(series: string): CatalogEntry[] {
  return deviceCatalog.filter(entry => entry.series === series);
}

export function searchDevices(query: string): CatalogEntry[] {
  const lowerQuery = query.toLowerCase();
  return deviceCatalog.filter(entry => 
    entry.displayName.toLowerCase().includes(lowerQuery) ||
    entry.model.toLowerCase().includes(lowerQuery) ||
    entry.series.toLowerCase().includes(lowerQuery) ||
    entry.description?.toLowerCase().includes(lowerQuery)
  );
}

export function getDevicesWithCapability(capability: keyof CatalogEntry['capabilities'], value?: boolean | number): CatalogEntry[] {
  return deviceCatalog.filter(entry => {
    const capValue = entry.capabilities[capability];
    if (value === undefined) {
      return !!capValue;
    }
    return capValue === value;
  });
}

// Exportar estadísticas
export const catalogStats = {
  total: deviceCatalog.length,
  byFamily: Object.fromEntries(catalogByFamily) as Record<DeviceFamily, number>
};
```

---

## Tests

### Tarea 1.7: Tests del Catálogo

**Archivo:** `src/core/catalog/__tests__/device-catalog.test.ts`

```typescript
// src/core/catalog/__tests__/device-catalog.test.ts

import { 
  deviceCatalog, 
  getDeviceById, 
  getDevicesByFamily,
  searchDevices,
  getDevicesWithCapability,
  catalogStats 
} from '../device-catalog';

describe('Device Catalog', () => {
  describe('Catalog Structure', () => {
    it('should have at least 50 devices', () => {
      expect(deviceCatalog.length).toBeGreaterThanOrEqual(50);
    });

    it('should have unique IDs for all devices', () => {
      const ids = deviceCatalog.map(d => d.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid entries', () => {
      deviceCatalog.forEach(entry => {
        expect(entry.id).toBeDefined();
        expect(entry.displayName).toBeDefined();
        expect(entry.family).toBeDefined();
        expect(entry.model).toBeDefined();
        expect(entry.fixedPorts).toBeInstanceOf(Array);
        expect(entry.capabilities).toBeDefined();
      });
    });
  });

  describe('Router Models', () => {
    it('should have ISR 4000 series routers', () => {
      const routers = getDevicesByFamily('router');
      const isr4000 = routers.filter(r => r.series === 'ISR 4000');
      
      expect(isr4000.length).toBeGreaterThan(0);
      expect(isr4000.some(r => r.model === 'ISR4321')).toBe(true);
      expect(isr4000.some(r => r.model === 'ISR4331')).toBe(true);
    });

    it('should have correct capabilities for ISR4321', () => {
      const isr4321 = getDeviceById('cisco-isr4321');
      
      expect(isr4321).toBeDefined();
      expect(isr4321?.capabilities.supportsRouting).toBe(true);
      expect(isr4321?.capabilities.routingProtocols).toContain('ospf');
      expect(isr4321?.capabilities.routingProtocols).toContain('eigrp');
      expect(isr4321?.capabilities.routingProtocols).toContain('bgp');
    });

    it('should have correct port count for ISR4321', () => {
      const isr4321 = getDeviceById('cisco-isr4321');
      
      expect(isr4321?.fixedPorts.length).toBe(6);  // 2 Gi, 1 Mgmt, Console, Aux, USB
      expect(isr4321?.slots.length).toBe(4);
    });
  });

  describe('Switch Models', () => {
    it('should have Catalyst 2960 switches', () => {
      const switches = getDevicesByFamily('switch');
      const cat2960 = switches.filter(s => s.series === 'Catalyst 2960');
      
      expect(cat2960.length).toBeGreaterThan(0);
    });

    it('should have 24 ports for 2960-24TT-L', () => {
      const cat2960 = getDeviceById('cisco-2960-24tt-l');
      
      expect(cat2960).toBeDefined();
      const faPorts = cat2960?.fixedPorts.filter(p => p.name.startsWith('FastEthernet'));
      expect(faPorts?.length).toBe(24);
      
      // Verify port numbering starts at 1, not 0
      expect(cat2960?.fixedPorts[0].name).toBe('FastEthernet0/1');
      expect(cat2960?.fixedPorts[23].name).toBe('FastEthernet0/24');
    });

    it('should have L3 capabilities for multilayer switches', () => {
      const mlSwitches = getDevicesByFamily('multilayer-switch');
      
      mlSwitches.forEach(sw => {
        expect(sw.capabilities.supportsRouting).toBe(true);
        expect(sw.capabilities.routingProtocols.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search Functions', () => {
    it('should find devices by search query', () => {
      const results = searchDevices('2960');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => 
        r.displayName.includes('2960') || 
        r.model.includes('2960') ||
        r.series.includes('2960')
      )).toBe(true);
    });

    it('should find devices by capability', () => {
      const bgpCapable = getDevicesWithCapability('routingProtocols');
      // Note: this checks if routingProtocols array is not empty
      
      expect(bgpCapable.length).toBeGreaterThan(0);
    });

    it('should find devices with PoE', () => {
      const poeDevices = getDevicesWithCapability('supportsPoe', true);
      
      expect(poeDevices.length).toBeGreaterThan(0);
      poeDevices.forEach(d => {
        expect(d.capabilities.supportsPoe).toBe(true);
      });
    });
  });

  describe('Catalog Statistics', () => {
    it('should have correct statistics', () => {
      expect(catalogStats.total).toBe(deviceCatalog.length);
      expect(catalogStats.byFamily).toBeDefined();
    });

    it('should count devices by family', () => {
      const routerCount = catalogStats.byFamily['router'] || 0;
      const switchCount = catalogStats.byFamily['switch'] || 0;
      
      expect(routerCount).toBeGreaterThan(0);
      expect(switchCount).toBeGreaterThan(0);
    });
  });
});
```

---

## Checklist de Completitud

### Modelos de Routers
- [ ] ISR 4000 Series (ISR4321, ISR4331, ISR4351, ISR4451)
- [ ] ISR G2 Series (1941, 2901, 2911, 2921, 2951)
- [ ] ISR Series (1841, 2811)
- [ ] Legacy (2620XM, 2621XM)
- [ ] Cellular (819, 829)
- [ ] Industrial (CGR1240, IR-8340, IR-1101)
- [ ] New (C8200)
- [ ] Generic (Router-PT)

### Modelos de Switches
- [ ] Catalyst 2960 (24, 48 ports)
- [ ] Catalyst 2950 (legacy)
- [ ] Catalyst 3560 (PoE, L3)
- [ ] Catalyst 3650 (PoE, L3)
- [ ] Industrial (IE2000, IE-3400, IE-9320)
- [ ] Generic (Bridge-PT, Switch-PT)

### End Devices
- [ ] PC-PT
- [ ] Laptop-PT
- [ ] Server-PT
- [ ] Meraki-Server
- [ ] Printer-PT
- [ ] 7960 IP Phone
- [ ] Analog-Phone-PT
- [ ] TabletPC-PT
- [ ] SMARTPHONE-PT
- [ ] TV-PT

### Wireless
- [ ] AccessPoint-PT (generic, A, N, AC)
- [ ] Aironet 3702i
- [ ] LAP-PT
- [ ] WLC-PT, WLC-2504, WLC-3504
- [ ] Home Gateway
- [ ] WRT300N

### Security
- [ ] ASA 5505
- [ ] ASA 5506
- [ ] Meraki-MX65W
- [ ] ISA-3000

### WAN/Cloud
- [ ] Cloud-PT
- [ ] DSL-Modem-PT
- [ ] Cable-Modem-PT
- [ ] Cell Tower
- [ ] Central Office Server

### Tests
- [ ] Unit tests para cada familia
- [ ] Integration tests para búsqueda
- [ ] Validación de puertos
- [ ] Validación de capacidades

---

## Siguiente Fase

Una vez completada la Fase 1, proceder a [FASE-2-PROTOCOLOS.md](./FASE-2-PROTOCOLOS.md) para implementar STP, EtherChannel, BGP y servicios.
