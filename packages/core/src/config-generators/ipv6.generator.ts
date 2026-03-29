/**
 * IPv6 GENERATOR
 * 
 * Genera configuración de IPv6 para routers y switches
 */

import type { 
  IPv6Spec, 
  IPv6InterfaceConfig, 
  IPv6StaticRoute,
  RIPngSpec,
  OSPFv3Spec 
} from '../canonical/protocol.spec';

export class IPv6Generator {
  /**
   * Genera configuración completa de IPv6
   */
  static generate(spec: IPv6Spec): string[] {
    const commands: string[] = [];
    
    commands.push('! IPv6 Configuration');
    
    // Habilitar IPv6 routing
    if (spec.routing) {
      commands.push('ipv6 unicast-routing');
    }
    
    // Configurar interfaces
    if (spec.interfaces && spec.interfaces.length > 0) {
      for (const iface of spec.interfaces) {
        commands.push(...this.generateInterface(iface));
      }
    }
    
    // Rutas estáticas
    if (spec.staticRoutes && spec.staticRoutes.length > 0) {
      commands.push('');
      commands.push('! IPv6 Static Routes');
      for (const route of spec.staticRoutes) {
        commands.push(...this.generateStaticRoute(route));
      }
    }
    
    // RIPng
    if (spec.ripng) {
      commands.push(...this.generateRIPng(spec.ripng));
    }
    
    // OSPFv3
    if (spec.ospfv3) {
      commands.push(...this.generateOSPFv3(spec.ospfv3));
    }
    
    return commands;
  }
  
  /**
   * Genera configuración de interfaz IPv6
   */
  private static generateInterface(spec: IPv6InterfaceConfig): string[] {
    const commands: string[] = [];
    
    commands.push(`interface ${spec.name}`);
    commands.push(' ipv6 enable');
    
    // Dirección IPv6
    if (spec.address) {
      commands.push(` ipv6 address ${spec.address}`);
    }
    
    // Link-local
    if (spec.linkLocal) {
      commands.push(` ipv6 address ${spec.linkLocal} link-local`);
    }
    
    // EUI-64
    if (spec.eui64 && spec.address) {
      // Si address es un prefijo, usar eui-64
      commands.push(` ipv6 address ${spec.address} eui-64`);
    }
    
    // Autoconfiguración
    if (spec.autoConfig === 'slaac') {
      commands.push(' ipv6 address autoconfig');
    } else if (spec.autoConfig === 'dhcpv6') {
      commands.push(' ipv6 address dhcp');
    }
    
    // OSPFv3 en interfaz
    if (spec.ospfv3) {
      commands.push(` ipv6 ospf ${spec.ospfv3.processId} area ${spec.ospfv3.area}`);
    }
    
    // RIPng en interfaz
    if (spec.ripng?.enable) {
      commands.push(` ipv6 rip ${spec.ripng.name || 'RIPng'} enable`);
    }
    
    commands.push(' exit');
    
    return commands;
  }
  
  /**
   * Genera ruta estática IPv6
   */
  private static generateStaticRoute(route: IPv6StaticRoute): string[] {
    const commands: string[] = [];
    
    let cmd = `ipv6 route ${route.network}`;
    
    if (route.interface && route.nextHop) {
      cmd += ` ${route.interface} ${route.nextHop}`;
    } else if (route.nextHop) {
      cmd += ` ${route.nextHop}`;
    } else if (route.interface) {
      cmd += ` ${route.interface}`;
    }
    
    if (route.distance) {
      cmd += ` ${route.distance}`;
    }
    
    if (route.name) {
      cmd += ` name ${route.name}`;
    }
    
    commands.push(cmd);
    
    return commands;
  }
  
  /**
   * Genera configuración RIPng
   */
  private static generateRIPng(spec: RIPngSpec): string[] {
    const commands: string[] = [];
    
    commands.push('! RIPng Configuration');
    commands.push(`ipv6 router rip ${spec.name}`);
    
    // Redistribución
    if (spec.redistribute && spec.redistribute.length > 0) {
      for (const proto of spec.redistribute) {
        commands.push(` redistribute ${proto}`);
      }
    }
    
    // Default information
    if (spec.defaultInformation) {
      commands.push(' default-information originate');
    }
    
    commands.push(' exit');
    
    return commands;
  }
  
  /**
   * Genera configuración OSPFv3
   */
  private static generateOSPFv3(spec: OSPFv3Spec): string[] {
    const commands: string[] = [];
    
    commands.push('! OSPFv3 Configuration');
    commands.push(`ipv6 router ospf ${spec.processId}`);
    
    // Router ID
    if (spec.routerId) {
      commands.push(` router-id ${spec.routerId}`);
    }
    
    // Reference bandwidth
    if (spec.autoCostReferenceBandwidth) {
      commands.push(` auto-cost reference-bandwidth ${spec.autoCostReferenceBandwidth}`);
    }
    
    // Default route
    if (spec.defaultInformation) {
      if (spec.defaultInformation === 'originate always') {
        commands.push(' default-information originate always');
      } else {
        commands.push(' default-information originate');
      }
    }
    
    // Áreas
    for (const area of spec.areas) {
      if (area.type === 'stub') {
        let cmd = ` area ${area.areaId} stub`;
        if (area.stubNoSummary) {
          cmd += ' no-summary';
        }
        commands.push(cmd);
      } else if (area.type === 'nssa') {
        let cmd = ` area ${area.areaId} nssa`;
        if (area.nssaDefaultOriginate) {
          cmd += ' default-information-originate';
        }
        commands.push(cmd);
      }
    }
    
    commands.push(' exit');
    
    // Nota: OSPFv3 usa comandos de interfaz, no network
    commands.push(' ! Note: Enable OSPFv3 on interfaces with "ipv6 ospf <process-id> area <area>"');
    
    return commands;
  }
  
  // ==========================================================================
  // VALIDATION
  // ==========================================================================
  
  /**
   * Valida configuración IPv6
   */
  static validate(spec: IPv6Spec): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar interfaces
    if (spec.interfaces) {
      for (const iface of spec.interfaces) {
        if (iface.address && !this.isValidIPv6(iface.address)) {
          errors.push(`Invalid IPv6 address on ${iface.name}: ${iface.address}`);
        }
        
        if (iface.linkLocal && !this.isValidIPv6(iface.linkLocal)) {
          errors.push(`Invalid IPv6 link-local on ${iface.name}: ${iface.linkLocal}`);
        }
        
        if (iface.ospfv3) {
          if (iface.ospfv3.processId < 1 || iface.ospfv3.processId > 65535) {
            errors.push(`Invalid OSPFv3 process ID on ${iface.name}`);
          }
        }
      }
    }
    
    // Validar rutas estáticas
    if (spec.staticRoutes) {
      for (const route of spec.staticRoutes) {
        if (!this.isValidIPv6Prefix(route.network)) {
          errors.push(`Invalid IPv6 network: ${route.network}`);
        }
        
        if (route.nextHop && !this.isValidIPv6(route.nextHop)) {
          errors.push(`Invalid IPv6 next-hop: ${route.nextHop}`);
        }
        
        if (route.distance && (route.distance < 1 || route.distance > 255)) {
          errors.push(`Invalid distance: ${route.distance}`);
        }
      }
    }
    
    // Validar OSPFv3
    if (spec.ospfv3) {
      if (spec.ospfv3.routerId && !this.isValidIPv4(spec.ospfv3.routerId)) {
        errors.push(`Invalid OSPFv3 router-id: ${spec.ospfv3.routerId}`);
      }
    }
    
    // Warnings
    if (spec.routing && (!spec.interfaces || spec.interfaces.length === 0)) {
      warnings.push('IPv6 routing enabled but no interfaces configured');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  // ==========================================================================
  // EXAMPLES
  // ==========================================================================
  
  /**
   * Genera ejemplo de configuración IPv6 básica
   */
  static generateBasicExample(): string {
    const spec: IPv6Spec = {
      routing: true,
      interfaces: [
        {
          name: 'GigabitEthernet0/0',
          address: '2001:db8:1::1/64',
          linkLocal: 'fe80::1'
        },
        {
          name: 'GigabitEthernet0/1',
          address: '2001:db8:2::1/64',
          ospfv3: { processId: 1, area: '0' }
        }
      ],
      staticRoutes: [
        { network: '2001:db8:100::/64', nextHop: '2001:db8:1::2' }
      ]
    };
    
    return this.generate(spec).join('\n');
  }
  
  /**
   * Genera ejemplo con OSPFv3
   */
  static generateOSPFv3Example(): string {
    const spec: IPv6Spec = {
      routing: true,
      interfaces: [
        {
          name: 'GigabitEthernet0/0',
          address: '2001:db8:10::1/64',
          ospfv3: { processId: 1, area: '0' }
        },
        {
          name: 'GigabitEthernet0/1',
          address: '2001:db8:20::1/64',
          ospfv3: { processId: 1, area: '1' }
        }
      ],
      ospfv3: {
        processId: 1,
        routerId: '1.1.1.1',
        areas: [
          { areaId: '0', type: 'normal' },
          { areaId: '1', type: 'stub', stubNoSummary: true }
        ]
      }
    };
    
    return this.generate(spec).join('\n');
  }
  
  // ==========================================================================
  // HELPERS
  // ==========================================================================
  
  private static isValidIPv6(address: string): boolean {
    // Remove prefix length if present
    const addr = address.split('/')[0] ?? address;

    // Basic IPv6 validation
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    const ipv6Compressed = /^::$|^([0-9a-fA-F]{0,4}:)*::([0-9a-fA-F]{0,4}:)*[0-9a-fA-F]{0,4}$/;

    return ipv6Regex.test(addr) || ipv6Compressed.test(addr);
  }
  
  private static isValidIPv6Prefix(prefix: string): boolean {
    // Should have /prefix-length
    if (!prefix.includes('/')) return false;

    const [addr, len] = prefix.split('/');
    if (!addr || !len) return false;
    const prefixLen = parseInt(len);

    return this.isValidIPv6(addr) && prefixLen >= 0 && prefixLen <= 128;
  }
  
  private static isValidIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
      const num = parseInt(p);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }
}

export default IPv6Generator;
