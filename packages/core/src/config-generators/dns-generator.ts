/**
 * DNS Generator - Generates DNS configuration commands
 * Creates DNS client, server, and resolver configurations
 */

export interface DNSConfig {
  enabled: boolean;
  servers?: string[];
  domain?: string;
  searches?: string[];
  lookups?: string[];
}

export class DNSGenerator {
  generateDNSClient(config: DNSConfig): string[] {
    const commands: string[] = [];

    if (!config.enabled) {
      commands.push('no ip dns server');
      return commands;
    }

    commands.push('ip dns server');

    // DNS servers
    if (config.servers && config.servers.length > 0) {
      for (const server of config.servers) {
        commands.push(`ip name-server ${server}`);
      }
    }

    // Domain name
    if (config.domain) {
      commands.push(`ip domain-name ${config.domain}`);
    }

    // Domain searches
    if (config.searches && config.searches.length > 0) {
      commands.push(`ip domain-list ${config.searches.join(' ')}`);
    }

    // DNS lookups
    if (config.lookups && config.lookups.length > 0) {
      for (const lookup of config.lookups) {
        commands.push(`ip dns-server ${lookup}`);
      }
    }

    return commands;
  }

  generateDNSStaticEntry(hostname: string, ip: string): string[] {
    const commands: string[] = [];
    commands.push(`ip host ${hostname} ${ip}`);
    return commands;
  }

  generateDNSForwardZone(zone: string, servers: string[]): string[] {
    const commands: string[] = [];

    commands.push(`zone ${zone}`);
    for (const server of servers) {
      commands.push(`nameserver ${server}`);
    }
    commands.push('exit');

    return commands;
  }

  generateDNSReverseZone(subnet: string, server: string): string[] {
    const commands: string[] = [];

    // Calculate reverse zone from subnet
    const reversedZone = this.calculateReverseZone(subnet);

    commands.push(`zone ${reversedZone}`);
    commands.push(`nameserver ${server}`);
    commands.push('exit');

    return commands;
  }

  validateDNSConfig(config: DNSConfig): string[] {
    const errors: string[] = [];

    // Validate servers
    if (config.servers) {
      for (const server of config.servers) {
        if (!this.isValidIP(server)) {
          errors.push(`Invalid DNS server IP: ${server}`);
        }
      }
    }

    // Validate domain format
    if (config.domain && !this.isValidDomain(config.domain)) {
      errors.push(`Invalid domain name: ${config.domain}`);
    }

    // Validate searches
    if (config.searches) {
      for (const search of config.searches) {
        if (!this.isValidDomain(search)) {
          errors.push(`Invalid domain search: ${search}`);
        }
      }
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

  private isValidDomain(domain: string): boolean {
    const pattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return pattern.test(domain);
  }

  private calculateReverseZone(subnet: string): string {
    // Convert subnet to reverse DNS zone
    // Example: 192.168.1.0/24 -> 1.168.192.in-addr.arpa
    const [ip] = subnet.split('/');
    const parts = ip!.split('.').slice(0, 3).reverse();
    return `${parts.join('.')}.in-addr.arpa`;
  }
}
