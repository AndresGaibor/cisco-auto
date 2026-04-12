import { ipv6ConfigSchema, type Ipv6ConfigInput } from './ipv6.schema.js';

export const IPV6_VERIFY_COMMANDS = ['show ipv6 interface brief', 'show ipv6 route', 'show ipv6 protocols'] as const;

/**
 * Genera configuración de interfaces IPv6
 */
function generateInterfaceConfig(iface: Ipv6ConfigInput['interfaces'][number]): string[] {
  const commands: string[] = [];

  commands.push(`interface ${iface.name}`);
  commands.push(' ipv6 enable');

  // Dirección IPv6
  if (iface.address) {
    if (iface.eui64) {
      commands.push(` ipv6 address ${iface.address} eui-64`);
    } else {
      commands.push(` ipv6 address ${iface.address}`);
    }
  }

  // Link-local
  if (iface.linkLocal) {
    commands.push(` ipv6 address ${iface.linkLocal} link-local`);
  }

  // Autoconfiguración
  if (iface.autoConfig === 'slaac') {
    commands.push(' ipv6 address autoconfig');
  } else if (iface.autoConfig === 'dhcpv6') {
    commands.push(' ipv6 address dhcp');
  }

  // OSPFv3 en interfaz
  if (iface.ospfv3) {
    commands.push(` ipv6 ospf ${iface.ospfv3.processId} area ${iface.ospfv3.area}`);
  }

  // RIPng en interfaz
  if (iface.ripng?.enable) {
    commands.push(` ipv6 rip ${iface.ripng.name || 'RIPng'} enable`);
  }

  commands.push(' exit');
  return commands;
}

/**
 * Genera rutas estáticas IPv6
 */
function generateStaticRoutes(routes: Ipv6ConfigInput['staticRoutes']): string[] {
  const commands: string[] = [];

  if (!routes || routes.length === 0) return commands;

  for (const route of routes) {
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
  }

  return commands;
}

/**
 * Genera configuración RIPng
 */
function generateRIPng(config: Ipv6ConfigInput['ripng']): string[] {
  if (!config) return [];

  const commands: string[] = [];
  commands.push(`ipv6 router rip ${config.name}`);

  if (config.redistribute && config.redistribute.length > 0) {
    for (const proto of config.redistribute) {
      commands.push(` redistribute ${proto}`);
    }
  }

  if (config.defaultInformation) {
    commands.push(' default-information originate');
  }

  commands.push(' exit');
  return commands;
}

/**
 * Genera configuración OSPFv3
 */
function generateOSPFv3(config: Ipv6ConfigInput['ospfv3']): string[] {
  if (!config) return [];

  const commands: string[] = [];
  commands.push(`ipv6 router ospf ${config.processId}`);

  if (config.routerId) {
    commands.push(` router-id ${config.routerId}`);
  }

  if (config.autoCostReferenceBandwidth) {
    commands.push(` auto-cost reference-bandwidth ${config.autoCostReferenceBandwidth}`);
  }

  if (config.defaultInformation) {
    commands.push(` default-information originate${config.defaultInformation === 'originate always' ? ' always' : ''}`);
  }

  for (const area of config.areas) {
    if (area.type === 'stub') {
      commands.push(` area ${area.areaId} stub${area.stubNoSummary ? ' no-summary' : ''}`);
    } else if (area.type === 'nssa') {
      commands.push(` area ${area.areaId} nssa${area.nssaDefaultOriginate ? ' default-information-originate' : ''}`);
    }
  }

  commands.push(' exit');
  return commands;
}

/**
 * Genera todos los comandos de IPv6 a partir de una configuración
 */
export function generateIpv6Commands(spec: Ipv6ConfigInput): string[] {
  const config = ipv6ConfigSchema.parse(spec);
  const commands: string[] = [];

  // Habilitar routing IPv6
  if (config.routing) {
    commands.push('ipv6 unicast-routing');
  }

  // Configurar interfaces
  if (config.interfaces && config.interfaces.length > 0) {
    for (const iface of config.interfaces) {
      commands.push(...generateInterfaceConfig(iface));
    }
  }

  // Rutas estáticas
  const staticCmds = generateStaticRoutes(config.staticRoutes);
  if (staticCmds.length > 0) {
    commands.push('! Rutas estáticas IPv6');
    commands.push(...staticCmds);
  }

  // RIPng
  const ripngCmds = generateRIPng(config.ripng);
  if (ripngCmds.length > 0) {
    commands.push('! Configuración RIPng');
    commands.push(...ripngCmds);
  }

  // OSPFv3
  const ospfv3Cmds = generateOSPFv3(config.ospfv3);
  if (ospfv3Cmds.length > 0) {
    commands.push('! Configuración OSPFv3');
    commands.push(...ospfv3Cmds);
  }

  return commands;
}
