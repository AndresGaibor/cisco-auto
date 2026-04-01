/**
 * Routing Builder - Builds routing configurations
 * Handles static routes, OSPF, EIGRP, and BGP setups
 */

export interface StaticRouteConfig {
  network: string;
  mask: string;
  gateway?: string;
  interface?: string;
  distance?: number;
  description?: string;
}

export interface OSPFRouterConfig {
  processId: number;
  routerId: string;
  areas: OSPFArea[];
  networks: string[];
}

export interface OSPFArea {
  areaId: string;
  type?: 'normal' | 'stub' | 'nssa';
  networks?: string[];
}

export interface EIGRPRouterConfig {
  asNumber: number;
  routerId?: string;
  networks: string[];
  redistributeStatic?: boolean;
}

export class RoutingBuilder {
  buildStaticRoute(config: StaticRouteConfig): string[] {
    const commands: string[] = [];

    let command = `ip route ${config.network} ${config.mask}`;

    if (config.gateway) {
      command += ` ${config.gateway}`;
    } else if (config.interface) {
      command += ` ${config.interface}`;
    }

    if (config.distance) {
      command += ` ${config.distance}`;
    }

    commands.push(command);

    if (config.description) {
      commands.push(`ip route ${config.network} ${config.mask} description ${config.description}`);
    }

    return commands;
  }

  buildOSPFRouter(config: OSPFRouterConfig): string[] {
    const commands: string[] = [];

    commands.push(`router ospf ${config.processId}`);

    // Router ID
    if (config.routerId) {
      commands.push(`router-id ${config.routerId}`);
    }

    // Networks
    for (const network of config.networks) {
      const [ip, mask] = network.split(' ');
      commands.push(`network ${ip} ${mask} area ${this.getAreaForNetwork(config.areas, network)}`);
    }

    // Areas
    for (const area of config.areas) {
      if (area.type && area.type !== 'normal') {
        commands.push(`area ${area.areaId} ${area.type}`);
      }
    }

    commands.push('exit');

    return commands;
  }

  buildEIGRPRouter(config: EIGRPRouterConfig): string[] {
    const commands: string[] = [];

    commands.push(`router eigrp ${config.asNumber}`);

    // Router ID
    if (config.routerId) {
      commands.push(`eigrp router-id ${config.routerId}`);
    }

    // Networks
    for (const network of config.networks) {
      const [ip, mask] = network.split(' ');
      commands.push(`network ${ip} ${mask}`);
    }

    // Redistribute static
    if (config.redistributeStatic) {
      commands.push('redistribute static');
    }

    commands.push('exit');

    return commands;
  }

  buildDefaultRoute(gateway: string, distance?: number): string[] {
    let command = `ip route 0.0.0.0 0.0.0.0 ${gateway}`;
    if (distance) {
      command += ` ${distance}`;
    }
    return [command];
  }

  validateStaticRoute(config: StaticRouteConfig): string[] {
    const errors: string[] = [];

    if (!this.isValidIP(config.network)) {
      errors.push(`Invalid network address: ${config.network}`);
    }

    if (!this.isValidIP(config.mask)) {
      errors.push(`Invalid subnet mask: ${config.mask}`);
    }

    if (config.gateway && !this.isValidIP(config.gateway)) {
      errors.push(`Invalid gateway: ${config.gateway}`);
    }

    if (config.distance && (config.distance < 1 || config.distance > 255)) {
      errors.push(`Invalid distance: ${config.distance} (1-255)`);
    }

    return errors;
  }

  validateOSPFRouter(config: OSPFRouterConfig): string[] {
    const errors: string[] = [];

    if (config.processId < 1 || config.processId > 65535) {
      errors.push(`Invalid OSPF process ID: ${config.processId} (1-65535)`);
    }

    if (config.routerId && !this.isValidIP(config.routerId)) {
      errors.push(`Invalid router ID: ${config.routerId}`);
    }

    return errors;
  }

  private getAreaForNetwork(areas: OSPFArea[], network: string): string {
    // Default to area 0
    return areas.length > 0 ? areas[0]!.areaId : '0';
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
