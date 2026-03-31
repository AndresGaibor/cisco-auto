import type {
  DeviceSpec,
  RoutingSpec,
  StaticRouteSpec,
  OSPFSpec,
  EIGRPSpec,
  RIPSpec,
  BGPSpec,
} from '../canonical/device.spec.ts';
import { NetworkUtils } from './utils.ts';

export class RoutingGenerator {
  /**
   * Valida formato de router ID (debe ser IP válida)
   */
  private static isValidRouterId(routerId: string): boolean {
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Pattern.test(routerId)) return false;
    const octets = routerId.split('.').map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
  }

  /**
   * Valida configuración de routing
   */
  static validate(routing: RoutingSpec): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar router ID de OSPF
    if (routing.ospf?.routerId && !this.isValidRouterId(routing.ospf.routerId)) {
      errors.push(`Invalid OSPF router-id: ${routing.ospf.routerId}. Must be a valid IPv4 address`);
    }

    // Validar router ID de EIGRP
    if (routing.eigrp?.routerId && !this.isValidRouterId(routing.eigrp.routerId)) {
      errors.push(`Invalid EIGRP router-id: ${routing.eigrp.routerId}. Must be a valid IPv4 address`);
    }

    // Validar router ID de BGP
    if (routing.bgp?.routerId && !this.isValidRouterId(routing.bgp.routerId)) {
      errors.push(`Invalid BGP router-id: ${routing.bgp.routerId}. Must be a valid IPv4 address`);
    }

    // Warning: OSPF sin router-id explícito (usa IP más alta)
    if (routing.ospf && !routing.ospf.routerId) {
      warnings.push('OSPF without explicit router-id. Will use highest IP address');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  public static generateRouting(routing: RoutingSpec): string[] {
    const commands: string[] = [];
    if (!routing) return commands;

    if (routing.static && routing.static.length > 0) {
      commands.push('! Rutas estáticas');
      for (const route of routing.static) {
        const mask = route.mask || (route.network.includes('/') ? NetworkUtils.cidrToMask(parseInt(route.network.split('/')[1] || '24')) : '');
        const routeCmd = `ip route ${route.network} ${mask} ${route.nextHop}`;
        const fullCmd = route.distance !== 1
          ? `${routeCmd} ${route.distance}`
          : routeCmd;
        commands.push(fullCmd);
      }
    }

    if (routing.ospf) {
      commands.push(...this.generateOSPF(routing.ospf));
    }
    if (routing.eigrp) {
      commands.push(...this.generateEIGRP(routing.eigrp));
    }
    if (routing.rip) {
      commands.push(...this.generateRIP(routing.rip));
    }
    if (routing.bgp) {
      commands.push(...this.generateBGP(routing.bgp));
    }

    return commands;
  }

  private static generateOSPF(ospf: OSPFSpec): string[] {
    const commands: string[] = [];
    commands.push(`! Configuración OSPF Proceso ${ospf.processId}`);
    commands.push(`router ospf ${ospf.processId}`);

    if (ospf.routerId) {
      commands.push(` router-id ${ospf.routerId}`);
    }

    // Canonical OSPF: networks are grouped by area (optional)
    for (const area of ospf.areas || []) {
      for (const network of area.networks) {
        // Networks in canonical are simple network addresses, need to convert to wildcard
        if (network.includes('/')) {
          const [net, cidrPart] = network.split('/');
          if (cidrPart) {
            const wildcard = NetworkUtils.cidrToWildcard(parseInt(cidrPart));
            commands.push(` network ${net} ${wildcard} area ${area.areaId}`);
          }
        } else {
          // Assume it's already in the format "network wildcard area"
          commands.push(` network ${network} area ${area.areaId}`);
        }
      }
    }

    if (ospf.passiveInterfaces) {
      for (const iface of ospf.passiveInterfaces) {
        commands.push(` passive-interface ${iface}`);
      }
    }

    commands.push(' exit');
    return commands;
  }

  private static generateEIGRP(eigrp: EIGRPSpec): string[] {
    const commands: string[] = [];
    commands.push(`! Configuración EIGRP AS ${eigrp.asNumber}`);
    commands.push(`router eigrp ${eigrp.asNumber}`);

    if (eigrp.routerId) {
      commands.push(` eigrp router-id ${eigrp.routerId}`);
    }
    if (eigrp.noAutoSummary) {
      commands.push(' no auto-summary');
    }

    for (const network of eigrp.networks) {
      commands.push(` network ${network}`);
    }

    if (eigrp.passiveInterfaces) {
      for (const iface of eigrp.passiveInterfaces) {
        commands.push(` passive-interface ${iface}`);
      }
    }

    commands.push(' exit');
    return commands;
  }

  private static generateRIP(rip: RIPSpec): string[] {
    const commands: string[] = [];
    commands.push('! Configuración RIP');
    commands.push('router rip');
    commands.push(` version ${rip.version}`);

    for (const network of rip.networks) {
      commands.push(` network ${network}`);
    }

    if (rip.passiveInterfaces) {
      for (const iface of rip.passiveInterfaces) {
        commands.push(` passive-interface ${iface}`);
      }
    }

    if (rip.defaultRoute) {
      commands.push(' default-information originate');
    }

    commands.push(' exit');
    return commands;
  }

  private static generateBGP(bgp: BGPSpec): string[] {
    const commands: string[] = [];
    commands.push(`! Configuración BGP AS ${bgp.asn}`);
    commands.push(`router bgp ${bgp.asn}`);

    if (bgp.routerId) {
      commands.push(` bgp router-id ${bgp.routerId}`);
    }

    for (const neighbor of bgp.neighbors) {
      commands.push(` neighbor ${neighbor.ip} remote-as ${neighbor.remoteAs}`);
      if (neighbor.description) {
        commands.push(` neighbor ${neighbor.ip} description ${neighbor.description}`);
      }
      if (neighbor.nextHopSelf) {
        commands.push(` neighbor ${neighbor.ip} next-hop-self`);
      }
    }

    if (bgp.networks) {
      for (const network of bgp.networks) {
        commands.push(` network ${network}`);
      }
    }

    commands.push(' exit');
    return commands;
  }
}
