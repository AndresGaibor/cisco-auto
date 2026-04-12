import { routingConfigSchema, type RoutingConfigInput } from './routing.schema.js';

export const ROUTING_VERIFY_COMMANDS = ['show ip route', 'show ip protocols'] as const;

// Genera comandos de rutas estáticas
function generateStaticRoutes(config: RoutingConfigInput['staticRoutes']): string[] {
  const commands: string[] = [];
  if (!config || config.length === 0) return commands;

  for (const route of config) {
    let cmd = `ip route ${route.network} ${route.mask} ${route.nextHop}`;
    if (route.administrativeDistance !== undefined && route.administrativeDistance !== 1) {
      cmd += ` ${route.administrativeDistance}`;
    }
    commands.push(cmd);
  }

  return commands;
}

// Genera configuración OSPF
function generateOspf(config: RoutingConfigInput['ospf']): string[] {
  if (!config) return [];

  const commands: string[] = [];
  commands.push(`router ospf ${config.processId}`);

  if (config.routerId) {
    commands.push(` router-id ${config.routerId}`);
  }

  for (const area of config.areas) {
    for (const net of area.networks) {
      commands.push(` network ${net.network} ${net.wildcard} area ${area.areaId}`);
    }
  }

  for (const iface of config.passiveInterfaces ?? []) {
    commands.push(` passive-interface ${iface}`);
  }

  commands.push('exit');
  return commands;
}

// Genera configuración EIGRP
function generateEigrp(config: RoutingConfigInput['eigrp']): string[] {
  if (!config) return [];

  const commands: string[] = [];
  commands.push(`router eigrp ${config.asNumber}`);

  if (config.routerId) {
    commands.push(` eigrp router-id ${config.routerId}`);
  }

  for (const network of config.networks) {
    commands.push(` network ${network}`);
  }

  for (const iface of config.passiveInterfaces ?? []) {
    commands.push(` passive-interface ${iface}`);
  }

  commands.push('exit');
  return commands;
}

// Genera configuración BGP
function generateBgp(config: RoutingConfigInput['bgp']): string[] {
  if (!config) return [];

  const commands: string[] = [];
  commands.push(`router bgp ${config.asn}`);

  if (config.routerId) {
    commands.push(` bgp router-id ${config.routerId}`);
  }

  for (const neighbor of config.neighbors) {
    commands.push(` neighbor ${neighbor.ip} remote-as ${neighbor.remoteAs}`);
    if (neighbor.description) {
      commands.push(` neighbor ${neighbor.ip} description ${neighbor.description}`);
    }
    if (neighbor.nextHopSelf) {
      commands.push(` neighbor ${neighbor.ip} next-hop-self`);
    }
  }

  for (const network of config.networks ?? []) {
    let cmd = ` network ${network.network}`;
    if (network.mask) {
      cmd += ` mask ${network.mask}`;
    }
    commands.push(cmd);
  }

  commands.push('exit');
  return commands;
}

// Genera todos los comandos de routing a partir de una configuración
export function generateRoutingCommands(spec: RoutingConfigInput): string[] {
  const config = routingConfigSchema.parse(spec);
  const commands: string[] = [];

  const staticCmds = generateStaticRoutes(config.staticRoutes);
  if (staticCmds.length > 0) {
    commands.push('! Rutas estáticas');
    commands.push(...staticCmds);
  }

  const ospfCmds = generateOspf(config.ospf);
  if (ospfCmds.length > 0) {
    commands.push('! Configuración OSPF');
    commands.push(...ospfCmds);
  }

  const eigrpCmds = generateEigrp(config.eigrp);
  if (eigrpCmds.length > 0) {
    commands.push('! Configuración EIGRP');
    commands.push(...eigrpCmds);
  }

  const bgpCmds = generateBgp(config.bgp);
  if (bgpCmds.length > 0) {
    commands.push('! Configuración BGP');
    commands.push(...bgpCmds);
  }

  return commands;
}
