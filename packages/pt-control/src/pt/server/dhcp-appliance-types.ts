// ============================================================================
// DHCP Appliance Service - Types
// ============================================================================

/**
 * Configuración de pool DHCP
 */
export interface DhcpPoolConfig {
  network: string;      // 192.168.10.0
  mask: string;        // 255.255.255.0
  startIp: string;     // 192.168.10.100
  endIp: string;       // 192.168.10.200
  defaultRouter: string; // 192.168.10.1
  dnsServer?: string;
  maxUsers?: number;
  vlan?: number;
}

/**
 * Información del pool DHCP
 */
export interface DhcpPoolInfo {
  id: string;
  device: string;
  network: string;
  mask: string;
  startIp: string;
  endIp: string;
  defaultRouter: string;
  dnsServer?: string;
  leaseTime?: string;
  usedCount: number;
  totalCount: number;
}

/**
 * Lease activo
 */
export interface DhcpLease {
  ip: string;
  mac: string;
  expires: string;
  hostname?: string;
}

/**
 * Resultado de validación de subred
 */
export interface SubnetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Resultado de creación de pool
 */
export interface CreatePoolResult {
  success: boolean;
  poolId?: string;
  error?: string;
}

/**
 * Interfaz del DHCP Appliance Service
 */
export interface IDhcpApplianceService {
  createPool(serverDevice: string, config: DhcpPoolConfig): Promise<CreatePoolResult>;
  updatePool(serverDevice: string, poolId: string, config: Partial<DhcpPoolConfig>): Promise<void>;
  deletePool(serverDevice: string, poolId: string): Promise<void>;
  getPoolInfo(serverDevice: string, poolId: string): Promise<DhcpPoolInfo>;
  getPools(serverDevice: string): Promise<DhcpPoolInfo[]>;
  getActiveLeases(serverDevice: string, poolId: string): Promise<DhcpLease[]>;
  isPoolExhausted(serverDevice: string, poolId: string): Promise<boolean>;
  suggestHelperAddress(pool: DhcpPoolInfo): Promise<string>;
  validatePoolConfig(config: DhcpPoolConfig): SubnetValidationResult;
}