import { Device, OSPF, EIGRP } from '../types/index.ts';
import { NetworkUtils } from './utils.ts';

export class RoutingGenerator {
  public static generateRouting(routing: Device['routing']): string[] {
    const commands: string[] = [];
    if (!routing) return commands;
    
    if (routing.static && routing.static.length > 0) {
      commands.push('! Rutas estáticas');
      for (const route of routing.static) {
        const [network, maskBits] = route.network.split('/');
        const mask = NetworkUtils.cidrToMask(parseInt(maskBits));
        const routeCmd = `ip route ${network} ${mask} ${route.nextHop}`;
        const fullCmd = route.administrativeDistance !== 1 
          ? `${routeCmd} ${route.administrativeDistance}`
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
    
    return commands;
  }

  private static generateOSPF(ospf: OSPF): string[] {
    const commands: string[] = [];
    commands.push(`! Configuración OSPF Proceso ${ospf.processId}`);
    commands.push(`router ospf ${ospf.processId}`);
    
    if (ospf.routerId) {
      commands.push(` router-id ${ospf.routerId}`);
    }
    
    for (const network of ospf.networks) {
      const [net, wild] = network.network.split('/');
      const wildcard = NetworkUtils.cidrToWildcard(parseInt(wild));
      commands.push(` network ${net} ${wildcard} area ${network.area}`);
    }
    
    if (ospf.defaultRoute) {
      commands.push(' default-information originate');
    }
    
    if (ospf.passiveInterfaces) {
      for (const iface of ospf.passiveInterfaces) {
        commands.push(` passive-interface ${iface}`);
      }
    }
    
    commands.push(' exit');
    return commands;
  }

  private static generateEIGRP(eigrp: EIGRP): string[] {
    const commands: string[] = [];
    commands.push(`! Configuración EIGRP AS ${eigrp.autonomousSystem}`);
    commands.push(`router eigrp ${eigrp.autonomousSystem}`);
    
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
}