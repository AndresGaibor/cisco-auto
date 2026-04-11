/**
 * DHCP Builder - Builds DHCP configurations
 * Handles DHCP pool setup and DHCP relay configurations
 */

import type { DerivedPoolConfig } from './vlan-dhcp-resolver.js';
import { VlanDhcpResolver } from './vlan-dhcp-resolver.js';

export interface DHCPPoolBuilder {
  name: string;
  network: string;
  mask: string;
  gateway?: string;
  dnsServers?: string[];
  leaseTime?: number;
  excluded?: string[];
}

export interface DHCPRelayConfig {
  interface: string;
  dhcpServer: string;
}

export class DHCPBuilder {
  buildDHCPPool(config: DHCPPoolBuilder): string[] {
    const commands: string[] = [];

    // Excluded addresses first
    if (config.excluded && config.excluded.length > 0) {
      for (const range of config.excluded) {
        commands.push(`ip dhcp excluded-address ${range}`);
      }
    }

    // Create pool
    commands.push(`ip dhcp pool ${config.name}`);
    commands.push(`network ${config.network} ${config.mask}`);

    // Gateway
    if (config.gateway) {
      commands.push(`default-router ${config.gateway}`);
    }

    // DNS servers
    if (config.dnsServers && config.dnsServers.length > 0) {
      commands.push(`dns-server ${config.dnsServers.join(' ')}`);
    }

    // Lease time
    if (config.leaseTime !== undefined) {
      const seconds = config.leaseTime;
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      commands.push(`lease ${days} ${hours} ${minutes}`);
    }

    commands.push('exit');

    return commands;
  }

  /**
   * Build DHCP pool configuration derived from VLAN SVI
   * @param vlanId - VLAN ID
   * @param sviIp - SVI IP address
   * @param cidr - CIDR notation (e.g., 24)
   * @param options - Optional overrides (poolName, dnsServer, leaseTime, excluded)
   */
  buildDHCPPoolFromVlan(
    vlanId: number,
    sviIp: string,
    cidr: number,
    options?: {
      poolName?: string;
      dnsServer?: string;
      leaseTime?: number;
      excluded?: string[];
    }
  ): string[] {
    const resolver = new VlanDhcpResolver();
    const derived = resolver.derivePoolConfig(vlanId, sviIp, cidr, {
      poolName: options?.poolName,
      dnsServer: options?.dnsServer,
    });

    const config: DHCPPoolBuilder = {
      name: derived.poolName,
      network: derived.network,
      mask: derived.mask,
      gateway: derived.defaultRouter,
      dnsServers: derived.dnsServer ? [derived.dnsServer] : undefined,
      leaseTime: options?.leaseTime,
      excluded: options?.excluded,
    };

    return this.buildDHCPPool(config);
  }

  buildDHCPRelay(config: DHCPRelayConfig): string[] {
    const commands: string[] = [];

    commands.push(`interface ${config.interface}`);
    commands.push(`ip helper-address ${config.dhcpServer}`);
    commands.push('exit');

    return commands;
  }

  buildDHCPGlobalConfig(): string[] {
    const commands: string[] = [];

    commands.push('ip dhcp ping packets 2');
    commands.push('ip dhcp ping timeout 500');
    commands.push('service dhcp');

    return commands;
  }

  enableDHCPSnooping(vlanId: number): string[] {
    const commands: string[] = [];

    commands.push('ip dhcp snooping');
    commands.push(`ip dhcp snooping vlan ${vlanId}`);

    return commands;
  }

  disableDHCPSnooping(interfaceName: string): string[] {
    const commands: string[] = [];

    commands.push(`interface ${interfaceName}`);
    commands.push('ip dhcp snooping trust');
    commands.push('exit');

    return commands;
  }

  validateDHCPPool(config: DHCPPoolBuilder): string[] {
    const errors: string[] = [];

    if (!config.name || config.name.length === 0) {
      errors.push('DHCP pool name is required');
    }

    if (!this.isValidIP(config.network)) {
      errors.push(`Invalid network address: ${config.network}`);
    }

    if (!this.isValidIP(config.mask)) {
      errors.push(`Invalid subnet mask: ${config.mask}`);
    }

    if (config.gateway && !this.isValidIP(config.gateway)) {
      errors.push(`Invalid gateway: ${config.gateway}`);
    }

    if (config.dnsServers) {
      for (const dns of config.dnsServers) {
        if (!this.isValidIP(dns)) {
          errors.push(`Invalid DNS server: ${dns}`);
        }
      }
    }

    if (config.leaseTime && (config.leaseTime < 60 || config.leaseTime > 31536000)) {
      errors.push(`Invalid lease time: ${config.leaseTime} (60-31536000 seconds)`);
    }

    return errors;
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
