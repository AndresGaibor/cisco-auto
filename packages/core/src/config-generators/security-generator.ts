import { ACL, NAT } from '../types/index.ts';

export class SecurityGenerator {
  public static generateACLs(acls: ACL[]): string[] {
    const commands: string[] = [];
    
    for (const acl of acls) {
      commands.push(`! ACL: ${acl.name}`);
      for (const entry of acl.entries) {
        let cmd = `access-list ${acl.name} ${entry.action}`;
        if (acl.type === 'extended') {
          cmd += ` ${entry.protocol}`;
        }
        cmd += ` ${entry.source}`;
        if (entry.sourceWildcard) {
          cmd += ` ${entry.sourceWildcard}`;
        }
        if (entry.destination) {
          cmd += ` ${entry.destination}`;
          if (entry.destinationWildcard) {
            cmd += ` ${entry.destinationWildcard}`;
          }
        }
        if (entry.port) {
          cmd += ` eq ${entry.port}`;
        }
        if (entry.log) {
          cmd += ' log';
        }
        commands.push(cmd);
      }
    }
    return commands;
  }

  public static generateNAT(nat: NAT): string[] {
    const commands: string[] = [];
    
    commands.push('! Configuración NAT');
    commands.push(`interface ${nat.insideInterface}`);
    commands.push(' ip nat inside');
    commands.push(' exit');
    
    commands.push(`interface ${nat.outsideInterface}`);
    commands.push(' ip nat outside');
    commands.push(' exit');
    
    if (nat.pool) {
      commands.push(`ip nat pool ${nat.pool.name} ${nat.pool.startIp} ${nat.pool.endIp} netmask ${nat.pool.netmask}`);
    }
    
    if (nat.mappings) {
      for (const mapping of nat.mappings) {
        if (nat.type === 'static') {
          commands.push(`ip nat inside source static ${mapping.insideLocal} ${mapping.insideGlobal}`);
        }
      }
    }
    
    if (nat.type === 'overload' && nat.acl) {
      if (nat.pool) {
        commands.push(`ip nat inside source list ${nat.acl} pool ${nat.pool.name} overload`);
      } else {
        commands.push(`ip nat inside source list ${nat.acl} interface ${nat.outsideInterface} overload`);
      }
    }
    
    return commands;
  }
}