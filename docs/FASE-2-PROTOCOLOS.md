# Fase 2: Protocolos Avanzados

> **Estado:** ✅ COMPLETADO  
> **Tests:** 34 tests (protocol-generators)  
> **Dependencias:** Fase 0 y Fase 1 completadas

## Objetivo

Implementar generación de configuración para protocolos L2/L3 y servicios que faltan:
- **L2:** STP, EtherChannel, Port Security
- **L3:** BGP, RIP, IPv6 routing
- **Servicios:** DHCP server, DNS server, NTP

---

## Estado Actual vs Objetivo

### Actual (implementado)

| Protocolo | Archivo | Estado |
|-----------|---------|--------|
| VLAN | `vlan-generator.ts` | ✅ Completo |
| VTP | `vlan-generator.ts` | ✅ Completo |
| Static routing | `routing-generator.ts` | ✅ Completo |
| OSPF | `routing-generator.ts` | ✅ Completo |
| EIGRP | `routing-generator.ts` | ✅ Completo |
| ACL | `security-generator.ts` | ✅ Completo |
| NAT | `security-generator.ts` | ✅ Completo |

### Objetivo (a implementar)

| Protocolo | Categoría | Prioridad |
|-----------|-----------|-----------|
| STP (PVST+, RPVST+) | L2 | Alta |
| EtherChannel (LACP, PAgP) | L2 | Alta |
| Port Security | L2 Security | Media |
| RIP v2 | L3 | Media |
| BGP (eBGP básico) | L3 | Media |
| IPv6 Routing | L3 | Media |
| DHCP Server | Services | Alta |
| DNS Server | Services | Media |
| NTP | Services | Baja |

---

## Estructura de Directorios

```
src/core/generators/
├── ios/
│   ├── index.ts
│   ├── base.generator.ts          # Existente
│   ├── vlan.generator.ts          # Existente
│   ├── routing.generator.ts       # Existente (expandir)
│   ├── security.generator.ts      # Existente
│   ├── stp.generator.ts           # ← NUEVO
│   ├── etherchannel.generator.ts  # ← NUEVO
│   ├── port-security.generator.ts # ← NUEVO
│   ├── ipv6.generator.ts          # ← NUEVO
│   └── services.generator.ts      # ← NUEVO
```

---

## Tareas Detalladas

### Tarea 2.1: Schemas para Nuevos Protocolos

**Archivo:** `src/core/canonical/protocol.spec.ts`

```typescript
// src/core/canonical/protocol.spec.ts

/**
 * Configuración de STP (Spanning Tree Protocol)
 */
export interface STPSpec {
  /** Modo de STP */
  mode: 'pvst' | 'rapid-pvst' | 'mst';
  
  /** Prioridad del bridge (múltiplo de 4096) */
  priority?: number;
  
  /** Configuración por VLAN */
  vlanConfig?: STPVlanConfig[];
  
  /** Root bridge primario para ciertas VLANs */
  rootPrimary?: number[];
  
  /** Root bridge secundario para ciertas VLANs */
  rootSecondary?: number[];
  
  /** PortFast habilitado globalmente */
  portfastDefault?: boolean;
  
  /** BPDU Guard habilitado globalmente */
  bpduguardDefault?: boolean;
  
  /** Configuración de interfaces STP */
  interfaceConfig?: STPInterfaceConfig[];
}

export interface STPVlanConfig {
  vlanId: number;
  priority?: number;
  rootPrimary?: boolean;
  rootSecondary?: boolean;
}

export interface STPInterfaceConfig {
  interface: string;
  portfast?: boolean;
  bpduguard?: boolean;
  bpdufilter?: boolean;
  cost?: number;
  priority?: number;
}

/**
 * Configuración de EtherChannel
 */
export interface EtherChannelSpec {
  /** ID del channel group */
  groupId: number;
  
  /** Modo del channel */
  mode: 'active' | 'passive' | 'desirable' | 'auto' | 'on';
  
  /** Protocolo (LACP o PAgP) */
  protocol: 'lacp' | 'pagp';
  
  /** Interfaces miembro */
  interfaces: string[];
  
  /** Puerto lógico (Port-channelX) */
  portChannel: string;
  
  /** Configuración del puerto lógico */
  trunkMode?: 'access' | 'trunk' | 'dynamic';
  
  /** VLAN nativa (para trunk) */
  nativeVlan?: number;
  
  /** VLANs permitidas (para trunk) */
  allowedVlans?: number[];
}

/**
 * Configuración de Port Security
 */
export interface PortSecuritySpec {
  /** Interface a configurar */
  interface: string;
  
  /** Habilitar port security */
  enabled: boolean;
  
  /** Máximo número de MACs */
  maxMacs?: number;
  
  /** Modo de violación */
  violationMode?: 'protect' | 'restrict' | 'shutdown';
  
  /** Sticky MAC addresses */
  sticky?: boolean;
  
  /** MACs estáticas permitidas */
  staticMacs?: string[];
  
  /** Aging time en minutos */
  agingTime?: number;
  
  /** Tipo de aging */
  agingType?: 'absolute' | 'inactivity';
}

/**
 * Configuración de RIP
 */
export interface RIPSpec {
  /** Versión */
  version: 1 | 2;
  
  /** Redes a anunciar */
  networks: string[];
  
  /** Interfaces pasivas */
  passiveInterfaces?: string[];
  
  /** Redistribute default route */
  defaultRoute?: boolean;
  
  /** Auto summary */
  autoSummary?: boolean;
  
  /** Split horizon */
  splitHorizon?: boolean;
}

/**
 * Configuración de BGP
 */
export interface BGPSpec {
  /** AS number */
  asn: number;
  
  /** Router ID */
  routerId?: string;
  
  /** Vecinos */
  neighbors: BGPNeighbor[];
  
  /** Redes a anunciar */
  networks: string[];
  
  /** Redistribute */
  redistribute?: ('connected' | 'static' | 'ospf' | 'eigrp')[];
}

export interface BGPNeighbor {
  /** IP del vecino */
  ip: string;
  
  /** AS remoto */
  remoteAs: number;
  
  /** Descripción */
  description?: string;
  
  /** Update source */
  updateSource?: string;
  
  /** Next-hop-self */
  nextHopSelf?: boolean;
  
  /** Route maps */
  routeMapIn?: string;
  routeMapOut?: string;
}

/**
 * Configuración de IPv6
 */
export interface IPv6Spec {
  /** Habilitar IPv6 routing */
  routing: boolean;
  
  /** Configuración de interfaces IPv6 */
  interfaces?: IPv6Interface[];
  
  /** Rutas estáticas IPv6 */
  staticRoutes?: IPv6StaticRoute[];
  
  /** OSPFv3 */
  ospfv3?: OSPFv3Spec;
}

export interface IPv6Interface {
  name: string;
  address?: string;  // e.g., "2001:db8::1/64"
  linkLocal?: string;  // e.g., "fe80::1/64"
  autoConfig?: 'slaac' | 'dhcpv6';
}

export interface IPv6StaticRoute {
  network: string;
  nextHop: string;
  interface?: string;
  distance?: number;
}

export interface OSPFv3Spec {
  processId: number;
  routerId?: string;
  areas: {
    areaId: string;
    networks: string[];
    type?: 'normal' | 'stub' | 'nssa';
  }[];
}

/**
 * Configuración de Servicios
 */
export interface ServiceSpec {
  /** DHCP Server */
  dhcp?: DHCPServerSpec;
  
  /** DNS Server */
  dns?: DNSServerSpec;
  
  /** NTP */
  ntp?: NTPSpec;
  
  /** HTTP/HTTPS */
  http?: HTTPSpec;
  
  /** FTP */
  ftp?: FTPSpec;
  
  /** SMTP */
  smtp?: SMTPSpec;
}

export interface DHCPServerSpec {
  /** Nombre del pool */
  poolName: string;
  
  /** Red del pool */
  network: string;
  
  /** Máscara */
  subnetMask: string;
  
  /** Gateway default */
  defaultRouter?: string;
  
  /** DNS servers */
  dnsServers?: string[];
  
  /** Dominio */
  domainName?: string;
  
  /** Rango de IPs excluidas */
  excludedAddresses?: string[];
  
  /** Lease time */
  leaseTime?: string;  // e.g., "7"
  
  /** Opciones adicionales */
  options?: Record<string, string>;
}

export interface DNSServerSpec {
  /** Habilitado */
  enabled: boolean;
  
  /** Registros A */
  aRecords?: {
    hostname: string;
    ip: string;
  }[];
  
  /** Registros CNAME */
  cnameRecords?: {
    alias: string;
    hostname: string;
  }[];
  
  /** DNS forwarding */
  forwarding?: {
    enabled: boolean;
    servers?: string[];
  };
}

export interface NTPSpec {
  /** Servidores NTP */
  servers: string[];
  
  /** Habilitar como servidor NTP */
  serve?: boolean;
  
  /** NTP authentication */
  authentication?: {
    enabled: boolean;
    keys?: {
      id: number;
      md5: string;
    }[];
    trustedKeys?: number[];
  };
}

export interface HTTPSpec {
  enabled: boolean;
  port?: number;
  httpsPort?: number;
  secureOnly?: boolean;
}

export interface FTPSpec {
  enabled: boolean;
  users?: {
    username: string;
    password: string;
    permissions: 'read' | 'write' | 'full';
  }[];
}

export interface SMTPSpec {
  enabled: boolean;
  domain?: string;
  relayHost?: string;
}
```

---

### Tarea 2.2: Generator de STP

**Archivo:** `src/core/generators/ios/stp.generator.ts`

```typescript
// src/core/generators/ios/stp.generator.ts

import type { STPSpec, STPInterfaceConfig } from '../../canonical/protocol.spec';

export class STPGenerator {
  /**
   * Genera configuración completa de STP
   */
  static generate(spec: STPSpec): string[] {
    const commands: string[] = [];
    
    // Modo de STP
    commands.push(this.generateMode(spec.mode));
    
    // Prioridad global
    if (spec.priority) {
      commands.push(`spanning-tree vlan 1-4094 priority ${spec.priority}`);
    }
    
    // Configuración por VLAN
    if (spec.vlanConfig) {
      commands.push(...spec.vlanConfig.flatMap(v => this.generateVlanConfig(v)));
    }
    
    // Root bridge
    if (spec.rootPrimary && spec.rootPrimary.length > 0) {
      const vlans = spec.rootPrimary.join(',');
      commands.push(`spanning-tree vlan ${vlans} root primary`);
    }
    
    if (spec.rootSecondary && spec.rootSecondary.length > 0) {
      const vlans = spec.rootSecondary.join(',');
      commands.push(`spanning-tree vlan ${vlans} root secondary`);
    }
    
    // Globales
    if (spec.portfastDefault) {
      commands.push('spanning-tree portfast default');
    }
    
    if (spec.bpduguardDefault) {
      commands.push('spanning-tree portfast bpduguard default');
    }
    
    // Configuración de interfaces
    if (spec.interfaceConfig) {
      commands.push(...spec.interfaceConfig.flatMap(ic => 
        this.generateInterfaceConfig(ic)
      ));
    }
    
    return commands;
  }
  
  private static generateMode(mode: STPSpec['mode']): string {
    switch (mode) {
      case 'pvst':
        return 'spanning-tree mode pvst';
      case 'rapid-pvst':
        return 'spanning-tree mode rapid-pvst';
      case 'mst':
        return 'spanning-tree mode mst';
    }
  }
  
  private static generateVlanConfig(config: STPSpec['vlanConfig'][0]): string[] {
    const commands: string[] = [];
    
    if (config.priority) {
      commands.push(`spanning-tree vlan ${config.vlanId} priority ${config.priority}`);
    }
    
    if (config.rootPrimary) {
      commands.push(`spanning-tree vlan ${config.vlanId} root primary`);
    }
    
    if (config.rootSecondary) {
      commands.push(`spanning-tree vlan ${config.vlanId} root secondary`);
    }
    
    return commands;
  }
  
  private static generateInterfaceConfig(config: STPInterfaceConfig): string[] {
    const commands: string[] = [];
    commands.push(`interface ${config.interface}`);
    
    if (config.portfast !== undefined) {
      if (config.portfast) {
        commands.push(' spanning-tree portfast');
      } else {
        commands.push(' no spanning-tree portfast');
      }
    }
    
    if (config.bpduguard !== undefined) {
      commands.push(config.bpduguard 
        ? ' spanning-tree bpduguard enable'
        : ' spanning-tree bpduguard disable'
      );
    }
    
    if (config.bpdufilter !== undefined) {
      commands.push(config.bpdufilter
        ? ' spanning-tree bpdufilter enable'
        : ' spanning-tree bpdufilter disable'
      );
    }
    
    if (config.cost) {
      commands.push(` spanning-tree cost ${config.cost}`);
    }
    
    if (config.priority) {
      commands.push(` spanning-tree port-priority ${config.priority}`);
    }
    
    return commands;
  }
  
  /**
   * Genera configuración de ejemplo
   */
  static generateExample(): string {
    const spec: STPSpec = {
      mode: 'rapid-pvst',
      rootPrimary: [1, 10, 20],
      portfastDefault: true,
      bpduguardDefault: true,
      interfaceConfig: [
        {
          interface: 'FastEthernet0/1',
          portfast: true,
          bpduguard: true
        },
        {
          interface: 'GigabitEthernet0/1',
          cost: 19
        }
      ]
    };
    
    return this.generate(spec).join('\n');
  }
}
```

---

### Tarea 2.3: Generator de EtherChannel

**Archivo:** `src/core/generators/ios/etherchannel.generator.ts`

```typescript
// src/core/generators/ios/etherchannel.generator.ts

import type { EtherChannelSpec } from '../../canonical/protocol.spec';

export class EtherChannelGenerator {
  /**
   * Genera configuración completa de EtherChannel
   */
  static generate(channels: EtherChannelSpec[]): string[] {
    const commands: string[] = [];
    
    for (const channel of channels) {
      commands.push(...this.generateChannel(channel));
    }
    
    return commands;
  }
  
  private static generateChannel(spec: EtherChannelSpec): string[] {
    const commands: string[] = [];
    
    // Configurar interfaces miembro
    for (const iface of spec.interfaces) {
      commands.push(`interface ${iface}`);
      commands.push(` channel-group ${spec.groupId} mode ${spec.mode}`);
      commands.push(' exit');
    }
    
    // Configurar puerto lógico
    commands.push(`interface ${spec.portChannel}`);
    
    if (spec.trunkMode) {
      commands.push(` switchport mode ${spec.trunkMode}`);
    }
    
    if (spec.nativeVlan) {
      commands.push(` switchport trunk native vlan ${spec.nativeVlan}`);
    }
    
    if (spec.allowedVlans) {
      const vlans = spec.allowedVlans.join(',');
      commands.push(` switchport trunk allowed vlan ${vlans}`);
    }
    
    commands.push(' exit');
    
    return commands;
  }
  
  /**
   * Valida configuración de EtherChannel
   */
  static validate(spec: EtherChannelSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validar grupo ID (1-64 en Catalyst)
    if (spec.groupId < 1 || spec.groupId > 64) {
      errors.push(`Group ID ${spec.groupId} must be between 1 and 64`);
    }
    
    // Validar interfaces
    if (spec.interfaces.length < 2) {
      errors.push('EtherChannel requires at least 2 interfaces');
    }
    
    if (spec.interfaces.length > 8) {
      errors.push('EtherChannel supports maximum 8 interfaces');
    }
    
    // Validar modo vs protocolo
    if (spec.protocol === 'lacp' && spec.mode === 'desirable') {
      errors.push('LACP does not support "desirable" mode. Use "active" or "passive"');
    }
    
    if (spec.protocol === 'pagp' && spec.mode === 'active') {
      errors.push('PAgP does not support "active" mode. Use "desirable" or "auto"');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Genera configuración de ejemplo LACP
   */
  static generateExampleLACP(): string {
    const spec: EtherChannelSpec = {
      groupId: 1,
      mode: 'active',
      protocol: 'lacp',
      interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
      portChannel: 'Port-channel1',
      trunkMode: 'trunk',
      nativeVlan: 1,
      allowedVlans: [1, 10, 20, 30]
    };
    
    return this.generate([spec]).join('\n');
  }
  
  /**
   * Genera configuración de ejemplo PAgP
   */
  static generateExamplePAgP(): string {
    const spec: EtherChannelSpec = {
      groupId: 2,
      mode: 'desirable',
      protocol: 'pagp',
      interfaces: ['GigabitEthernet1/0/1', 'GigabitEthernet1/0/2'],
      portChannel: 'Port-channel2',
      trunkMode: 'trunk'
    };
    
    return this.generate([spec]).join('\n');
  }
}
```

---

### Tarea 2.4: Generator de RIP

**Archivo:** `src/core/generators/ios/routing.generator.ts` (expandir)

```typescript
// Añadir a src/core/generators/ios/routing.generator.ts

import type { RIPSpec, BGPSpec, BGPNeighbor } from '../../canonical/protocol.spec';

export class RoutingGenerator {
  // ... código existente para static, OSPF, EIGRP ...
  
  /**
   * Genera configuración de RIP
   */
  static generateRIP(spec: RIPSpec): string[] {
    const commands: string[] = [];
    
    commands.push('router rip');
    commands.push(` version ${spec.version}`);
    
    for (const network of spec.networks) {
      commands.push(` network ${network}`);
    }
    
    if (spec.passiveInterfaces) {
      for (const iface of spec.passiveInterfaces) {
        commands.push(` passive-interface ${iface}`);
      }
    }
    
    if (spec.defaultRoute) {
      commands.push(' default-information originate');
    }
    
    if (!spec.autoSummary) {
      commands.push(' no auto-summary');
    }
    
    if (spec.splitHorizon === false) {
      // Nota: esto va en configuración de interfaz
      // Se añade como comentario para referencia
      commands.push(' ! Note: split-horizon disabled on interfaces');
    }
    
    commands.push(' exit');
    
    return commands;
  }
  
  /**
   * Genera configuración de BGP
   */
  static generateBGP(spec: BGPSpec): string[] {
    const commands: string[] = [];
    
    commands.push(`router bgp ${spec.asn}`);
    
    if (spec.routerId) {
      commands.push(` bgp router-id ${spec.routerId}`);
    }
    
    // Configurar vecinos
    for (const neighbor of spec.neighbors) {
      commands.push(...this.generateBGPNeighbor(neighbor));
    }
    
    // Anunciar redes
    for (const network of spec.networks) {
      commands.push(` network ${network}`);
    }
    
    // Redistribute
    if (spec.redistribute) {
      for (const proto of spec.redistribute) {
        commands.push(` redistribute ${proto}`);
      }
    }
    
    commands.push(' exit');
    
    return commands;
  }
  
  private static generateBGPNeighbor(neighbor: BGPNeighbor): string[] {
    const commands: string[] = [];
    
    commands.push(` neighbor ${neighbor.ip} remote-as ${neighbor.remoteAs}`);
    
    if (neighbor.description) {
      commands.push(` neighbor ${neighbor.ip} description ${neighbor.description}`);
    }
    
    if (neighbor.updateSource) {
      commands.push(` neighbor ${neighbor.ip} update-source ${neighbor.updateSource}`);
    }
    
    if (neighbor.nextHopSelf) {
      commands.push(` neighbor ${neighbor.ip} next-hop-self`);
    }
    
    if (neighbor.routeMapIn) {
      commands.push(` neighbor ${neighbor.ip} route-map ${neighbor.routeMapIn} in`);
    }
    
    if (neighbor.routeMapOut) {
      commands.push(` neighbor ${neighbor.ip} route-map ${neighbor.routeMapOut} out`);
    }
    
    return commands;
  }
}
```

---

### Tarea 2.5: Generator de DHCP Server

**Archivo:** `src/core/generators/ios/services.generator.ts`

```typescript
// src/core/generators/ios/services.generator.ts

import type { 
  DHCPServerSpec, 
  DNSServerSpec, 
  NTPSpec,
  HTTPSpec,
  FTPSpec 
} from '../../canonical/protocol.spec';

export class ServicesGenerator {
  /**
   * Genera configuración de DHCP Server (en router/switch)
   */
  static generateDHCP(spec: DHCPServerSpec): string[] {
    const commands: string[] = [];
    
    // Excluir direcciones
    if (spec.excludedAddresses) {
      for (const addr of spec.excludedAddresses) {
        commands.push(`ip dhcp excluded-address ${addr}`);
      }
    }
    
    // Crear pool
    commands.push(`ip dhcp pool ${spec.poolName}`);
    commands.push(` network ${spec.network} ${spec.subnetMask}`);
    
    if (spec.defaultRouter) {
      commands.push(` default-router ${spec.defaultRouter}`);
    }
    
    if (spec.dnsServers && spec.dnsServers.length > 0) {
      commands.push(` dns-server ${spec.dnsServers.join(' ')}`);
    }
    
    if (spec.domainName) {
      commands.push(` domain-name ${spec.domainName}`);
    }
    
    if (spec.leaseTime) {
      commands.push(` lease ${spec.leaseTime}`);
    }
    
    // Opciones adicionales
    if (spec.options) {
      for (const [code, value] of Object.entries(spec.options)) {
        commands.push(` option ${code} ${value}`);
      }
    }
    
    commands.push(' exit');
    
    return commands;
  }
  
  /**
   * Genera configuración de NTP
   */
  static generateNTP(spec: NTPSpec): string[] {
    const commands: string[] = [];
    
    // Servidores NTP
    for (const server of spec.servers) {
      commands.push(`ntp server ${server}`);
    }
    
    // Servidor NTP
    if (spec.serve) {
      commands.push('ntp master');
    }
    
    // Autenticación
    if (spec.authentication?.enabled) {
      commands.push('ntp authenticate');
      
      if (spec.authentication.keys) {
        for (const key of spec.authentication.keys) {
          commands.push(`ntp authentication-key ${key.id} md5 ${key.md5}`);
        }
      }
      
      if (spec.authentication.trustedKeys) {
        for (const keyId of spec.authentication.trustedKeys) {
          commands.push(`ntp trusted-key ${keyId}`);
        }
      }
    }
    
    return commands;
  }
  
  /**
   * Genera configuración para Server-PT (no IOS)
   * Esta es configuración especial para el modelo Server de Packet Tracer
   */
  static generateServerPTConfig(spec: {
    dhcp?: DHCPServerSpec;
    dns?: DNSServerSpec;
    http?: HTTPSpec;
    ftp?: FTPSpec;
  }): { service: string; config: Record<string, unknown> }[] {
    const configs: { service: string; config: Record<string, unknown> }[] = [];
    
    if (spec.dns) {
      configs.push({
        service: 'DNS',
        config: {
          enabled: spec.dns.enabled,
          aRecords: spec.dns.aRecords || [],
          cnameRecords: spec.dns.cnameRecords || [],
          forwarding: spec.dns.forwarding || { enabled: false }
        }
      });
    }
    
    if (spec.http) {
      configs.push({
        service: 'HTTP',
        config: {
          enabled: spec.http.enabled,
          port: spec.http.port || 80,
          httpsPort: spec.http.httpsPort || 443,
          secureOnly: spec.http.secureOnly || false
        }
      });
    }
    
    if (spec.ftp) {
      configs.push({
        service: 'FTP',
        config: {
          enabled: spec.ftp.enabled,
          users: spec.ftp.users || []
        }
      });
    }
    
    return configs;
  }
}
```

---

### Tarea 2.6: Generator de IPv6

**Archivo:** `src/core/generators/ios/ipv6.generator.ts`

```typescript
// src/core/generators/ios/ipv6.generator.ts

import type { IPv6Spec, IPv6Interface, IPv6StaticRoute, OSPFv3Spec } from '../../canonical/protocol.spec';

export class IPv6Generator {
  /**
   * Genera configuración completa de IPv6
   */
  static generate(spec: IPv6Spec): string[] {
    const commands: string[] = [];
    
    // Habilitar IPv6 routing
    if (spec.routing) {
      commands.push('ipv6 unicast-routing');
    }
    
    // Configurar interfaces
    if (spec.interfaces) {
      for (const iface of spec.interfaces) {
        commands.push(...this.generateInterface(iface));
      }
    }
    
    // Rutas estáticas
    if (spec.staticRoutes) {
      for (const route of spec.staticRoutes) {
        commands.push(...this.generateStaticRoute(route));
      }
    }
    
    // OSPFv3
    if (spec.ospfv3) {
      commands.push(...this.generateOSPFv3(spec.ospfv3));
    }
    
    return commands;
  }
  
  private static generateInterface(spec: IPv6Interface): string[] {
    const commands: string[] = [];
    
    commands.push(`interface ${spec.name}`);
    commands.push(' ipv6 enable');
    
    if (spec.address) {
      commands.push(` ipv6 address ${spec.address}`);
    }
    
    if (spec.linkLocal) {
      commands.push(` ipv6 address ${spec.linkLocal} link-local`);
    }
    
    if (spec.autoConfig) {
      if (spec.autoConfig === 'slaac') {
        commands.push(' ipv6 address autoconfig');
      } else if (spec.autoConfig === 'dhcpv6') {
        commands.push(' ipv6 address dhcp');
      }
    }
    
    commands.push(' exit');
    
    return commands;
  }
  
  private static generateStaticRoute(spec: IPv6StaticRoute): string[] {
    const commands: string[] = [];
    
    let cmd = `ipv6 route ${spec.network} ${spec.nextHop}`;
    
    if (spec.interface) {
      cmd = `ipv6 route ${spec.network} ${spec.interface} ${spec.nextHop}`;
    }
    
    if (spec.distance) {
      cmd += ` ${spec.distance}`;
    }
    
    commands.push(cmd);
    
    return commands;
  }
  
  private static generateOSPFv3(spec: OSPFv3Spec): string[] {
    const commands: string[] = [];
    
    commands.push(`ipv6 router ospf ${spec.processId}`);
    
    if (spec.routerId) {
      commands.push(` router-id ${spec.routerId}`);
    }
    
    for (const area of spec.areas) {
      for (const network of area.networks) {
        // OSPFv3 usa ipv6 ospf en interfaces, no network commands
        commands.push(` ! Area ${area.areaId}: ${network}`);
      }
      
      if (area.type === 'stub') {
        commands.push(` area ${area.areaId} stub`);
      } else if (area.type === 'nssa') {
        commands.push(` area ${area.areaId} nssa`);
      }
    }
    
    commands.push(' exit');
    
    // Añadir comandos de interfaz para OSPFv3
    commands.push(' ! Note: Add "ipv6 ospf <process-id> area <area-id>" on interfaces');
    
    return commands;
  }
}
```

---

### Tarea 2.7: Actualizar DeviceSpec para nuevos protocolos

**Archivo:** `src/core/canonical/device.spec.ts` (actualizar)

```typescript
// Añadir a DeviceSpec

import type { 
  STPSpec, 
  EtherChannelSpec, 
  PortSecuritySpec,
  RIPSpec,
  BGPSpec,
  IPv6Spec,
  ServiceSpec 
} from './protocol.spec';

export interface DeviceSpec {
  // ... campos existentes ...
  
  /** Configuración de STP (solo switches) */
  stp?: STPSpec;
  
  /** Configuración de EtherChannel */
  etherChannel?: EtherChannelSpec[];
  
  /** Configuración de Port Security */
  portSecurity?: PortSecuritySpec[];
  
  /** Configuración de RIP */
  rip?: RIPSpec;
  
  /** Configuración de BGP */
  bgp?: BGPSpec;
  
  /** Configuración de IPv6 */
  ipv6?: IPv6Spec;
  
  /** Configuración de servicios */
  services?: ServiceSpec;
}
```

---

### Tarea 2.8: Actualizar IOSGenerator Principal

**Archivo:** `src/core/generators/ios/ios-generator.ts` (actualizar)

```typescript
// Actualizar src/core/generators/ios/ios-generator.ts

import type { DeviceSpec } from '../../canonical/device.spec';
import { BaseGenerator } from './base.generator';
import { VlanGenerator } from './vlan.generator';
import { RoutingGenerator } from './routing.generator';
import { SecurityGenerator } from './security.generator';
import { STPGenerator } from './stp.generator';
import { EtherChannelGenerator } from './etherchannel.generator';
import { PortSecurityGenerator } from './port-security.generator';
import { IPv6Generator } from './ipv6.generator';
import { ServicesGenerator } from './services.generator';

export interface GeneratedConfig {
  device: string;
  lines: string[];
  sections: Record<string, string[]>;
}

export class IOSGenerator {
  static generate(device: DeviceSpec): GeneratedConfig {
    const sections: Record<string, string[]> = {};
    
    // Basic config
    sections['basic'] = BaseGenerator.generateBasic(device);
    
    // VLANs and interfaces
    sections['interfaces'] = VlanGenerator.generateInterfaces(device);
    
    if (device.vlans) {
      sections['vlans'] = VlanGenerator.generateVLANs(device.vlans, device.vtp);
    }
    
    if (device.vtp) {
      sections['vtp'] = VlanGenerator.generateVTP(device.vtp);
    }
    
    // NEW: STP
    if (device.stp) {
      sections['stp'] = STPGenerator.generate(device.stp);
    }
    
    // NEW: EtherChannel
    if (device.etherChannel) {
      sections['etherchannel'] = EtherChannelGenerator.generate(device.etherChannel);
    }
    
    // NEW: Port Security
    if (device.portSecurity) {
      sections['port-security'] = PortSecurityGenerator.generate(device.portSecurity);
    }
    
    // Routing (existente + nuevos)
    if (device.routing) {
      sections['routing'] = RoutingGenerator.generateRouting(device.routing);
    }
    
    // NEW: RIP
    if (device.rip) {
      sections['rip'] = RoutingGenerator.generateRIP(device.rip);
    }
    
    // NEW: BGP
    if (device.bgp) {
      sections['bgp'] = RoutingGenerator.generateBGP(device.bgp);
    }
    
    // NEW: IPv6
    if (device.ipv6) {
      sections['ipv6'] = IPv6Generator.generate(device.ipv6);
    }
    
    // Security
    if (device.security?.acls) {
      sections['acls'] = SecurityGenerator.generateACLs(device.security.acls);
    }
    
    if (device.security?.nat) {
      sections['nat'] = SecurityGenerator.generateNAT(device.security.nat);
    }
    
    // NEW: Services
    if (device.services?.dhcp) {
      sections['dhcp'] = ServicesGenerator.generateDHCP(device.services.dhcp);
    }
    
    if (device.services?.ntp) {
      sections['ntp'] = ServicesGenerator.generateNTP(device.services.ntp);
    }
    
    // Lines
    if (device.lines) {
      sections['lines'] = BaseGenerator.generateLines(device.lines);
    }
    
    // Flatten
    const lines: string[] = [];
    lines.push('!');
    lines.push(`! Configuration for ${device.name}`);
    lines.push('!');
    
    for (const [section, cmds] of Object.entries(sections)) {
      lines.push(`! ${section.toUpperCase()}`);
      lines.push(...cmds);
      lines.push('!');
    }
    
    lines.push('end');
    
    return {
      device: device.name,
      lines,
      sections
    };
  }
}
```

---

## Tests

### Tarea 2.9: Tests de Generadores

**Archivo:** `src/core/generators/__tests__/stp.generator.test.ts`

```typescript
// src/core/generators/__tests__/stp.generator.test.ts

import { STPGenerator } from '../ios/stp.generator';
import type { STPSpec } from '../../canonical/protocol.spec';

describe('STPGenerator', () => {
  describe('generate', () => {
    it('should generate rapid-pvst configuration', () => {
      const spec: STPSpec = {
        mode: 'rapid-pvst',
        rootPrimary: [1, 10, 20]
      };
      
      const config = STPGenerator.generate(spec);
      
      expect(config).toContain('spanning-tree mode rapid-pvst');
      expect(config).toContain('spanning-tree vlan 1,10,20 root primary');
    });

    it('should generate interface configuration', () => {
      const spec: STPSpec = {
        mode: 'rapid-pvst',
        interfaceConfig: [
          {
            interface: 'FastEthernet0/1',
            portfast: true,
            bpduguard: true
          }
        ]
      };
      
      const config = STPGenerator.generate(spec);
      
      expect(config).toContain('interface FastEthernet0/1');
      expect(config).toContain('spanning-tree portfast');
      expect(config).toContain('spanning-tree bpduguard enable');
    });

    it('should generate PVST+ with VLAN priorities', () => {
      const spec: STPSpec = {
        mode: 'pvst',
        vlanConfig: [
          { vlanId: 10, priority: 4096 },
          { vlanId: 20, priority: 8192 }
        ]
      };
      
      const config = STPGenerator.generate(spec);
      
      expect(config).toContain('spanning-tree mode pvst');
      expect(config).toContain('spanning-tree vlan 10 priority 4096');
      expect(config).toContain('spanning-tree vlan 20 priority 8192');
    });
  });
});

// Similar tests para EtherChannel, RIP, BGP, IPv6, Services...
```

---

## Checklist de Completitud

### Generadores L2
- [ ] STP Generator completo (PVST+, RPVST+, MST)
- [ ] EtherChannel Generator (LACP, PAgP)
- [ ] Port Security Generator

### Generadores L3
- [ ] RIP Generator
- [ ] BGP Generator (eBGP básico)
- [ ] IPv6 Generator (routing, interfaces, OSPFv3)

### Generadores de Servicios
- [ ] DHCP Server Generator
- [ ] NTP Generator
- [ ] DNS/HTTP/FTP para Server-PT

### Schemas
- [ ] STPSpec
- [ ] EtherChannelSpec
- [ ] PortSecuritySpec
- [ ] RIPSpec
- [ ] BGPSpec
- [ ] IPv6Spec
- [ ] ServiceSpec

### Tests
- [ ] Unit tests para cada generador
- [ ] Integration tests con DeviceSpec completo
- [ ] Validación de sintaxis IOS generada

---

## Siguiente Fase

Una vez completada la Fase 2, proceder a [FASE-3-DEPLOYMENT.md](./FASE-3-DEPLOYMENT.md) para implementar el motor de despliegue SSH/Telnet.
