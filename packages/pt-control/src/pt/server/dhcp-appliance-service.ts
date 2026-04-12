// ============================================================================
// DhcpApplianceService - Orquestador de servicios DHCP
// ============================================================================

import type {
  IDhcpApplianceService,
  DhcpPoolConfig,
  DhcpPoolInfo,
  CreatePoolResult,
  DhcpLease,
  SubnetValidationResult,
} from './dhcp-appliance-types.js';
import { SubnetValidator } from './subnet-validator.js';
import { DhcpPoolManager } from './dhcp-pool-manager.js';

/**
 * DhcpApplianceService - orchestrates DHCP pool management via PT API
 */
export class DhcpApplianceService implements IDhcpApplianceService {
  private subnetValidator: SubnetValidator;
  private poolManager: DhcpPoolManager;

  constructor() {
    this.subnetValidator = new SubnetValidator();
    this.poolManager = new DhcpPoolManager();
  }

  /**
   * Crear pool DHCP
   */
  async createPool(serverDevice: string, config: DhcpPoolConfig): Promise<CreatePoolResult> {
    // Validar configuración primero
    const validation = this.validatePoolConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validación fallida: ${validation.errors.join(', ')}`,
      };
    }

    // Warn si hay advertencias
    if (validation.warnings.length > 0) {
      console.warn(`DHCP pool warnings: ${validation.warnings.join(', ')}`);
    }

    // Crear pool
    return this.poolManager.createPool(serverDevice, config);
  }

  /**
   * Actualizar pool
   */
  async updatePool(serverDevice: string, poolId: string, config: Partial<DhcpPoolConfig>): Promise<void> {
    // Validar solo los campos que se actualizan
    if (config.defaultRouter) {
      const isValid = this.subnetValidator.isValidIp(config.defaultRouter);
      if (!isValid) {
        throw new Error(`Invalid gateway IP: ${config.defaultRouter}`);
      }
    }

    if (config.dnsServer) {
      const isValid = this.subnetValidator.isValidIp(config.dnsServer);
      if (!isValid) {
        throw new Error(`Invalid DNS IP: ${config.dnsServer}`);
      }
    }

    await this.poolManager.updatePool(serverDevice, poolId, config);
  }

  /**
   * Eliminar pool
   */
  async deletePool(serverDevice: string, poolId: string): Promise<void> {
    await this.poolManager.deletePool(serverDevice, poolId);
  }

  /**
   * Obtener información de pool
   */
  async getPoolInfo(serverDevice: string, poolId: string): Promise<DhcpPoolInfo> {
    return this.poolManager.getPoolInfo(serverDevice, poolId);
  }

  /**
   * Obtener todos los pools
   */
  async getPools(serverDevice: string): Promise<DhcpPoolInfo[]> {
    return this.poolManager.getPools(serverDevice);
  }

  /**
   * Obtener leases activos
   */
  async getActiveLeases(serverDevice: string, poolId: string): Promise<DhcpLease[]> {
    return this.poolManager.getActiveLeases(serverDevice, poolId);
  }

  /**
   * Verificar si pool está agotado
   */
  async isPoolExhausted(serverDevice: string, poolId: string): Promise<boolean> {
    return this.poolManager.isPoolExhausted(serverDevice, poolId);
  }

  /**
   * Sugerir helper address
   */
  async suggestHelperAddress(pool: DhcpPoolInfo): Promise<string> {
    return this.poolManager.suggestHelperAddress(pool);
  }

  /**
   * Validar configuración de pool
   */
  validatePoolConfig(config: DhcpPoolConfig): SubnetValidationResult {
    return this.subnetValidator.validatePoolConfig(config);
  }

  /**
   * Sugerir rango óptimo
   */
  suggestOptimalRange(network: string, mask: string, prefixSize?: number) {
    return this.subnetValidator.suggestOptimalRange(network, mask, prefixSize);
  }
}

/**
 * Factory para crear DhcpApplianceService
 */
export function createDhcpApplianceService(): DhcpApplianceService {
  return new DhcpApplianceService();
}