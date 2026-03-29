/**
 * PROTOCOL SPECIFICATIONS
 * 
 * Definiciones de configuración para protocolos L2/L3 y servicios
 */

// =============================================================================
// LAYER 2 PROTOCOLS
// =============================================================================

/**
 * Configuración de STP (Spanning Tree Protocol)
 */
export interface STPSpec {
  /** Modo de STP */
  mode: 'pvst' | 'rapid-pvst' | 'mst';
  
  /** Prioridad del bridge (múltiplo de 4096, default 32768) */
  priority?: number;
  
  /** Configuración por VLAN */
  vlanConfig?: STPVlanConfig[];
  
  /** VLANs donde este switch es root primary */
  rootPrimary?: number[];
  
  /** VLANs donde este switch es root secondary */
  rootSecondary?: number[];
  
  /** PortFast habilitado globalmente para access ports */
  portfastDefault?: boolean;
  
  /** BPDU Guard habilitado globalmente */
  bpduguardDefault?: boolean;
  
  /** BPDU Filter habilitado globalmente */
  bpdufilterDefault?: boolean;
  
  /** Configuración específica de interfaces */
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
  portPriority?: number;
  linkType?: 'point-to-point' | 'shared';
}

/**
 * Configuración de EtherChannel
 */
export interface EtherChannelSpec {
  /** ID del channel group (1-64 en Catalyst) */
  groupId: number;
  
  /** Modo del canal */
  mode: 'active' | 'passive' | 'desirable' | 'auto' | 'on';
  
  /** Protocolo de negociación */
  protocol: 'lacp' | 'pagp' | 'static';
  
  /** Interfaces miembro del canal */
  interfaces: string[];
  
  /** Nombre del puerto lógico (Port-channelX) */
  portChannel: string;
  
  /** Modo del switchport en el canal */
  trunkMode?: 'access' | 'trunk';
  
  /** VLAN de acceso (si mode=access) */
  accessVlan?: number;
  
  /** VLAN nativa (si mode=trunk) */
  nativeVlan?: number;
  
  /** VLANs permitidas en trunk */
  allowedVlans?: number[] | 'all';
  
  /** Descripción del canal */
  description?: string;
  
  /** Load balancing method */
  loadBalancing?: 'src-dst-mac' | 'src-dst-ip' | 'src-mac' | 'dst-mac' | 'src-ip' | 'dst-ip';
}

/**
 * Configuración de Port Security
 */
export interface PortSecuritySpec {
  /** Interface a configurar */
  interface: string;
  
  /** Habilitar port security */
  enabled: boolean;
  
  /** Máximo número de MAC addresses permitidas */
  maxMacs?: number;
  
  /** Modo de violación */
  violationMode?: 'protect' | 'restrict' | 'shutdown';
  
  /** Habilitar sticky MAC learning */
  sticky?: boolean;
  
  /** MAC addresses estáticas permitidas */
  staticMacs?: string[];
  
  /** Tiempo de aging en minutos */
  agingTime?: number;
  
  /** Tipo de aging */
  agingType?: 'absolute' | 'inactivity';
}

// =============================================================================
// LAYER 3 PROTOCOLS
// =============================================================================

/**
 * Configuración de RIP
 */
export interface RIPSpec {
  /** Versión de RIP */
  version: 1 | 2;

  /** Redes a anunciar (ej: "192.168.1.0") */
  networks: string[];

  /** Interfaces pasivas (no envían updates) */
  passiveInterfaces?: string[];

  /** Originar ruta default */
  defaultRoute?: boolean;

  /** Alias for defaultRoute */
  defaultInformation?: 'originate' | 'originate always';

  /** Auto-summary (default: true en RIPv1, false recomendado en RIPv2) */
  autoSummary?: boolean;
  
  /** Redistribución de otras rutas */
  redistribute?: ('connected' | 'static' | 'ospf' | 'eigrp')[];
  
  /** Default metric para rutas redistribuidas */
  defaultMetric?: number;
}

/**
 * Configuración de BGP
 */
export interface BGPSpec {
  /** Número de AS local */
  asn: number;
  
  /** Router ID (formato IPv4) */
  routerId?: string;
  
  /** Vecinos BGP */
  neighbors: BGPNeighbor[];
  
  /** Redes a anunciar */
  networks?: {
    network: string;
    mask?: string;
    routeMap?: string;
  }[];
  
  /** Redistribución */
  redistribute?: {
    protocol: 'connected' | 'static' | 'ospf' | 'eigrp' | 'rip';
    routeMap?: string;
  }[];
  
  /** Sincronización (legacy, generalmente disabled) */
  synchronization?: boolean;
  
  /** Log de cambios de vecinos */
  logNeighborChanges?: boolean;
}

export interface BGPNeighbor {
  /** Dirección IP del vecino */
  ip: string;
  
  /** Número de AS remoto */
  remoteAs: number;
  
  /** Descripción del vecino */
  description?: string;
  
  /** Interfaz origen para updates (loopback) */
  updateSource?: string;
  
  /** Next-hop-self para este vecino */
  nextHopSelf?: boolean;
  
  /** Route-map inbound */
  routeMapIn?: string;
  
  /** Route-map outbound */
  routeMapOut?: string;
  
  /** Prefix-list inbound */
  prefixListIn?: string;
  
  /** Prefix-list outbound */
  prefixListOut?: string;
  
  /** Send community */
  sendCommunity?: 'both' | 'standard' | 'extended';
  
  /** Timers */
  timers?: {
    keepalive: number;
    holdtime: number;
  };
}

/**
 * Configuración de IPv6
 */
export interface IPv6Spec {
  /** Habilitar IPv6 unicast routing */
  routing?: boolean;
  
  /** Configuración de interfaces IPv6 */
  interfaces?: IPv6InterfaceConfig[];
  
  /** Rutas estáticas IPv6 */
  staticRoutes?: IPv6StaticRoute[];
  
  /** RIPng */
  ripng?: RIPngSpec;
  
  /** OSPFv3 */
  ospfv3?: OSPFv3Spec;
}

export interface IPv6InterfaceConfig {
  /** Nombre de la interfaz */
  name: string;
  
  /** Dirección IPv6 (ej: "2001:db8::1/64") */
  address?: string;
  
  /** Dirección link-local (ej: "fe80::1") */
  linkLocal?: string;
  
  /** EUI-64 addressing */
  eui64?: boolean;
  
  /** Autoconfiguración (SLAAC o DHCPv6) */
  autoConfig?: 'slaac' | 'dhcpv6';
  
  /** OSPFv3 en esta interfaz */
  ospfv3?: {
    processId: number;
    area: string;
  };
  
  /** RIPng en esta interfaz */
  ripng?: {
    enable: boolean;
    name?: string;
  };
}

export interface IPv6StaticRoute {
  /** Red destino (ej: "2001:db8:1::/64") */
  network: string;
  
  /** Next-hop IPv6 */
  nextHop: string;
  
  /** Interfaz de salida */
  interface?: string;
  
  /** Distancia administrativa */
  distance?: number;
  
  /** Nombre de la ruta */
  name?: string;
}

export interface RIPngSpec {
  /** Nombre del proceso RIPng */
  name: string;
  
  /** Redes a anunciar */
  networks?: string[];
  
  /** Redistribución */
  redistribute?: ('connected' | 'static' | 'ospf')[];
  
  /** Default information originate */
  defaultInformation?: boolean;
}

export interface OSPFv3Spec {
  /** ID del proceso OSPFv3 */
  processId: number;
  
  /** Router ID (formato IPv4) */
  routerId?: string;
  
  /** Áreas OSPFv3 */
  areas: OSPFv3Area[];
  
  /** Reference bandwidth */
  autoCostReferenceBandwidth?: number;
  
  /** Default route */
  defaultInformation?: 'originate' | 'originate always';
}

export interface OSPFv3Area {
  /** ID del área (ej: "0", "0.0.0.1") */
  areaId: string;
  
  /** Tipo de área */
  type?: 'normal' | 'stub' | 'nssa';
  
  /** Stub: no-summary */
  stubNoSummary?: boolean;
  
  /** NSSA: default-information-originate */
  nssaDefaultOriginate?: boolean;
}

// =============================================================================
// SERVICES
// =============================================================================

/**
 * Configuración de servicios
 */
export interface ServicesSpec {
  /** DHCP Server */
  dhcp?: DHCPServerSpec[];

  /** NTP */
  ntp?: NTPSpec;

  /** DNS Server (para Server-PT) */
  dns?: DNSServerSpec;

  /** HTTP/HTTPS Server */
  http?: HTTPSpec;

  /** FTP Server */
  ftp?: FTPSpec;

  /** SNMP */
  snmp?: SNMPSpec;

  /** Syslog */
  syslog?: SyslogSpec;

  /** SSH Server */
  ssh?: {
    enabled: boolean;
    version?: 1 | 2;
    ports?: number[];
  };

  /** Telnet Server */
  telnet?: {
    enabled: boolean;
    ports?: number[];
  };
}

/**
 * Configuración de DHCP Server (en router/switch)
 */
export interface DHCPServerSpec {
  /** Nombre del pool */
  poolName: string;
  
  /** Red del pool (ej: "192.168.1.0") */
  network: string;
  
  /** Máscara de subred */
  subnetMask: string;
  
  /** Default gateway */
  defaultRouter?: string;
  
  /** Servidores DNS */
  dnsServers?: string[];
  
  /** Nombre de dominio */
  domainName?: string;
  
  /** Direcciones excluidas del pool */
  excludedAddresses?: string[];
  
  /** Tiempo de lease en días */
  lease?: number | 'infinite';
  
  /** Opciones DHCP adicionales */
  options?: {
    code: number;
    value: string;
  }[];
  
  /** Nombre de clase (para relay) */
  className?: string;
}

/**
 * Configuración de NTP
 */
export interface NTPSpec {
  /** Servidores NTP */
  servers: {
    ip: string;
    prefer?: boolean;
    key?: number;
  }[];

  /** Actuar como servidor NTP */
  master?: boolean;

  /** Alias for master */
  serve?: boolean;

  /** Stratum level */
  stratum?: number;

  /** Autenticación */
  authentication?: {
    enabled: boolean;
    keys: {
      id: number;
      md5: string;
    }[];
    trustedKeys: number[];
  };
  
  /** Access control */
  accessGroup?: {
    peer?: string;  // ACL name
    serve?: string;
    serveOnly?: string;
    queryOnly?: string;
  };
  
  /** Source interface */
  sourceInterface?: string;
}

/**
 * Configuración de DNS Server (para Server-PT)
 */
export interface DNSServerSpec {
  /** Habilitar servidor DNS */
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
  
  /** MX records */
  mxRecords?: {
    hostname: string;
    mailServer: string;
    priority: number;
  }[];
  
  /** DNS forwarding */
  forwarding?: {
    enabled: boolean;
    servers: string[];
  };
}

/**
 * Configuración de HTTP Server
 */
export interface HTTPSpec {
  /** Habilitar HTTP */
  enabled: boolean;
  
  /** Puerto HTTP */
  port?: number;
  
  /** Puerto HTTPS */
  httpsPort?: number;
  
  /** Solo HTTPS */
  secureOnly?: boolean;
  
  /** Autenticación */
  authentication?: 'local' | 'aaa';
  
  /** Usuarios autorizados */
  user?: string;
  
  /** IP ACL */
  accessList?: string;
}

/**
 * Configuración de FTP Server
 */
export interface FTPSpec {
  /** Habilitar FTP */
  enabled: boolean;
  
  /** Usuarios FTP */
  users?: {
    username: string;
    password: string;
    permissions: 'read' | 'write' | 'full';
    homeDirectory?: string;
  }[];
  
  /** Puerto FTP */
  port?: number;
  
  /** Pasivo: rango de puertos */
  passivePorts?: {
    min: number;
    max: number;
  };
}

/**
 * Configuración de SNMP
 */
export interface SNMPSpec {
  /** Contacto */
  contact?: string;
  
  /** Ubicación */
  location?: string;
  
  /** SNMP v2c communities */
  communities?: {
    name: string;
    access: 'ro' | 'rw';
    acl?: string;
  }[];
  
  /** SNMP v3 */
  v3?: {
    enabled: boolean;
    users?: {
      name: string;
      group: string;
      auth: 'md5' | 'sha';
      authPassword: string;
      priv?: 'des' | 'aes';
      privPassword?: string;
    }[];
    groups?: {
      name: string;
      securityLevel: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
      read?: string;
      write?: string;
      notify?: string;
    }[];
  };
  
  /** SNMP traps */
  traps?: {
    enabled: boolean;
    hosts: {
      ip: string;
      community?: string;
      version?: '1' | '2c' | '3';
    }[];
    types?: string[];
  };
}

/**
 * Configuración de Syslog
 */
export interface SyslogSpec {
  /** Servidores syslog */
  servers: {
    ip: string;
    severity?: 'emergencies' | 'alerts' | 'critical' | 'errors' | 'warnings' | 'notifications' | 'informational' | 'debugging';
  }[];
  
  /** Source interface */
  sourceInterface?: string;
  
  /** Timestamp en mensajes */
  timestamp?: 'datetime' | 'uptime';
  
  /** Log a buffer local */
  buffered?: {
    enabled: boolean;
    size?: number;  // bytes
    severity?: string;
  };
  
  /** Log a console */
  console?: 'emergencies' | 'alerts' | 'critical' | 'errors' | 'warnings' | 'notifications' | 'informational' | 'debugging' | 'disabled';
}

// =============================================================================
// ROUTE MAPS AND PREFIX LISTS
// =============================================================================

/**
 * Configuración de Route Maps
 */
export interface RouteMapSpec {
  /** Nombre del route-map */
  name: string;
  
  /** Entradas del route-map */
  entries: {
    /** Número de secuencia */
    sequence: number;
    
    /** Acción */
    action: 'permit' | 'deny';
    
    /** Match conditions */
    match?: {
      ip?: {
        address?: string;  // ACL name
        prefixList?: string;
        nextHop?: string;
      };
      ipv6?: {
        address?: string;
        prefixList?: string;
      };
      asPath?: string;
      community?: string;
      metric?: number;
      tag?: number;
    };
    
    /** Set actions */
    set?: {
      asPathPrepend?: string;
      community?: string;
      localPreference?: number;
      metric?: number | 'metric-type' | 'igp-metric';
      nextHop?: string;
      origin?: 'igp' | 'egp' | 'incomplete';
      tag?: number;
      weight?: number;
    };
  }[];
}

/**
 * Configuración de Prefix Lists
 */
export interface PrefixListSpec {
  /** Nombre del prefix-list */
  name: string;
  
  /** Descripción */
  description?: string;
  
  /** Secuencia inicial */
  sequenceStart?: number;
  
  /** Entradas */
  entries: {
    sequence?: number;
    action: 'permit' | 'deny';
    prefix: string;
    ge?: number;  // greater-or-equal
    le?: number;  // less-or-equal
  }[];
}

// =============================================================================
// AGGREGATE TYPES
// =============================================================================

/**
 * Todos los protocolos L2
 */
export interface Layer2Protocols {
  stp?: STPSpec;
  etherChannel?: EtherChannelSpec[];
  portSecurity?: PortSecuritySpec[];
}

/**
 * Todos los protocolos L3 adicionales
 */
export interface Layer3Protocols {
  rip?: RIPSpec;
  bgp?: BGPSpec;
  ipv6?: IPv6Spec;
}

/**
 * Configuración completa de protocolos
 */
export interface ProtocolConfig {
  /** Protocolos Layer 2 */
  layer2?: Layer2Protocols;
  
  /** Protocolos Layer 3 adicionales */
  layer3?: Layer3Protocols;
  
  /** Servicios */
  services?: ServicesSpec;
  
  /** Route Maps */
  routeMaps?: RouteMapSpec[];
  
  /** Prefix Lists */
  prefixLists?: PrefixListSpec[];
}
