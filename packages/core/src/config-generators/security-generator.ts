import type { ACLSpec, NATSpec, SecuritySpec } from '../canonical/device.spec.ts';

export class SecurityGenerator {
  /**
   * Generate ACL commands from canonical ACLSpec
   */
  public static generateACLs(acls: ACLSpec[]): string[] {
    const commands: string[] = [];

    for (const acl of acls) {
      commands.push(`! ACL: ${acl.name}`);
      for (const rule of acl.rules) {
        let cmd = `access-list ${acl.name} ${rule.action}`;
        if (acl.type === 'extended' && rule.protocol) {
          cmd += ` ${rule.protocol}`;
        }
        cmd += ` ${rule.source}`;
        if (rule.sourceWildcard) {
          cmd += ` ${rule.sourceWildcard}`;
        }
        if (rule.destination) {
          cmd += ` ${rule.destination}`;
          if (rule.destinationWildcard) {
            cmd += ` ${rule.destinationWildcard}`;
          }
        }
        if (rule.sourcePort) {
          cmd += ` eq ${rule.sourcePort}`;
        }
        if (rule.log) {
          cmd += ' log';
        }
        commands.push(cmd);
      }
    }
    return commands;
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
