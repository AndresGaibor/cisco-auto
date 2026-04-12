// ============================================================================
// Topology Lint - Types
// ============================================================================

/**
 * Tipos de operaciones de red que se registran en el blueprint
 */
export type NetworkOperationType =
  | 'CREATE_VLAN'
  | 'CONFIGURE_TRUNK'
  | 'CONFIGURE_ACCESS_PORT'
  | 'CREATE_SVI'
  | 'CREATE_SUBINTERFACE'
  | 'CREATE_DHCP_POOL'
  | 'CONFIGURE_DHCP_RELAY'
  | 'CREATE_STATIC_ROUTE'
  | 'CONFIGURE_OSPF'
  | 'CONFIGURE_EIGRP'
  | 'CONFIGURE_BGP'
  | 'CREATE_ACL'
  | 'CONFIGURE_NAT'
  | 'CONFIGURE_SSH'
  | 'SET_IP_ADDRESS'
  | 'SET_DHCP_CLIENT';

/**
 * Operación de red registrada en el blueprint
 */
export interface NetworkOperation {
  id: string;
  type: NetworkOperationType;
  device: string;
  entity: string;
  expected: Record<string, unknown>;
  timestamp: Date;
  verified?: boolean;
}

/**
 * Blueprint incremental - construcción desde operaciones
 */
export interface TopologyBlueprint {
  devices: Record<string, DeviceBlueprint>;
  operations: NetworkOperation[];
  links: LinkBlueprint[];
  dhcpPools: DhcpPoolBlueprint[];
  vlans: VlanBlueprint[];
  routes: RouteBlueprint[];
  acls: AclBlueprint[];
}

/**
 * Blueprint de device
 */
export interface DeviceBlueprint {
  name: string;
  model?: string;
  type: 'router' | 'switch' | 'pc' | 'server' | 'cloud' | 'wireless';
  interfaces: InterfaceBlueprint[];
  vlans: string[]; // VLAN IDs configuradas
  svis: SviBlueprint[];
  subinterfaces: SubinterfaceBlueprint[];
}

/**
 * Blueprint de interfaz
 */
export interface InterfaceBlueprint {
  name: string;
  ip?: string;
  mask?: string;
  vlan?: number;
  mode?: 'access' | 'trunk';
  trunkVlanAllowed?: number[];
  trunkNativeVlan?: number;
  shutdown?: boolean;
  description?: string;
}

/**
 * Blueprint de SVI
 */
export interface SviBlueprint {
  vlan: number;
  ip?: string;
  mask?: string;
}

/**
 * Blueprint de subinterfaz
 */
export interface SubinterfaceBlueprint {
  number: string;
  encapsulation?: 'dot1q' | 'isl';
  vlan?: number;
  ip?: string;
  mask?: string;
}

/**
 * Blueprint de enlace
 */
export interface LinkBlueprint {
  id: string;
  deviceA: string;
  interfaceA: string;
  deviceB: string;
  interfaceB: string;
  type: string;
}

/**
 * Blueprint de VLAN
 */
export interface VlanBlueprint {
  id: number;
  name: string;
  devices: string[];
}

/**
 * Blueprint de pool DHCP
 */
export interface DhcpPoolBlueprint {
  id: string;
  device: string;
  network: string;
  mask: string;
  startIp: string;
  endIp: string;
  defaultRouter: string;
  vlan?: number;
}

/**
 * Blueprint de ruta
 */
export interface RouteBlueprint {
  id: string;
  device: string;
  type: 'static' | 'ospf' | 'eigrp' | 'bgp';
  network?: string;
  mask?: string;
  nextHop?: string;
  metric?: number;
}

/**
 * Blueprint de ACL
 */
export interface AclBlueprint {
  id: string;
  name: string;
  type: 'standard' | 'extended';
  device: string;
  appliedTo?: string[];
}

/**
 * Resultado de lint
 */
export interface LintResult {
  rule: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  entity: string;
  device?: string;
  suggestion?: string;
}

/**
 * Query de drift
 */
export interface DriftQueryResult {
  entity: string;
  missing: string[];
  conflicts: string[];
  suggestions: string[];
  severity: 'critical' | 'warning' | 'info';
}

/**
 * Regla de lint
 */
export interface LintRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  check: (blueprint: TopologyBlueprint, observed: ObservedState) => LintResult[];
}

/**
 * Estado observado (del lab real)
 */
export interface ObservedState {
  devices: Record<string, ObservedDevice>;
  links: ObservedLink[];
  vlans: ObservedVlan[];
  routes: ObservedRoute[];
  dhcpPools: ObservedDhcpPool[];
  acls: ObservedAcl[];
}

/**
 * Device observado
 */
export interface ObservedDevice {
  name: string;
  model: string;
  interfaces: ObservedInterface[];
  runningConfig?: string;
}

/**
 * Interfaz observada
 */
export interface ObservedInterface {
  name: string;
  ip?: string;
  mask?: string;
  status: 'up' | 'down';
  vlan?: number;
  mode?: 'access' | 'trunk';
  trunkVlanAllowed?: number[];
}

/**
 * Enlace observado
 */
export interface ObservedLink {
  deviceA: string;
  interfaceA: string;
  deviceB: string;
  interfaceB: string;
  status: 'connected' | 'disconnected';
}

/**
 * VLAN observada
 */
export interface ObservedVlan {
  id: number;
  name: string;
  state: 'active' | 'suspended';
}

/**
 * Ruta observada
 */
export interface ObservedRoute {
  device: string;
  type: string;
  network?: string;
  mask?: string;
  nextHop?: string;
  metric?: number;
}

/**
 * Pool DHCP observado
 */
export interface ObservedDhcpPool {
  device: string;
  network: string;
  mask: string;
  startIp: string;
  endIp: string;
  defaultRouter: string;
}

/**
 * ACL observada
 */
export interface ObservedAcl {
  device: string;
  name: string;
  type: 'standard' | 'extended';
  entries: string[];
  appliedTo?: string[];
}

/**
 * Interfaz del Topology Lint Service
 */
export interface ITopologyLintService {
  recordOperation(op: Omit<NetworkOperation, 'id' | 'timestamp'>): void;
  lint(): Promise<LintResult[]>;
  queryDrift(entity: string): Promise<DriftQueryResult>;
  getBlueprint(): TopologyBlueprint;
  listRules(): LintRule[];
  setObservedState(state: ObservedState): void;
}