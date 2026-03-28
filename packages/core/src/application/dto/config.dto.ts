/**
 * DTOs para Configuración
 * Objetos de transferencia de datos para configuraciones de red
 */

// VLAN
export interface VlanConfigDto {
  id: number;
  name: string;
  description?: string;
}

export interface CreateVlanDto {
  switchName: string;
  vlanId: number;
  vlanName: string;
  ports?: string[];
  mode?: 'access' | 'trunk';
}

// Routing
export interface StaticRouteDto {
  destination: string;
  mask: string;
  nextHop: string;
  interface?: string;
  administrativeDistance?: number;
}

export interface CreateStaticRouteDto {
  routerName: string;
  destination: string;
  mask: string;
  nextHop: string;
  interface?: string;
}

export interface OspfConfigDto {
  processId: number;
  routerId?: string;
  networks: OspfNetworkDto[];
  passiveInterfaces?: string[];
}

export interface OspfNetworkDto {
  network: string;
  wildcard: string;
  area: number;
}

// DNS
export interface DnsRecordDto {
  name: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'PTR' | 'SOA' | 'SRV' | 'TXT';
  value: string;
  ttl?: number;
}

export interface DnsConfigDto {
  serverName: string;
  domainName: string;
  records: DnsRecordDto[];
}

// DHCP
export interface DhcpPoolDto {
  poolName: string;
  network: string;
  mask: string;
  defaultRouter?: string;
  dnsServer?: string;
  domainName?: string;
  leaseTime?: number;
  excludedAddresses?: string[];
}

export interface CreateDhcpPoolDto {
  routerName: string;
  poolName: string;
  network: string;
  mask: string;
  defaultRouter?: string;
  dnsServer?: string;
}

// ACL
export interface AclRuleDto {
  sequence?: number;
  action: 'permit' | 'deny';
  protocol: string;
  source: string;
  sourceWildcard?: string;
  destination?: string;
  destinationWildcard?: string;
  operator?: string;
  port?: number | string;
  log?: boolean;
}

export interface AclConfigDto {
  name: string;
  type: 'standard' | 'extended';
  rules: AclRuleDto[];
}

// NAT
export interface NatConfigDto {
  type: 'static' | 'dynamic' | 'overload';
  insideInterface: string;
  outsideInterface: string;
  localAddress?: string;
  globalAddress?: string;
  poolName?: string;
  poolStart?: string;
  poolEnd?: string;
  poolMask?: string;
}
