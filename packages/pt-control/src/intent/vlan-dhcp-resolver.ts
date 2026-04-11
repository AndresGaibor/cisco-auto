/**
 * VlanDhcpResolver - Derives DHCP pool configuration from VLAN SVI
 *
 * When a VLAN has an SVI configured on a router, we can automatically
 * derive the DHCP pool configuration: network, mask, and default router.
 */

export interface DerivedPoolConfig {
  poolName: string;
  network: string;
  mask: string;
  defaultRouter: string;
  dnsServer?: string;
}

export class VlanDhcpResolver {
  /**
   * Derive DHCP pool configuration from VLAN SVI
   * @param vlanId - VLAN ID (e.g., 10)
   * @param sviIp - SVI IP address (e.g., "192.168.10.1")
   * @param cidr - CIDR notation (e.g., 24 for /24)
   * @param options - Optional overrides for poolName, dnsServer
   */
  derivePoolConfig(
    vlanId: number,
    sviIp: string,
    cidr: number,
    options?: {
      poolName?: string;
      dnsServer?: string;
    }
  ): DerivedPoolConfig {
    const mask = this.cidrToSubnetMask(cidr);
    const network = this.calculateNetwork(sviIp, cidr);
    const defaultRouter = sviIp;

    return {
      poolName: options?.poolName ?? `VLAN${vlanId}_POOL`,
      network,
      mask,
      defaultRouter,
      dnsServer: options?.dnsServer,
    };
  }

  /**
   * Convert CIDR notation to subnet mask (e.g., 24 -> 255.255.255.0)
   */
  private cidrToSubnetMask(cidr: number): string {
    if (cidr < 0 || cidr > 32) {
      throw new Error(`Invalid CIDR: ${cidr} (must be 0-32)`);
    }

    const maskParts = [0, 0, 0, 0];
    for (let i = 0; i < cidr; i++) {
      const octetIndex = Math.floor(i / 8);
      const bitPosition = i % 8;
      maskParts[octetIndex] |= 0x80 >> bitPosition;
    }

    return maskParts.join('.');
  }

  /**
   * Calculate network address from IP + CIDR (e.g., 192.168.10.1/24 -> 192.168.10.0)
   */
  private calculateNetwork(ip: string, cidr: number): string {
    const ipParts = ip.split('.').map(p => parseInt(p, 10));
    const maskParts = this.cidrToMaskParts(cidr);

    const networkParts = ipParts.map((part, i) => part & maskParts[i]);
    return networkParts.join('.');
  }

  private cidrToMaskParts(cidr: number): number[] {
    const parts = [0, 0, 0, 0];
    for (let i = 0; i < cidr; i++) {
      const octetIndex = Math.floor(i / 8);
      const bitPosition = i % 8;
      parts[octetIndex] |= 0x80 >> bitPosition;
    }
    return parts;
  }
}