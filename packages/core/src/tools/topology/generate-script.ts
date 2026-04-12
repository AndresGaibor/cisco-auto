/**
 * TOOL: pt_generate_script
 *
 * Genera un script de Packet Tracer (JavaScript o Python) a partir de un
 * TopologyPlan. El script incluye comandos para:
 * - Añadir dispositivos
 * - Crear enlaces
 * - Configurar routers y switches (IOS)
 * - Configurar IPs en PCs
 */

import type {
  Tool,
  ToolInput,
  ToolResult,
  TopologyPlan,
  DevicePlan,
  LinkPlan,
  DHCPPlan,
  RoutingPlan,
  VLANPlan,
} from '../..';
import type { Device, ACL } from '../..';
import type {
  BGPSpec,
  DHCPServerSpec,
  EtherChannelSpec,
  IPv6Spec,
  NTPSpec,
  RIPSpec,
  SNMPSpec,
  STPSpec,
  SyslogSpec,
} from '../..';
import { generateBasicCommands, type BasicConfigInput } from '@cisco-auto/kernel/plugins/basic-config';
import { generateVlanCommands, type VlanConfigInput } from '@cisco-auto/kernel/plugins/vlan';
import { generateStpCommands, generateVtpCommands, generateEtherChannelCommands, type StpConfigInput, type EtherChannelConfigInput } from '@cisco-auto/kernel/plugins/switching';
import { generateRoutingCommands, type RoutingConfigInput } from '@cisco-auto/kernel/plugins/routing';
import { generateSecurityCommands, type SecurityConfigInput } from '@cisco-auto/kernel/plugins/security';
import { generateServicesCommands, type ServicesConfigInput } from '@cisco-auto/kernel/plugins/services';
import { generateIpv6Commands, type Ipv6ConfigInput } from '@cisco-auto/kernel/plugins/ipv6';

/**
 * Comando generado para un dispositivo
 */
export interface Command {
  deviceId: string;
  deviceName: string;
  type: 'addDevice' | 'addLink' | 'configureIos' | 'configurePc';
  command: string;
  params: Record<string, unknown>;
}

/**
 * Resultado de la generación del script
 */
export interface GenerateScriptResult {
  script: string;
  commands: Command[];
  format: 'javascript' | 'python';
  deviceCount: number;
  linkCount: number;
}

type GenerateScriptErrorCode = 'INVALID_INPUT' | 'INVALID_STRUCTURE';

function buildScriptError(message: string, code: GenerateScriptErrorCode): ToolResult<GenerateScriptResult> {
  return {
    ok: false,
    error: message,
    code,
  };
}

type ExtendedRoutingPlan = RoutingPlan & {
  rip?: RIPSpec;
  bgp?: BGPSpec;
  noAutoSummary?: boolean;
};

type ExtendedServicesPlan = {
  ntp?: NTPSpec;
  snmp?: SNMPSpec;
  http?: { enabled: boolean };
  ftp?: { enabled: boolean };
  syslog?: SyslogSpec;
  dhcp?: DHCPServerSpec[];
};

type ExtendedDevicePlan = DevicePlan & {
  vtp?: Device['vtp'];
  lines?: Device['lines'];
  acls?: ACL[];
  ssh?: Device['ssh'];
  telnet?: Device['telnet'];
  stp?: STPSpec;
  etherchannel?: EtherChannelSpec[];
  ipv6?: IPv6Spec;
  services?: ExtendedServicesPlan;
  routing?: ExtendedRoutingPlan;
};

function appendSection(target: string[], section: string[]): void {
  if (section.length === 0) {
    return;
  }

  if (target.length > 0 && target[target.length - 1] !== '') {
    target.push('');
  }

  target.push(...section);
}

function cidrToWildcard(prefix: number): string {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const octets = [
    (mask >>> 24) & 0xff,
    (mask >>> 16) & 0xff,
    (mask >>> 8) & 0xff,
    mask & 0xff,
  ];
  return octets.join('.');
}

function ipPrefixToNetworkWildcard(cidr: string): { network: string; wildcard: string } {
  const [ip, prefixStr] = cidr.split('/');
  const prefix = prefixStr ? parseInt(prefixStr, 10) : 24;
  return {
    network: ip!,
    wildcard: cidrToWildcard(prefix),
  };
}

function mapDhcpPlanToKernel(pool: DHCPPlan | DHCPServerSpec): { name: string; network: string; mask: string; defaultRouter?: string; dnsServers?: string[]; excludedAddresses?: string[] } {
  const p = pool as unknown as Record<string, unknown>;
  const poolName = (p.poolName as string) || (p.name as string);
  const dnsServer = p.dnsServer as string | undefined;
  const dnsServers = (p.dnsServers as string[]) || (dnsServer ? [dnsServer] : undefined);
  return {
    name: poolName,
    network: p.network as string,
    mask: (p.subnetMask as string) || (p.mask as string),
    defaultRouter: p.defaultRouter as string | undefined,
    dnsServers,
    excludedAddresses: (p.exclude as string[]) || (p.excludedAddresses as string[]),
  };
}

function mapVlanPlanToKernel(vlan: VLANPlan): { id: number; name?: string } {
  return {
    id: vlan.id,
    name: vlan.name,
  };
}

function mapRoutingPlanToKernel(routing: RoutingPlan): Omit<RoutingConfigInput, 'deviceName'> {
  const spec: Omit<RoutingConfigInput, 'deviceName'> = {};

  if (routing.static && routing.static.length > 0) {
    spec.staticRoutes = routing.static.map(route => ({
      network: route.network,
      mask: route.mask,
      nextHop: route.nextHop,
    }));
  }

  if (routing.ospf) {
    spec.ospf = {
      processId: routing.ospf.processId,
      routerId: routing.ospf.routerId || undefined,
      areas: routing.ospf.areas.map(area => ({
        areaId: area.area,
        networks: area.networks.map(n => ipPrefixToNetworkWildcard(n)),
      })),
    };
  }

  if (routing.eigrp) {
    spec.eigrp = {
      asNumber: routing.eigrp.asNumber,
      networks: routing.eigrp.networks,
    };
  }

  return spec;
}

function mapStpToKernel(device: ExtendedDevicePlan): StpConfigInput | undefined {
  if (device.stp) {
    return {
      mode: device.stp.mode,
      priority: (device.stp as any).priority,
      portfastDefault: device.stp.portfastDefault,
      bpduguardDefault: device.stp.bpduguardDefault,
      bpdufilterDefault: (device.stp as any).bpdufilterDefault,
      vlanConfig: device.stp.vlanConfig?.map(vc => ({
        vlanId: vc.vlanId,
        priority: vc.priority,
        rootPrimary: vc.rootPrimary,
        rootSecondary: vc.rootSecondary,
      })),
      rootPrimary: (device.stp as any).rootPrimary,
      rootSecondary: (device.stp as any).rootSecondary,
      interfaceConfig: device.stp.interfaceConfig?.map(ic => ({
        interface: ic.interface,
        portfast: ic.portfast,
        bpduguard: ic.bpduguard,
        bpdufilter: (ic as any).bpdufilter,
        cost: (ic as any).cost,
        portPriority: (ic as any).portPriority,
        linkType: (ic as any).linkType,
      })),
    };
  }

  // Infer STP para switches sin configuración explícita
  if (device.model.type !== 'switch' && device.model.type !== 'multilayer-switch') {
    return undefined;
  }

  const interfaceConfig = device.interfaces
    .filter(iface => iface.configured || typeof iface.vlan === 'number')
    .map(iface => ({
      interface: iface.name,
      portfast: (iface as any).mode !== 'trunk',
      bpduguard: (iface as any).mode !== 'trunk',
      linkType: (iface as any).mode === 'trunk' ? 'point-to-point' as const : undefined,
    }));

  return {
    mode: 'rapid-pvst',
    portfastDefault: true,
    bpduguardDefault: true,
    rootPrimary: device.model.type === 'multilayer-switch'
      ? device.vlans?.map(vlan => vlan.id)
      : undefined,
    interfaceConfig: interfaceConfig.length > 0 ? interfaceConfig : undefined,
  };
}

function mapEtherChannelsToKernel(device: ExtendedDevicePlan): EtherChannelConfigInput[] {
  if (!device.etherchannel || device.etherchannel.length === 0) return [];

  return device.etherchannel.map(ec => ({
    groupId: ec.groupId,
    mode: ec.mode,
    interfaces: ec.interfaces,
    portChannel: ec.portChannel || `Port-channel${ec.groupId}`,
    trunkMode: (ec as any).trunkMode,
    accessVlan: (ec as any).accessVlan,
    nativeVlan: (ec as any).nativeVlan,
    allowedVlans: (ec as any).allowedVlans,
    description: (ec as any).description,
    loadBalancing: (ec as any).loadBalancing,
  }));
}

function mapAclsToKernel(acls: ACL[]): SecurityConfigInput['acls'] {
  return acls.map(acl => {
    const entries = (acl as any).entries || (acl as any).rules || [];
    const rules = entries.map((entry: any) => ({
      action: entry.action as 'permit' | 'deny',
      protocol: entry.protocol as 'ip' | 'tcp' | 'udp' | 'icmp' | undefined,
      source: entry.source,
      sourceWildcard: entry.sourceWildcard,
      destination: entry.destination,
      destinationWildcard: entry.destinationWildcard,
      destinationPort: entry.port || entry.destinationPort,
    }));

    return {
      name: acl.name,
      type: (acl as any).type || 'extended',
      rules,
      appliedOn: (acl as any).appliedOn,
      direction: (acl as any).direction,
    };
  });
}

function mapNatToKernel(nat: any): Partial<SecurityConfigInput> {
  if (!nat) return {};

  const result: Partial<SecurityConfigInput> = {};

  if (nat.static) {
    result.natStatic = nat.static.map((s: any) => ({
      localIp: s.localIp,
      globalIp: s.globalIp,
    }));
  }

  if (nat.pool) {
    result.natPool = {
      name: nat.pool.name,
      startIp: nat.pool.startIp,
      endIp: nat.pool.endIp,
      netmask: nat.pool.netmask,
    };
  }

  if (nat.insideInterfaces) {
    result.natInsideInterfaces = nat.insideInterfaces;
  }

  if (nat.outsideInterfaces) {
    result.natOutsideInterfaces = nat.outsideInterfaces;
  }

  return result;
}

function mapVlanConfigToKernel(device: ExtendedDevicePlan): VlanConfigInput | undefined {
  if (!device.vlans || device.vlans.length === 0) return undefined;

  const trunkPorts: string[] = [];
  const accessPorts: { port: string; vlan: number }[] = [];

  for (const iface of device.interfaces) {
    const mode = (iface as any).mode;
    if (mode === 'trunk') {
      trunkPorts.push(iface.name);
    } else if (typeof iface.vlan === 'number') {
      accessPorts.push({ port: iface.name, vlan: iface.vlan });
    }
  }

  return {
    switchName: device.name,
    vlans: device.vlans.map(mapVlanPlanToKernel),
    trunkPorts: trunkPorts.length > 0 ? trunkPorts : undefined,
    accessPorts: accessPorts.length > 0 ? accessPorts : undefined,
  };
}

function mapVtpToKernel(device: ExtendedDevicePlan): { domainName: string; keySize: number; version: number } | undefined {
  if (!device.vtp) return undefined;

  const vtp = device.vtp as any;
  return {
    domainName: vtp.domain || device.name + '.local',
    keySize: vtp.keySize || 2048,
    version: vtp.version || 2,
  };
}

function mapServicesToKernel(device: ExtendedDevicePlan): Omit<ServicesConfigInput, 'deviceName'> | undefined {
  const services: Omit<ServicesConfigInput, 'deviceName'> = {};

  // DHCP desde device.dhcp (TopologyPlan legacy)
  if (device.dhcp && device.dhcp.length > 0) {
    services.dhcp = device.dhcp.map(mapDhcpPlanToKernel);
  }

  // DHCP desde device.services.dhcp
  if (device.services?.dhcp && device.services.dhcp.length > 0) {
    const mapped = device.services.dhcp.map(mapDhcpPlanToKernel);
    const existing = services.dhcp || [];
    services.dhcp = [...existing, ...mapped];
  }

  // NTP
  if (device.services?.ntp) {
    services.ntp = {
      servers: device.services.ntp.servers,
      master: (device.services.ntp as any).master,
      stratum: (device.services.ntp as any).stratum,
    };
  }

  // SNMP
  if (device.services?.snmp) {
    const snmp = device.services.snmp as any;
    services.snmp = {};
    if (snmp.communities) {
      services.snmp.communities = snmp.communities.map((c: any) => ({
        name: c.name,
        access: c.access || 'ro',
      }));
    }
    if (snmp.hosts) {
      services.snmp.hosts = snmp.hosts;
    }
  }

  // Syslog
  if (device.services?.syslog) {
    services.syslog = {
      servers: device.services.syslog.servers,
      trap: (device.services.syslog as any).trap,
    };
  }

  // DNS
  if (device.services?.http || device.services?.ftp) {
    services.dns = {};
  }

  // Verificar si hay alguna configuración
  if (!services.dhcp && !services.ntp && !services.snmp && !services.syslog && !services.dns) {
    return undefined;
  }

  return services;
}

/**
 * Genera los comandos IOS completos para un dispositivo usando plugins del kernel.
 */
export function generateIosCommands(device: DevicePlan): string[] {
  const dispositivo = device as ExtendedDevicePlan;
  const commands: string[] = [];

  // === 1. Configuración básica (hostname, SSH, líneas) ===
  const basic: BasicConfigInput = {
    deviceName: dispositivo.name,
    hostname: dispositivo.name,
  };

  if (dispositivo.credentials?.username) {
    basic.passwordEncryption = true;
    basic.noIpDomainLookup = true;
    basic.loggingSynchronous = true;
  }

  if (dispositivo.ssh) {
    const sshConf = dispositivo.ssh as any;
    basic.ssh = {
      domainName: sshConf.domainName || `${dispositivo.name}.local`,
      keySize: sshConf.keySize || 2048,
      version: sshConf.version || 2,
    };
  }

  if (dispositivo.vtp) {
    const vtpConf = dispositivo.vtp as any;
    basic.ssh = basic.ssh || {
      domainName: vtpConf.domain || `${dispositivo.name}.local`,
    };
  }

  // Líneas de consola/VTY
  if (dispositivo.lines) {
    const lines: BasicConfigInput['lines'] = [];
    const linesConf = dispositivo.lines as any;

    if (linesConf.console) {
      lines.push({
        type: 'console',
        loginLocal: linesConf.console.login,
        execTimeout: linesConf.console.execTimeout,
        transportInput: linesConf.console.transportInput,
        password: linesConf.console.password,
      });
    }

    if (linesConf.vty) {
      lines.push({
        type: 'vty',
        range: `${linesConf.vty.start} ${linesConf.vty.end}`,
        loginLocal: linesConf.vty.login,
        transportInput: linesConf.vty.transportInput,
        execTimeout: linesConf.vty.execTimeout,
        password: linesConf.vty.password,
      });
    }

    if (linesConf.aux) {
      lines.push({
        type: 'aux',
        loginLocal: linesConf.aux.login,
        execTimeout: linesConf.aux.execTimeout,
        transportInput: linesConf.aux.transportInput,
        password: linesConf.aux.password,
      });
    }

    if (lines.length > 0) {
      basic.lines = lines;
    }
  }

  appendSection(commands, generateBasicCommands(basic));

  // === 2. VLANs ===
  const vlanConfig = mapVlanConfigToKernel(dispositivo);
  if (vlanConfig) {
    appendSection(commands, generateVlanCommands(vlanConfig));
  }

  // === 3. VTP ===
  if (dispositivo.vtp) {
    const vtp = dispositivo.vtp as any;
    appendSection(commands, generateVtpCommands({
      mode: vtp.mode || 'server',
      domain: vtp.domain,
      password: vtp.password,
      version: vtp.version,
    }));
  }

  // === 4. STP ===
  const stpConfig = mapStpToKernel(dispositivo);
  if (stpConfig) {
    appendSection(commands, generateStpCommands(stpConfig));
  }

  // === 5. EtherChannel ===
  const etherChannels = mapEtherChannelsToKernel(dispositivo);
  for (const ec of etherChannels) {
    appendSection(commands, generateEtherChannelCommands(ec));
  }

  // === 6. Routing ===
  if (dispositivo.routing) {
    const routingSpec: RoutingConfigInput = {
      ...mapRoutingPlanToKernel(dispositivo.routing),
      deviceName: dispositivo.name,
    };

    // BGP desde ExtendedRoutingPlan
    const extRouting = dispositivo.routing as ExtendedRoutingPlan;
    if (extRouting.bgp) {
      routingSpec.bgp = {
        asn: extRouting.bgp.asn,
        routerId: extRouting.bgp.routerId,
        neighbors: extRouting.bgp.neighbors.map((n: any) => ({
          ip: n.ip,
          remoteAs: n.remoteAs,
          description: n.description,
          nextHopSelf: n.nextHopSelf,
        })),
        networks: extRouting.bgp.networks?.map((net: any) => ({
          network: net.network,
          mask: net.mask,
        })),
      };
    }

    appendSection(commands, generateRoutingCommands(routingSpec));
  }

  // === 7. Security (ACLs + NAT) ===
  const securitySpec: SecurityConfigInput = { deviceName: dispositivo.name };
  if (dispositivo.acls && dispositivo.acls.length > 0) {
    securitySpec.acls = mapAclsToKernel(dispositivo.acls);
  }
  const natSpec = mapNatToKernel((dispositivo as any).nat);
  if (natSpec.natStatic) securitySpec.natStatic = natSpec.natStatic;
  if (natSpec.natPool) securitySpec.natPool = natSpec.natPool;
  if (natSpec.natInsideInterfaces) securitySpec.natInsideInterfaces = natSpec.natInsideInterfaces;
  if (natSpec.natOutsideInterfaces) securitySpec.natOutsideInterfaces = natSpec.natOutsideInterfaces;

  if (securitySpec.acls || securitySpec.natStatic || securitySpec.natPool) {
    appendSection(commands, generateSecurityCommands(securitySpec));
  }

  // === 8. Services ===
  const servicesConfig = mapServicesToKernel(dispositivo);
  if (servicesConfig) {
    appendSection(commands, generateServicesCommands({ deviceName: dispositivo.name, ...servicesConfig }));
  }

  // === 9. IPv6 ===
  if (dispositivo.ipv6) {
    const ipv6Conf = dispositivo.ipv6 as any;
    const ipv6Spec: Ipv6ConfigInput = {
      deviceName: dispositivo.name,
      routing: dispositivo.ipv6.routing,
      interfaces: ipv6Conf.interfaces?.map((iface: any) => ({
        name: iface.name,
        address: iface.address,
        linkLocal: iface.linkLocal,
        eui64: iface.eui64,
        autoConfig: iface.autoConfig,
        ospfv3: iface.ospfv3,
        ripng: iface.ripng,
      })),
      staticRoutes: ipv6Conf.staticRoutes,
      ripng: ipv6Conf.ripng,
      ospfv3: ipv6Conf.ospfv3,
    };
    appendSection(commands, generateIpv6Commands(ipv6Spec));
  }

  return commands;
}

/**
 * Genera el script JavaScript para PTBuilder
 */
function generateJavaScript(plan: TopologyPlan): { script: string; commands: Command[] } {
  const commands: Command[] = [];
  const lines: string[] = [];

  // Cabecera del script
  lines.push('// PTBuilder Script');
  lines.push('// Generado automáticamente');
  lines.push(`// Topología: ${plan.name}`);
  lines.push('');

  // 1. Añadir dispositivos
  lines.push('// === Dispositivos ===');
  for (const device of plan.devices) {
    const deviceType = device.model.ptType;
    const x = device.position.x;
    const y = device.position.y;

    const cmd = `pt.addDevice(${JSON.stringify(device.id)}, ${JSON.stringify(deviceType)}, ${x}, ${y});`;
    lines.push(cmd);

    commands.push({
      deviceId: device.id,
      deviceName: device.name,
      type: 'addDevice',
      command: cmd,
      params: { name: device.id, type: deviceType, x, y }
    });
  }

  lines.push('');

  // 2. Añadir enlaces
  lines.push('// === Enlaces ===');
  for (const link of plan.links) {
    const cmd = `pt.addLink(${JSON.stringify(link.from.deviceId)}, ${JSON.stringify(link.from.port)}, ${JSON.stringify(link.to.deviceId)}, ${JSON.stringify(link.to.port)}, ${JSON.stringify(link.cableType)});`;
    lines.push(cmd);

    commands.push({
      deviceId: link.id,
      deviceName: `${link.from.deviceName} -> ${link.to.deviceName}`,
      type: 'addLink',
      command: cmd,
      params: {
        device1: link.from.deviceId,
        port1: link.from.port,
        device2: link.to.deviceId,
        port2: link.to.port,
        cableType: link.cableType
      }
    });
  }

  lines.push('');

  const iosDevices = plan.devices.filter(d =>
    d.model.type === 'router' || d.model.type === 'switch' || d.model.type === 'multilayer-switch'
  );

  if (iosDevices.length > 0) {
    lines.push('// === Configuración IOS ===');
    for (const device of iosDevices) {
      const configLines = generateIosCommands(device);

      if (configLines.length > 0) {
        lines.push(`pt.configureIosDevice(${JSON.stringify(device.id)}, [`);
        for (const cfgLine of configLines) {
          lines.push(`  ${JSON.stringify(cfgLine)},`);
        }
        lines.push(']);');
        lines.push('');

        commands.push({
          deviceId: device.id,
          deviceName: device.name,
          type: 'configureIos',
          command: `pt.configureIosDevice('${device.id}', [...])`,
          params: { device: device.id, config: configLines }
        });
      }
    }
  }

  // 4. Configurar PCs
  const pcs = plan.devices.filter(d => d.model.type === 'pc' || d.model.type === 'server');

  if (pcs.length > 0) {
    lines.push('// === Configuración de PCs ===');
    for (const pc of pcs) {
      const configuredInterface = pc.interfaces.find(i => i.configured && i.ip);

      if (configuredInterface) {
        const ip = configuredInterface.ip || '';
        const mask = configuredInterface.subnetMask || '255.255.255.0';
        // Gateway sería la IP del router conectado, simplificamos con la primera IP de la subred
        const gateway = ip.substring(0, ip.lastIndexOf('.')) + '.1';

        const cmd = `pt.configurePcIp(${JSON.stringify(pc.id)}, ${JSON.stringify(ip)}, ${JSON.stringify(mask)}, ${JSON.stringify(gateway)});`;
        lines.push(cmd);

        commands.push({
          deviceId: pc.id,
          deviceName: pc.name,
          type: 'configurePc',
          command: cmd,
          params: { device: pc.id, ip, mask, gateway }
        });
      }
    }
  }

  lines.push('');
  lines.push('// Script completado');

  return {
    script: lines.join('\n'),
    commands
  };
}

/**
 * Genera el script Python para PTBuilder
 */
function generatePython(plan: TopologyPlan): { script: string; commands: Command[] } {
  const commands: Command[] = [];
  const lines: string[] = [];

  // Cabecera del script
  lines.push('# PTBuilder Script (Python)');
  lines.push('# Generado automáticamente');
  lines.push(`# Topología: ${plan.name}`);
  lines.push('');

  // 1. Añadir dispositivos
  lines.push('# === Dispositivos ===');
  for (const device of plan.devices) {
    const deviceType = device.model.ptType;
    const x = device.position.x;
    const y = device.position.y;

    const cmd = `pt.add_device('${device.id}', '${deviceType}', ${x}, ${y})`;
    lines.push(cmd);

    commands.push({
      deviceId: device.id,
      deviceName: device.name,
      type: 'addDevice',
      command: cmd,
      params: { name: device.id, type: deviceType, x, y }
    });
  }

  lines.push('');

  // 2. Añadir enlaces
  lines.push('# === Enlaces ===');
  for (const link of plan.links) {
    const cmd = `pt.add_link('${link.from.deviceId}', '${link.from.port}', '${link.to.deviceId}', '${link.to.port}', '${link.cableType}')`;
    lines.push(cmd);

    commands.push({
      deviceId: link.id,
      deviceName: `${link.from.deviceName} -> ${link.to.deviceName}`,
      type: 'addLink',
      command: cmd,
      params: {
        device1: link.from.deviceId,
        port1: link.from.port,
        device2: link.to.deviceId,
        port2: link.to.port,
        cableType: link.cableType
      }
    });
  }

  lines.push('');

  const iosDevices = plan.devices.filter(d =>
    d.model.type === 'router' || d.model.type === 'switch' || d.model.type === 'multilayer-switch'
  );

  if (iosDevices.length > 0) {
    lines.push('# === Configuración IOS ===');
    for (const device of iosDevices) {
      const configLines = generateIosCommands(device);

      if (configLines.length > 0) {
        lines.push(`pt.configure_ios_device(${JSON.stringify(device.id)}, """${configLines.join('\n')}""")`);
        lines.push('');

        commands.push({
          deviceId: device.id,
          deviceName: device.name,
          type: 'configureIos',
          command: `pt.configure_ios_device('${device.id}', ...)`,
          params: { device: device.id, config: configLines }
        });
      }
    }
  }

  // 4. Configurar PCs
  const pcs = plan.devices.filter(d => d.model.type === 'pc' || d.model.type === 'server');

  if (pcs.length > 0) {
    lines.push('# === Configuración de PCs ===');
    for (const pc of pcs) {
      const configuredInterface = pc.interfaces.find(i => i.configured && i.ip);

      if (configuredInterface) {
        const ip = configuredInterface.ip || '';
        const mask = configuredInterface.subnetMask || '255.255.255.0';
        const gateway = ip.substring(0, ip.lastIndexOf('.')) + '.1';

        const cmd = `pt.configure_pc_ip(${JSON.stringify(pc.id)}, ${JSON.stringify(ip)}, ${JSON.stringify(mask)}, ${JSON.stringify(gateway)})`;
        lines.push(cmd);

        commands.push({
          deviceId: pc.id,
          deviceName: pc.name,
          type: 'configurePc',
          command: cmd,
          params: { device: pc.id, ip, mask, gateway }
        });
      }
    }
  }

  lines.push('');
  lines.push('# Script completado');

  return {
    script: lines.join('\n'),
    commands
  };
}

export const ptGenerateScriptTool: Tool = {
  name: 'pt_generate_script',
  description: 'Genera un script de Packet Tracer (JavaScript o Python) a partir de un TopologyPlan',
  longDescription: `Crea un script executable para Packet Tracer Builder (PTBuilder) que incluye:
- Añadir dispositivos (addDevice)
- Crear enlaces entre dispositivos (addLink)
- Configurar routers y switches con comandos IOS (configureIosDevice)
- Configurar IPs de PCs y servidores (configurePcIp)

El script puede generarse en formato JavaScript o Python.`,
  category: 'generation',
  tags: ['packet-tracer', 'script', 'generation', 'topology', 'ptbuilder'],
  inputSchema: {
    type: 'object',
    properties: {
      plan: {
        type: 'object',
        description: 'Plan de topología generado por pt_plan_topology'
      },
      format: {
        type: 'string',
        enum: ['javascript', 'python'],
        default: 'javascript',
        description: 'Lenguaje del script a generar'
      }
    },
    required: ['plan']
  },
  handler: async (input: ToolInput): Promise<ToolResult<GenerateScriptResult>> => {
    const plan = input.plan as TopologyPlan | undefined;
    const format = (input.format as 'javascript' | 'python') || 'javascript';

    // Validación de entrada
    if (!plan || typeof plan !== 'object') {
      return buildScriptError('Se requiere un plan de topología válido', 'INVALID_INPUT');
    }

    if (!plan.devices || !Array.isArray(plan.devices)) {
      return buildScriptError('El plan debe contener un array de devices', 'INVALID_STRUCTURE');
    }

    if (!plan.links || !Array.isArray(plan.links)) {
      return buildScriptError('El plan debe contener un array de links', 'INVALID_STRUCTURE');
    }

    // Generar el script según el formato
    const result = format === 'python'
      ? generatePython(plan)
      : generateJavaScript(plan);

    return {
      ok: true,
      data: {
        script: result.script,
        commands: result.commands,
        format,
        deviceCount: plan.devices.length,
        linkCount: plan.links.length
      }
    };
  }
};
