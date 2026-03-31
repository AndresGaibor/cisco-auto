import type { ACLSpec, NATSpec, SecuritySpec } from '../canonical/device.spec.ts';

export class SecurityGenerator {
  /**
   * Generate ACL commands from canonical ACLSpec
   * Supports both numbered and named ACLs with correct Cisco syntax
   */
  public static generateACLs(acls: ACLSpec[]): string[] {
    const commands: string[] = [];

    for (const acl of acls) {
      commands.push(`! ACL: ${acl.name}`);

      const rules = acl.rules || [];
      if (rules.length === 0) {
        continue;
      }

      if (acl.type === 'named') {
        // Named ACL requires ip access-list {standard|extended} <name>
        const aclType = this.inferACLType(rules);
        commands.push(`ip access-list ${aclType} ${acl.name}`);

        for (const rule of acl.rules) {
          const ruleCmd = this.buildACLRule(rule, aclType);
          commands.push(` ${ruleCmd}`); // Indented under ip access-list
        }
        commands.push(' exit');
      } else {
        // Numbered ACL (standard or extended)
        for (const rule of acl.rules) {
          const ruleCmd = this.buildACLRule(rule, acl.type);
          commands.push(`access-list ${acl.name} ${ruleCmd}`);
        }
      }
    }
    return commands;
  }

  /**
   * Infer ACL type from rules - extended if has protocol or ports
   */
  private static inferACLType(rules: ACLSpec['rules']): 'standard' | 'extended' {
    const hasProtocol = rules.some(r => r.protocol && r.protocol !== 'ip');
    const hasPort = rules.some(r => r.sourcePort || r.destinationPort);
    return (hasProtocol || hasPort) ? 'extended' : 'standard';
  }

  /**
   * Build a single ACL rule command
   */
  private static buildACLRule(rule: ACLSpec['rules'][number], aclType: string): string {
    let cmd = rule.action; // permit | deny

    // Protocol (extended only - standard ACLs don't support protocol filtering)
    if (aclType === 'extended' && rule.protocol) {
      cmd += ` ${rule.protocol}`;
    }
    // Note: Standard ACLs never include protocol - they only filter by source address

    // Source
    cmd += ` ${rule.source}`;
    if (rule.sourceWildcard && rule.source !== 'any' && !rule.source.startsWith('host ')) {
      cmd += ` ${rule.sourceWildcard}`;
    }

    // Source port (extended only)
    if (aclType === 'extended' && rule.sourcePort) {
      cmd += ` eq ${rule.sourcePort}`;
    }

    // Destination (extended only)
    if (aclType === 'extended') {
      if (rule.destination) {
        cmd += ` ${rule.destination}`;
        if (rule.destinationWildcard && rule.destination !== 'any' && !rule.destination.startsWith('host ')) {
          cmd += ` ${rule.destinationWildcard}`;
        }
      } else {
        cmd += ' any';
      }

      // Destination port (extended only)
      if (rule.destinationPort) {
        cmd += ` eq ${rule.destinationPort}`;
      }
    }

    // Log
    if (rule.log) {
      cmd += ' log';
    }

    return cmd;
  }

  /**
   * Generate NAT commands from canonical NATSpec
   */
  public static generateNAT(nat: NATSpec): string[] {
    const commands: string[] = [];

    commands.push('! Configuración NAT');

    // Handle inside/outside interfaces
    if (nat.insideInterfaces && nat.insideInterfaces.length > 0) {
      for (const iface of nat.insideInterfaces) {
        commands.push(`interface ${iface}`);
        commands.push(' ip nat inside');
        commands.push(' exit');
      }
    }

    if (nat.outsideInterfaces && nat.outsideInterfaces.length > 0) {
      for (const iface of nat.outsideInterfaces) {
        commands.push(`interface ${iface}`);
        commands.push(' ip nat outside');
        commands.push(' exit');
      }
    }

    // Handle static NAT
    if (nat.static && nat.static.length > 0) {
      for (const staticNat of nat.static) {
        commands.push(`ip nat inside source static ${staticNat.inside} ${staticNat.outside}`);
      }
    }

    // Handle dynamic NAT with pool
    if (nat.dynamic && nat.dynamic.length > 0) {
      for (const dynamic of nat.dynamic) {
        commands.push(`ip nat inside source list ${dynamic.acl} pool ${dynamic.pool}`);
      }
    }

    // Handle PAT (overload) - canonical uses pat object
    if (nat.pat) {
      commands.push(`ip nat inside source list ${nat.pat.acl} interface ${nat.pat.interface} overload`);
    }

    return commands;
  }

  /**
   * Generate security commands (ACLs + NAT) from SecuritySpec
   */
  public static generateSecurity(security: SecuritySpec): string[] {
    const commands: string[] = [];

    if (security.acls && security.acls.length > 0) {
      commands.push(...this.generateACLs(security.acls));
    }

    if (security.nat) {
      commands.push(...this.generateNAT(security.nat));
    }

    // Firewall configuration could be added here
    if (security.firewall?.enabled) {
      commands.push('! Zone-based firewall configuration');
      // Firewall zones and policies would go here
    }

    return commands;
  }
}
