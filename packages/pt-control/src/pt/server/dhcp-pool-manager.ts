// ============================================================================
// DhcpPoolManager - Gestiona pools DHCP en Server-PT via API PT
// ============================================================================

import type { DhcpPoolConfig, DhcpPoolInfo, CreatePoolResult, DhcpLease } from './dhcp-appliance-types.js';

/**
 * DhcpPoolManager - gestión de pools DHCP via PT API
 * 
 * Nota: Esta implementación assume comunicación via PT IPC API.
 * En producción, esto se conectaría al kernel o directamente a PT.
 */
export class DhcpPoolManager {
  private pools: Map<string, Map<string, DhcpPoolInfo>> = new Map(); // device -> poolId -> info
  private leases: Map<string, Map<string, DhcpLease[]>> = new Map(); // device -> poolId -> leases

  /**
   * Crear pool DHCP
   */
  async createPool(serverDevice: string, config: DhcpPoolConfig): Promise<CreatePoolResult> {
    try {
      // Generar ID único
      const poolId = `pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Calcular total de IPs
      const totalCount = this.calculateIpCount(config.startIp, config.endIp);
      
      const poolInfo: DhcpPoolInfo = {
        id: poolId,
        device: serverDevice,
        network: config.network,
        mask: config.mask,
        startIp: config.startIp,
        endIp: config.endIp,
        defaultRouter: config.defaultRouter,
        dnsServer: config.dnsServer,
        leaseTime: '24:00:00', // default
        usedCount: 0,
        totalCount,
      };

      // Guardar local (en implementación real, llamar PT API)
      if (!this.pools.has(serverDevice)) {
        this.pools.set(serverDevice, new Map());
      }
      this.pools.get(serverDevice)!.set(poolId, poolInfo);

      // Inicializar leases vacío
      if (!this.leases.has(serverDevice)) {
        this.leases.set(serverDevice, new Map());
      }
      this.leases.get(serverDevice)!.set(poolId, []);

      return {
        success: true,
        poolId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Actualizar pool existente
   */
  async updatePool(serverDevice: string, poolId: string, config: Partial<DhcpPoolConfig>): Promise<void> {
    const devicePools = this.pools.get(serverDevice);
    if (!devicePools) {
      throw new Error(`No pools found for device ${serverDevice}`);
    }

    const pool = devicePools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found on device ${serverDevice}`);
    }

    // Actualizar campos
    if (config.defaultRouter) pool.defaultRouter = config.defaultRouter;
    if (config.dnsServer) pool.dnsServer = config.dnsServer;
    if (config.maxUsers) pool.totalCount = config.maxUsers;
    if (config.vlan) {} // VLAN no se puede cambiar en runtime
  }

  /**
   * Eliminar pool
   */
  async deletePool(serverDevice: string, poolId: string): Promise<void> {
    const devicePools = this.pools.get(serverDevice);
    if (!devicePools) {
      throw new Error(`No pools found for device ${serverDevice}`);
    }

    if (!devicePools.has(poolId)) {
      throw new Error(`Pool ${poolId} not found on device ${serverDevice}`);
    }

    devicePools.delete(poolId);

    // Limpiar leases
    const deviceLeases = this.leases.get(serverDevice);
    if (deviceLeases) {
      deviceLeases.delete(poolId);
    }
  }

  /**
   * Obtener información de pool
   */
  async getPoolInfo(serverDevice: string, poolId: string): Promise<DhcpPoolInfo> {
    const devicePools = this.pools.get(serverDevice);
    if (!devicePools) {
      throw new Error(`No pools found for device ${serverDevice}`);
    }

    const pool = devicePools.get(poolId);
    if (!pool) {
      throw new Error(`Pool ${poolId} not found on device ${serverDevice}`);
    }

    // Simular usedCount basado en leases
    const leases = await this.getActiveLeases(serverDevice, poolId);
    pool.usedCount = leases.length;

    return pool;
  }

  /**
   * Obtener todos los pools de un device
   */
  async getPools(serverDevice: string): Promise<DhcpPoolInfo[]> {
    const devicePools = this.pools.get(serverDevice);
    if (!devicePools) {
      return [];
    }

    return Array.from(devicePools.values());
  }

  /**
   * Obtener leases activos
   */
  async getActiveLeases(serverDevice: string, poolId: string): Promise<DhcpLease[]> {
    const deviceLeases = this.leases.get(serverDevice);
    if (!deviceLeases) {
      return [];
    }

    const leases = deviceLeases.get(poolId);
    if (!leases) {
      return [];
    }

    // Filtrar leases no expirados (simulado)
    return leases.filter(lease => {
      // En implementación real, verificar expiry
      return true;
    });
  }

  /**
   * Verificar si pool está agotado
   */
  async isPoolExhausted(serverDevice: string, poolId: string): Promise<boolean> {
    const pool = await this.getPoolInfo(serverDevice, poolId);
    return pool.usedCount >= pool.totalCount;
  }

  /**
   * Sugerir helper address (gateway)
   */
  suggestHelperAddress(pool: DhcpPoolInfo): string {
    return pool.defaultRouter;
  }

  /**
   * Agregar lease (para testing/simulación)
   */
  addLease(serverDevice: string, poolId: string, lease: DhcpLease): void {
    const deviceLeases = this.leases.get(serverDevice);
    if (!deviceLeases) return;

    const poolLeases = deviceLeases.get(poolId);
    if (!poolLeases) return;

    poolLeases.push(lease);
  }

  /**
   * Calcular número de IPs en rango
   */
  private calculateIpCount(startIp: string, endIp: string): number {
    const start = this.ipToNumber(startIp);
    const end = this.ipToNumber(endIp);
    return Math.max(0, end - start + 1);
  }

  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }
}