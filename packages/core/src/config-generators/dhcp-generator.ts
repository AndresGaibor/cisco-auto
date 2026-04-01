/**
 * DHCP Generator - Generates DHCP configuration commands
 * Creates DHCP pool, lease, and scope configurations
 */

export interface DHCPPoolConfig {
  name: string;
  network: string;
  mask: string;
  gateway?: string;
  dnsServers?: string[];
  leaseTime?: number;
  excludedAddresses?: string[];
}

export class DHCPGenerator {
  generateDHCPPool(pool: DHCPPoolConfig): string[] {
    const commands: string[] = [];

    // Create DHCP pool
    commands.push(`ip dhcp pool ${pool.name}`);

    // Network and mask
    commands.push(`network ${pool.network} ${pool.mask}`);

    // Default gateway
    if (pool.gateway) {
      commands.push(`default-router ${pool.gateway}`);
    }

    // DNS servers
    if (pool.dnsServers && pool.dnsServers.length > 0) {
      commands.push(`dns-server ${pool.dnsServers.join(' ')}`);
    }

    // Lease time
    if (pool.leaseTime !== undefined) {
      const days = Math.floor(pool.leaseTime / 86400);
      const hours = Math.floor((pool.leaseTime % 86400) / 3600);
      const minutes = Math.floor((pool.leaseTime % 3600) / 60);
      commands.push(`lease ${days} ${hours} ${minutes}`);
    }

    // Excluded addresses
    if (pool.excludedAddresses && pool.excludedAddresses.length > 0) {
      for (const range of pool.excludedAddresses) {
        commands.push(`exit`, `ip dhcp excluded-address ${range}`, `ip dhcp pool ${pool.name}`);
      }
    }

    commands.push('exit');
    return commands;
  }

  generateDHCPRelay(interfaceName: string, dhcpServer: string): string[] {
    const commands: string[] = [];

    commands.push(`interface ${interfaceName}`);
    commands.push(`ip helper-address ${dhcpServer}`);
    commands.push('exit');

    return commands;
  }

  generateDHCPServerGlobal(commands?: string[]): string[] {
    const config: string[] = [];

    // Enable DHCP service
    config.push('service dhcp');

    // Additional DHCP configuration
    if (commands) {
      config.push(...commands);
    }

    return config;
  }

  validateDHCPConfig(pool: DHCPPoolConfig): string[] {
    const errors: string[] = [];

    // Validate network address
    if (!this.isValidCIDR(pool.network, pool.mask)) {
      errors.push(`Invalid network address: ${pool.network} ${pool.mask}`);
    }

    // Validate gateway
    if (pool.gateway && !this.isValidIP(pool.gateway)) {
      errors.push(`Invalid gateway IP: ${pool.gateway}`);
    }

    // Validate DNS servers
    if (pool.dnsServers) {
      for (const dns of pool.dnsServers) {
        if (!this.isValidIP(dns)) {
          errors.push(`Invalid DNS server IP: ${dns}`);
        }
      }
    }

    // Validate lease time
    if (pool.leaseTime !== undefined) {
      if (pool.leaseTime < 60 || pool.leaseTime > 31536000) {
        errors.push(`Invalid lease time: ${pool.leaseTime} (60 - 31536000 seconds)`);
      }
    }

    return errors;
  }

  private isValidCIDR(network: string, mask: string): boolean {
    return this.isValidIP(network) && this.isValidIP(mask);
  }

  private isValidIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }
}
