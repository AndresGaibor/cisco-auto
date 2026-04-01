/**
 * SNMP Generator - Generates SNMP configuration commands
 * Creates SNMP community, trap, and monitoring configurations
 */

export interface SNMPConfig {
  enabled: boolean;
  version: 'v1' | 'v2c' | 'v3';
  community?: string;
  readOnly?: boolean;
  traps?: SNMPTrapConfig[];
  users?: SNMPUserConfig[];
  groups?: SNMPGroupConfig[];
}

export interface SNMPTrapConfig {
  host: string;
  community?: string;
  version?: string;
  port?: number;
}

export interface SNMPUserConfig {
  name: string;
  password: string;
  encryptionKey?: string;
  level: 'noAuthNoPriv' | 'authNoPriv' | 'authPriv';
}

export interface SNMPGroupConfig {
  name: string;
  securityModel: 'v1' | 'v2c' | 'v3';
  readView?: string;
  writeView?: string;
}

export class SNMPGenerator {
  generateSNMPBasic(config: SNMPConfig): string[] {
    const commands: string[] = [];

    if (!config.enabled) {
      commands.push('no snmp-server');
      return commands;
    }

    // SNMP community
    if (config.community) {
      const access = config.readOnly ? 'ro' : 'rw';
      commands.push(`snmp-server community ${config.community} ${access}`);
    }

    // SNMP location and contact
    commands.push('snmp-server location Network Operations');
    commands.push('snmp-server contact network-admin@example.com');

    // SNMP system description
    commands.push('snmp-server description Cisco Device');

    return commands;
  }

  generateSNMPTraps(traps: SNMPTrapConfig[]): string[] {
    const commands: string[] = [];

    for (const trap of traps) {
      if (trap.version === 'v3') {
        commands.push(`snmp-server host ${trap.host} version 3 ${trap.community || 'public'}`);
      } else {
        commands.push(`snmp-server host ${trap.host} version ${trap.version || '2c'} ${trap.community || 'public'}`);
      }

      if (trap.port) {
        commands.push(`snmp-server host ${trap.host} ${trap.port}`);
      }

      // Enable common traps
      commands.push(`snmp-server enable traps snmp authentication linkdown linkup coldstart warmstart`);
      commands.push(`snmp-server enable traps system shutdown`);
    }

    return commands;
  }

  generateSNMPv3Users(users: SNMPUserConfig[]): string[] {
    const commands: string[] = [];

    for (const user of users) {
      if (user.level === 'noAuthNoPriv') {
        commands.push(`snmp-server user ${user.name} public noauth`);
      } else if (user.level === 'authNoPriv') {
        commands.push(`snmp-server user ${user.name} public auth sha ${user.password}`);
      } else {
        commands.push(`snmp-server user ${user.name} public priv aes ${user.encryptionKey || user.password}`);
      }
    }

    return commands;
  }

  generateSNMPv3Groups(groups: SNMPGroupConfig[]): string[] {
    const commands: string[] = [];

    for (const group of groups) {
      let cmd = `snmp-server group ${group.name} v3 ${group.securityModel === 'v1' ? 'noauth' : 'auth'}`;
      if (group.readView) {
        cmd += ` read ${group.readView}`;
      }
      if (group.writeView) {
        cmd += ` write ${group.writeView}`;
      }
      commands.push(cmd);
    }

    return commands;
  }

  validateSNMPConfig(config: SNMPConfig): string[] {
    const errors: string[] = [];

    // Validate community string
    if (config.community && config.community.length < 1) {
      errors.push('SNMP community string cannot be empty');
    }

    // Validate traps
    if (config.traps) {
      for (const trap of config.traps) {
        if (!this.isValidIP(trap.host)) {
          errors.push(`Invalid trap host IP: ${trap.host}`);
        }
        if (trap.port && (trap.port < 1 || trap.port > 65535)) {
          errors.push(`Invalid trap host port: ${trap.port}`);
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
}
