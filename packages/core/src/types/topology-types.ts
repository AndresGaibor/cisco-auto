/**
 * TOPOLOGY PLAN TYPES
 * 
 * Tipos específicos para el plan de topología
 */

export interface TopologyPlan {
  id: string;
  name: string;
  description?: string;
  devices: DevicePlan[];
  links: LinkPlan[];
  params: TopologyPlanParams;
  validation?: TopologyPlanValidation;
  metadata?: TopologyPlanMetadata;
}

export interface TopologyPlanParams {
  routerCount: number;
  switchCount: number;
  pcCount: number;
  serverCount?: number;
  networkType: NetworkType;
  routingProtocol?: RoutingProtocol;
  dhcpEnabled?: boolean;
  vlans?: number[];
  baseNetwork?: string;
  subnetMask?: string;
}

export type NetworkType = 
  | 'single_lan'
  | 'multi_lan'
  | 'multi_lan_wan'
  | 'star'
  | 'hub_spoke'
  | 'router_on_a_stick'
  | 'triangle'
  | 'custom';

export type RoutingProtocol = 'ospf' | 'eigrp' | 'bgp' | 'static' | 'none';

export interface DevicePlan {
  id: string;
  name: string;
  model: DeviceModelPlan;
  position: PlanPosition;
  interfaces: InterfacePlan[];
  vlans?: VLANPlan[];
  dhcp?: DHCPPlan[];
  routing?: RoutingPlan;
  credentials?: CredentialsPlan;
}

export interface DeviceModelPlan {
  name: string;
  type: 'router' | 'switch' | 'multilayer-switch' | 'pc' | 'server';
  ptType: string;
  ports: PortInfo[];
}

export interface PortInfo {
  name: string;
  type: 'ethernet' | 'serial' | 'fastethernet' | 'gigabitethernet';
  available: boolean;
}

export interface PlanPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface InterfacePlan {
  name: string;
  ip?: string;
  subnetMask?: string;
  configured: boolean;
  vlan?: number;
  description?: string;
}

export interface VLANPlan {
  id: number;
  name: string;
  dhcpPool?: string;
  ipRange?: string;
}

export interface DHCPPlan {
  poolName: string;
  network: string;
  subnetMask: string;
  defaultRouter: string;
  dnsServer?: string;
  exclude?: string[];
}

export interface RoutingPlan {
  protocol: RoutingProtocol;
  ospf?: OSPFPlanConfig;
  eigrp?: EIGRPPlanConfig;
  static?: StaticRoutePlan[];
}

export interface OSPFPlanConfig {
  processId: number;
  routerId?: string;
  areas: OSPFAreaPlan[];
  defaultRoute?: boolean;
}

export interface OSPFAreaPlan {
  area: number;
  networks: string[];
}

export interface EIGRPPlanConfig {
  asNumber: number;
  networks: string[];
  defaultRoute?: boolean;
}

export interface StaticRoutePlan {
  network: string;
  mask: string;
  nextHop: string;
}

export interface CredentialsPlan {
  username: string;
  password: string;
  enablePassword?: string;
}

export interface LinkPlan {
  id: string;
  from: LinkEndpoint;
  to: LinkEndpoint;
  cableType: CableTypePlan;
  validated: boolean;
  errors?: string[];
}

export interface LinkEndpoint {
  deviceId: string;
  deviceName: string;
  port: string;
}

export type CableTypePlan = 
  | 'straight-through'
  | 'crossover'
  | 'fiber'
  | 'serial'
  | 'console'
  | 'auto';

export interface TopologyPlanValidation {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: FixSuggestion[];
}

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  affected?: string;
  severity: 'error' | 'critical';
}

export type ValidationErrorType = 
  | 'invalid_model'
  | 'invalid_port'
  | 'invalid_cable'
  | 'ip_conflict'
  | 'duplicate_name'
  | 'missing_ip'
  | 'invalid_subnet'
  | 'port_unavailable'
  | 'vlan_mismatch'
  | 'routing_conflict';

export interface ValidationWarning {
  type: ValidationWarningType;
  message: string;
  affected?: string;
}

export type ValidationWarningType = 
  | 'suboptimal_cable'
  | 'unused_port'
  | 'unused_vlan'
  | 'recommendation';

export interface FixSuggestion {
  description: string;
  action: FixAction;
  autoFixable: boolean;
}

export interface FixAction {
  type: 'replace_ip' | 'change_cable' | 'use_alternative_port' | 'add_route';
  from: unknown;
  to: unknown;
}

export interface TopologyPlanMetadata {
  createdAt: Date;
  updatedAt?: Date;
  generatorVersion?: string;
  generatedBy?: string;
}
