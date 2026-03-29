/**
 * SERVICES GENERATOR
 * 
 * Genera configuración de servicios IOS (DHCP, NTP, SNMP, Syslog)
 */

import type {
  DHCPServerSpec,
  NTPSpec,
  SNMPSpec,
  SyslogSpec,
  HTTPSpec,
  FTPSpec
} from '../canonical/protocol.spec';
import type { ServicesSpec } from '../canonical/device.spec.js';

export class ServicesGenerator {
  // ==========================================================================
  // DHCP SERVER
  // ==========================================================================
  
  /**
   * Genera configuración de DHCP Server en router/switch
   */
  static generateDHCP(specs: DHCPServerSpec[]): string[] {
    const commands: string[] = [];
    
    commands.push('! DHCP Server Configuration');
    
    for (const spec of specs) {
      commands.push(...this.generateDHCPPool(spec));
    }
    
    return commands;
  }
  
  /**
   * Genera un pool DHCP individual
   */
  private static generateDHCPPool(spec: DHCPServerSpec): string[] {
    const commands: string[] = [];
    
    // Excluir direcciones (va antes del pool)
    if (spec.excludedAddresses && spec.excludedAddresses.length > 0) {
      for (const addr of spec.excludedAddresses) {
        commands.push(`ip dhcp excluded-address ${addr}`);
      }
    }
    
    // Crear pool
    commands.push(`ip dhcp pool ${spec.poolName}`);
    commands.push(` network ${spec.network} ${spec.subnetMask}`);
    
    // Default gateway
    if (spec.defaultRouter) {
      commands.push(` default-router ${spec.defaultRouter}`);
    }
    
    // DNS servers
    if (spec.dnsServers && spec.dnsServers.length > 0) {
      commands.push(` dns-server ${spec.dnsServers.join(' ')}`);
    }
    
    // Domain name
    if (spec.domainName) {
      commands.push(` domain-name ${spec.domainName}`);
    }
    
    // Lease time
    if (spec.lease !== undefined) {
      if (spec.lease === 'infinite') {
        commands.push(' lease infinite');
      } else {
        commands.push(` lease ${spec.lease}`);
      }
    }
    
    // Opciones adicionales
    if (spec.options && spec.options.length > 0) {
      for (const opt of spec.options) {
        commands.push(` option ${opt.code} ${opt.value}`);
      }
    }
    
    // Class name (para DHCP relay)
    if (spec.className) {
      commands.push(` class ${spec.className}`);
    }
    
    commands.push(' exit');
    
    return commands;
  }
  
  // ==========================================================================
  // NTP
  // ==========================================================================
  
  /**
   * Genera configuración de NTP
   */
  static generateNTP(spec: NTPSpec): string[] {
    const commands: string[] = [];
    
    commands.push('! NTP Configuration');
    
    // Servidores NTP
    for (const server of spec.servers) {
      let cmd = `ntp server ${server.ip}`;
      
      if (server.prefer) {
        cmd += ' prefer';
      }
      
      if (server.key) {
        cmd += ` key ${server.key}`;
      }
      
      commands.push(cmd);
    }
    
    // Master NTP
    if (spec.master) {
      commands.push(`ntp master ${spec.stratum || 8}`);
    }
    
    // Source interface
    if (spec.sourceInterface) {
      commands.push(`ntp source ${spec.sourceInterface}`);
    }
    
    // Autenticación
    if (spec.authentication?.enabled) {
      commands.push('ntp authenticate');
      
      // Keys
      if (spec.authentication.keys) {
        for (const key of spec.authentication.keys) {
          commands.push(`ntp authentication-key ${key.id} md5 ${key.md5}`);
        }
      }
      
      // Trusted keys
      if (spec.authentication.trustedKeys) {
        for (const keyId of spec.authentication.trustedKeys) {
          commands.push(`ntp trusted-key ${keyId}`);
        }
      }
    }
    
    // Access control
    if (spec.accessGroup) {
      if (spec.accessGroup.peer) {
        commands.push(`ntp access-group peer ${spec.accessGroup.peer}`);
      }
      if (spec.accessGroup.serve) {
        commands.push(`ntp access-group serve ${spec.accessGroup.serve}`);
      }
      if (spec.accessGroup.serveOnly) {
        commands.push(`ntp access-group serve-only ${spec.accessGroup.serveOnly}`);
      }
      if (spec.accessGroup.queryOnly) {
        commands.push(`ntp access-group query-only ${spec.accessGroup.queryOnly}`);
      }
    }
    
    return commands;
  }
  
  // ==========================================================================
  // SNMP
  // ==========================================================================
  
  /**
   * Genera configuración de SNMP
   */
  static generateSNMP(spec: SNMPSpec): string[] {
    const commands: string[] = [];
    
    commands.push('! SNMP Configuration');
    
    // Contact y location
    if (spec.contact) {
      commands.push(`snmp-server contact ${spec.contact}`);
    }
    
    if (spec.location) {
      commands.push(`snmp-server location ${spec.location}`);
    }
    
    // Communities (SNMPv2c)
    if (spec.communities) {
      for (const comm of spec.communities) {
        let cmd = `snmp-server community ${comm.name} ${comm.access}`;
        if (comm.acl) {
          cmd += ` ${comm.acl}`;
        }
        commands.push(cmd);
      }
    }
    
    // SNMPv3
    if (spec.v3?.enabled) {
      // Groups
      if (spec.v3.groups) {
        for (const group of spec.v3.groups) {
          let cmd = `snmp-server group ${group.name} v3 priv`;
          if (group.read) cmd += ` read ${group.read}`;
          if (group.write) cmd += ` write ${group.write}`;
          if (group.notify) cmd += ` notify ${group.notify}`;
          commands.push(cmd);
        }
      }
      
      // Users
      if (spec.v3.users) {
        for (const user of spec.v3.users) {
          let cmd = `snmp-server user ${user.name} ${user.group} v3 auth ${user.auth} ${user.authPassword}`;
          if (user.priv && user.privPassword) {
            cmd += ` priv ${user.priv} ${user.privPassword}`;
          }
          commands.push(cmd);
        }
      }
    }
    
    // Traps
    if (spec.traps?.enabled) {
      commands.push('snmp-server enable traps');
      
      if (spec.traps.types && spec.traps.types.length > 0) {
        for (const type of spec.traps.types) {
          commands.push(`snmp-server enable traps ${type}`);
        }
      }
      
      // Trap hosts
      if (spec.traps.hosts) {
        for (const host of spec.traps.hosts) {
          let cmd = `snmp-server host ${host.ip}`;
          
          if (host.community) {
            cmd += ` ${host.community}`;
          }
          
          if (host.version) {
            cmd += ` version ${host.version}`;
          }
          
          commands.push(cmd);
        }
      }
    }
    
    return commands;
  }
  
  // ==========================================================================
  // SYSLOG
  // ==========================================================================
  
  /**
   * Genera configuración de Syslog
   */
  static generateSyslog(spec: SyslogSpec): string[] {
    const commands: string[] = [];
    
    commands.push('! Syslog Configuration');
    
    // Servidores
    for (const server of spec.servers) {
      const cmd = server.severity 
        ? `logging host ${server.ip} ${this.severityToNum(server.severity)}`
        : `logging host ${server.ip}`;
      commands.push(cmd);
    }
    
    // Source interface
    if (spec.sourceInterface) {
      commands.push(`logging source-interface ${spec.sourceInterface}`);
    }
    
    // Timestamp
    if (spec.timestamp === 'datetime') {
      commands.push('service timestamps log datetime msec localtime');
    } else if (spec.timestamp === 'uptime') {
      commands.push('service timestamps log uptime');
    }
    
    // Buffered logging
    if (spec.buffered?.enabled) {
      let cmd = 'logging buffered';
      if (spec.buffered.size) {
        cmd += ` ${spec.buffered.size}`;
      }
      if (spec.buffered.severity) {
        cmd += ` ${spec.buffered.severity}`;
      }
      commands.push(cmd);
    }
    
    // Console logging
    if (spec.console) {
      if (spec.console === 'disabled') {
        commands.push('no logging console');
      } else {
        commands.push(`logging console ${spec.console}`);
      }
    }
    
    return commands;
  }
  
  /**
   * Convierte severidad textual a número
   */
  private static severityToNum(severity: string): number {
    const map: Record<string, number> = {
      'emergencies': 0,
      'alerts': 1,
      'critical': 2,
      'errors': 3,
      'warnings': 4,
      'notifications': 5,
      'informational': 6,
      'debugging': 7
    };
    return map[severity] ?? 6;
  }
  
  // ==========================================================================
  // HTTP
  // ==========================================================================
  
  /**
   * Genera configuración de HTTP Server (en router/switch)
   */
  static generateHTTP(spec: HTTPSpec): string[] {
    const commands: string[] = [];
    
    commands.push('! HTTP Server Configuration');
    
    if (spec.enabled) {
      commands.push('ip http server');
      
      if (spec.httpsPort || spec.secureOnly) {
        commands.push('ip http secure-server');
      }
      
      if (spec.secureOnly) {
        commands.push('no ip http server');
      }
      
      if (spec.port && spec.port !== 80) {
        commands.push(`ip http port ${spec.port}`);
      }
      
      if (spec.httpsPort && spec.httpsPort !== 443) {
        commands.push(`ip http secure-port ${spec.httpsPort}`);
      }
      
      if (spec.authentication) {
        commands.push(`ip http authentication ${spec.authentication}`);
      }
      
      if (spec.user) {
        commands.push(`ip http user ${spec.user}`);
      }
      
      if (spec.accessList) {
        commands.push(`ip http access-class ${spec.accessList}`);
      }
    } else {
      commands.push('no ip http server');
      commands.push('no ip http secure-server');
    }
    
    return commands;
  }
  
  // ==========================================================================
  // FTP
  // ==========================================================================
  
  /**
   * Genera configuración de FTP Server (en router/switch)
   */
  static generateFTP(spec: FTPSpec): string[] {
    const commands: string[] = [];
    
    commands.push('! FTP Server Configuration');
    
    if (spec.enabled) {
      commands.push('ftp-server enable');
      
      if (spec.port && spec.port !== 21) {
        commands.push(`ftp-server port ${spec.port}`);
      }
      
      if (spec.passivePorts) {
        commands.push(`ftp-server passive-port ${spec.passivePorts.min} ${spec.passivePorts.max}`);
      }
      
      if (spec.users) {
        for (const user of spec.users) {
          commands.push(`ftp-server username ${user.username} password ${user.password} ${user.permissions}`);
        }
      }
    } else {
      commands.push('no ftp-server enable');
    }
    
    return commands;
  }
  
  // ==========================================================================
  // VALIDATION
  // ==========================================================================
  
  /**
   * Valida configuración DHCP
   */
  static validateDHCP(spec: DHCPServerSpec): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar pool name
    if (!spec.poolName || spec.poolName.length === 0) {
      errors.push('Pool name is required');
    }
    
    // Validar network/mask
    if (!this.isValidNetwork(spec.network)) {
      errors.push(`Invalid network: ${spec.network}`);
    }
    
    if (!this.isValidMask(spec.subnetMask)) {
      errors.push(`Invalid subnet mask: ${spec.subnetMask}`);
    }
    
    // Validar default router
    if (spec.defaultRouter && !this.isValidIP(spec.defaultRouter)) {
      errors.push(`Invalid default router: ${spec.defaultRouter}`);
    }
    
    // Validar DNS servers
    if (spec.dnsServers) {
      for (const dns of spec.dnsServers) {
        if (!this.isValidIP(dns)) {
          errors.push(`Invalid DNS server: ${dns}`);
        }
      }
    }
    
    // Warnings
    if (!spec.defaultRouter) {
      warnings.push('No default gateway configured - clients may not reach other networks');
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }
  
  /**
   * Valida configuración NTP
   */
  static validateNTP(spec: NTPSpec): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar servidores
    for (const server of spec.servers) {
      if (!this.isValidIP(server.ip) && !this.isValidHostname(server.ip)) {
        errors.push(`Invalid NTP server: ${server.ip}`);
      }
    }
    
    // Validar stratum
    if (spec.stratum && (spec.stratum < 1 || spec.stratum > 15)) {
      errors.push(`Invalid stratum: ${spec.stratum} (must be 1-15)`);
    }
    
    // Warnings
    if (spec.servers.length === 0 && !spec.master) {
      warnings.push('No NTP servers configured');
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }
  
  // ==========================================================================
  // EXAMPLES
  // ==========================================================================
  
  /**
   * Genera ejemplo de DHCP
   */
  static generateDHCPExample(): string {
    const specs: DHCPServerSpec[] = [
      {
        poolName: 'VLAN10_POOL',
        network: '192.168.10.0',
        subnetMask: '255.255.255.0',
        defaultRouter: '192.168.10.1',
        dnsServers: ['8.8.8.8', '8.8.4.4'],
        domainName: 'example.com',
        excludedAddresses: ['192.168.10.1', '192.168.10.10'],
        lease: 7
      }
    ];
    
    return this.generateDHCP(specs).join('\n');
  }
  
  /**
   * Genera ejemplo de NTP
   */
  static generateNTPExample(): string {
    const spec: NTPSpec = {
      servers: [
        { ip: '0.pool.ntp.org', prefer: true },
        { ip: '1.pool.ntp.org' }
      ],
      sourceInterface: 'Loopback0',
      authentication: {
        enabled: true,
        keys: [
          { id: 1, md5: 'MySecretKey' }
        ],
        trustedKeys: [1]
      }
    };
    
    return this.generateNTP(spec).join('\n');
  }
  
  // ==========================================================================
  // HELPERS
  // ==========================================================================
  
  private static isValidIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
      const num = parseInt(p);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }
  
  private static isValidNetwork(network: string): boolean {
    const parts = network.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
      const num = parseInt(p);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }
  
  private static isValidMask(mask: string): boolean {
    const parts = mask.split('.');
    if (parts.length !== 4) return false;
    const binary = parts.map(p => parseInt(p).toString(2).padStart(8, '0')).join('');
    return /^1*0*$/.test(binary);
  }
  
  private static isValidHostname(hostname: string): boolean {
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(hostname);
  }

  /**
   * Generate all services from canonical ServicesSpec (protocol.spec version)
   */
  static generateServices(spec: ServicesSpec): string[] {
    const commands: string[] = [];

    if (spec.dhcp && spec.dhcp.length > 0) {
      commands.push('! DHCP Server Configuration');
      for (const pool of spec.dhcp) {
        commands.push(`ip dhcp pool ${pool.poolName}`);
        commands.push(` network ${pool.network} ${pool.subnetMask}`);
        if (pool.defaultRouter) {
          commands.push(` default-router ${pool.defaultRouter}`);
        }
        if (pool.dnsServers) {
          commands.push(` dns-server ${pool.dnsServers.join(' ')}`);
        }
        if (pool.domainName) {
          commands.push(` domain-name ${pool.domainName}`);
        }
        if (pool.lease) {
          commands.push(` lease ${pool.lease}`);
        }
        commands.push(' exit');
      }
      // Excluded addresses
      const allExcluded = spec.dhcp.flatMap(p => p.excludedAddresses || []);
      if (allExcluded.length > 0) {
        commands.push('! DHCP Excluded Addresses');
        for (const addr of allExcluded) {
          commands.push(`ip dhcp excluded-address ${addr}`);
        }
      }
    }

    if (spec.ntp) {
      commands.push('! NTP Configuration');
      if (spec.ntp.serve || spec.ntp.master) {
        commands.push('ntp master');
      }
      if (spec.ntp.servers && spec.ntp.servers.length > 0) {
        for (const server of spec.ntp.servers) {
          commands.push(`ntp server ${server.ip}`);
        }
      }
    }

    if (spec.dns?.enabled) {
      commands.push('! DNS Configuration');
      // DNSServerSpec has aRecords and cnameRecords, not servers
      // DNS server functionality would require different IOS commands
    }

    if (spec.http?.enabled) {
      commands.push('! HTTP/HTTPS Configuration');
      if (spec.http.secureOnly) {
        commands.push('ip http secure-server');
      } else {
        commands.push('ip http server');
      }
    }

    if (spec.ssh?.enabled) {
      commands.push('! SSH Configuration');
      commands.push('ip domain-name espoch.local');
      commands.push(`crypto key generate rsa modulus ${spec.ssh.version === 2 ? 2048 : 1024}`);
      commands.push(`ip ssh version ${spec.ssh.version ?? 2}`);
    }

    if (spec.telnet?.enabled) {
      commands.push('! Telnet Configuration');
      commands.push('line vty 0 15');
      commands.push(' transport input telnet');
      commands.push(' login local');
      commands.push(' exit');
    }

    return commands;
  }
}

export default ServicesGenerator;
