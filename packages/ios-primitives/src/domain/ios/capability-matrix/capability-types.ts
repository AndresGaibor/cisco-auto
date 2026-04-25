// ============================================================================
// Capability Matrix - Types
// ============================================================================

/**
 * Tipo de superficie de operación
 */
export type SurfaceType = 'ios' | 'hostport' | 'dhcp-appliance' | 'wireless-ap';

/**
 * Tipo de operación soportada
 */
export type OperationType =
  | 'vlan'
  | 'trunk'
  | 'access-port'
  | 'svi'
  | 'subinterface'
  | 'dhcp-pool'
  | 'dhcp-relay'
  | 'static-route'
  | 'ospf'
  | 'eigrp'
  | 'bgp'
  | 'acl-standard'
  | 'acl-extended'
  | 'nat'
  | 'ssh'
  | 'tunnel'
  | 'backup';

/**
 * Capacidad de una superficie específica
 */
export interface SurfaceCapability {
  supported: boolean;
  interfaces?: string[];
  maxInstances?: number;
  notes?: string;
}

/**
 * Capacidad de una operación específica
 */
export interface OperationCapability {
  supported: boolean;
  maxInstances?: number;
  notes?: string;
  limitations?: string[];
}

/**
 * Patrón de nombres de interfaz
 */
export interface InterfaceNamingPattern {
  pattern: string | RegExp;
  validRanges: Record<string, number[]>;
  aliases?: Record<string, string>;
}

/**
 * Capacidades de un device
 */
export interface DeviceCapabilities {
  model: string;
  surfaces: Record<SurfaceType, SurfaceCapability>;
  operations: Record<OperationType, OperationCapability>;
  interfaceNaming: InterfaceNamingPattern;
  parserSupport: string[];
}

/**
 * Info de modelo para lookup
 */
export interface ModelInfo {
  model: string;
  type: 'router' | 'switch' | 'switch-layer3' | 'pc' | 'server' | 'cloud' | 'wireless';
  vendor: string;
  series?: string;
}

/**
 * Resultado de lookup de capability
 */
export interface CapabilityLookupResult {
  device: string;
  model: string;
  surface: SurfaceType;
  operation: OperationType;
  supported: boolean;
  recommendedSurface?: SurfaceType;
  reason?: string;
}

/**
 * Parser types disponibles
 */
export type ParserType =
  | 'show-ip-interface-brief'
  | 'show-vlan-brief'
  | 'show-running-config'
  | 'show-ip-route'
  | 'show-ip-protocols'
  | 'show-access-lists'
  | 'show-cdp-neighbors'
  | 'show-version'
  | 'show-interface'
  | 'show-ip-ospf-neighbor'
  | 'show-ip-eigrp-neighbor';

/**
 * Interfaz del Capability Matrix Service
 */
export interface ICapabilityMatrixService {
  getCapabilities(device: string): DeviceCapabilities;
  canExecute(device: string, operation: OperationType): boolean;
  canExecuteOnSurface(device: string, surface: SurfaceType): boolean;
  getRecommendedSurface(device: string, operation: OperationType): SurfaceType;
  getAvailableParsers(device: string): ParserType[];
  getModelInfo(model: string): ModelInfo | null;
  lookupCapability(device: string, operation: OperationType): CapabilityLookupResult;
}