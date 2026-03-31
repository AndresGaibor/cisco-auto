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
import type { Device, ACL, NAT } from '../..';
import type {
  BGPSpec,
  DHCPServerSpec,
  EtherChannelSpec,
  FTPSpec,
  HTTPSpec,
  IPv6Spec,
  NTPSpec,
  RIPSpec,
  SNMPSpec,
  STPSpec,
  SyslogSpec,
} from '../..';
import { BaseGenerator } from '../..';
import { VlanGenerator } from '../..';
import { STPGenerator } from '../..';
import { EtherChannelGenerator } from '../..';
import { RoutingGenerator } from '../..';
import { AdvancedRoutingGenerator } from '../..';
import { SecurityGenerator } from '../..';
import { ServicesGenerator } from '../..';
import { IPv6Generator } from '../..';

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

type ExtendedRoutingPlan = RoutingPlan & {
  rip?: RIPSpec;
  bgp?: BGPSpec;
  noAutoSummary?: boolean;
};

type ExtendedServicesPlan = {
  ntp?: NTPSpec;
  snmp?: SNMPSpec;
  http?: HTTPSpec;
  ftp?: FTPSpec;
  syslog?: SyslogSpec;
  dhcp?: DHCPServerSpec[];
};

type ExtendedDevicePlan = DevicePlan & {
  vtp?: Device['vtp'];
  lines?: Device['lines'];
  acls?: ACL[];
  nat?: NAT;
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

function maskToCidr(mask: string): number {
  if (!mask) {
    return 24;
  }

  if (mask.includes('/')) {
    const parts = mask.split('/');
    const parsed = Number.parseInt(parts[1] || '24', 10);
    return Number.isFinite(parsed) ? parsed : 24;
  }

  const octets = mask.split('.').map(part => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some(octet => Number.isNaN(octet))) {
    return 24;
  }

  return octets
    .map(octet => octet.toString(2).padStart(8, '0'))
    .join('')
    .split('1').length - 1;
}

function mapDhcpPlanToSpec(pool: DHCPPlan): DHCPServerSpec {
  return {
    poolName: pool.poolName,
    network: pool.network,
    subnetMask: pool.subnetMask,
    defaultRouter: pool.defaultRouter,
    dnsServers: pool.dnsServer ? [pool.dnsServer] : undefined,
    excludedAddresses: pool.exclude,
  };
}

function mapVlanPlanToSpec(vlan: VLANPlan) {
  return {
    id: vlan.id,
    name: vlan.name,
    active: true,
    description: vlan.dhcpPool ? `Pool DHCP ${vlan.dhcpPool}` : undefined,
    ip: vlan.ipRange && vlan.ipRange.includes('/') ? vlan.ipRange : undefined,
  };
}

function mapRoutingPlanToSpec(routing: RoutingPlan): Parameters<typeof RoutingGenerator.generateRouting>[0] {
  const routingSpec: any = {};

  if (routing.static && routing.static.length > 0) {
    routingSpec.static = routing.static.map(route => ({
      network: `${route.network}/${maskToCidr(route.mask)}`,
      nextHop: route.nextHop,
      administrativeDistance: 1,
      description: undefined,
    }));
  }

  if (routing.ospf) {
    routingSpec.ospf = {
      processId: routing.ospf.processId,
      routerId: routing.ospf.routerId,
      networks: routing.ospf.areas.flatMap(area => area.networks.map(network => ({
        network,
        area: area.area,
      }))),
      defaultRoute: Boolean(routing.ospf.defaultRoute),
      passiveInterfaces: undefined,
    };
  }

  if (routing.eigrp) {
    routingSpec.eigrp = {
      autonomousSystem: routing.eigrp.asNumber,
      networks: routing.eigrp.networks,
      noAutoSummary: (routing.eigrp as RoutingPlan['eigrp'] & { noAutoSummary?: boolean }).noAutoSummary ?? true,
    };
  }

  return routingSpec;
}

function mapAdvancedRoutingPlanToSpec(routing: ExtendedRoutingPlan): string[] {
  const commands: string[] = [];

  if (routing.rip) {
    commands.push(...AdvancedRoutingGenerator.generateRIP(routing.rip));
  }

  if (routing.bgp) {
    commands.push(...AdvancedRoutingGenerator.generateBGP(routing.bgp));
  }

  return commands;
}

function buildStpSpec(device: ExtendedDevicePlan): STPSpec | undefined {
  if (device.stp) {
    return device.stp;
  }

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
    vlanConfig: device.vlans?.map(vlan => ({ vlanId: vlan.id })),
    interfaceConfig,
  };
}

function buildEtherChannels(device: ExtendedDevicePlan): EtherChannelSpec[] {
  return device.etherchannel && device.etherchannel.length > 0 ? device.etherchannel : [];
}

function buildIpv6Spec(device: ExtendedDevicePlan): IPv6Spec | undefined {
  return device.ipv6;
}

function buildSecurityCommands(device: ExtendedDevicePlan): string[] {
  const commands: string[] = [];

  if (device.acls && device.acls.length > 0) {
    commands.push(...SecurityGenerator.generateACLs(device.acls as any));
  }

  if (device.nat) {
    commands.push(...SecurityGenerator.generateNAT(device.nat as any));
  }

  return commands;
}

function buildServiceCommands(device: ExtendedDevicePlan): string[] {
  const commands: string[] = [];

  if (device.dhcp && device.dhcp.length > 0) {
    commands.push(...ServicesGenerator.generateDHCP(device.dhcp.map(mapDhcpPlanToSpec)));
  }

  if (device.services?.dhcp && device.services.dhcp.length > 0) {
    commands.push(...ServicesGenerator.generateDHCP(device.services.dhcp));
  }

  if (device.services?.ntp) {
    commands.push(...ServicesGenerator.generateNTP(device.services.ntp));
  }

  if (device.services?.snmp) {
    commands.push(...ServicesGenerator.generateSNMP(device.services.snmp));
  }

  if (device.services?.http) {
    commands.push(...ServicesGenerator.generateHTTP(device.services.http));
  }

  if (device.services?.ftp) {
    commands.push(...ServicesGenerator.generateFTP(device.services.ftp));
  }

  if (device.services?.syslog) {
    commands.push(...ServicesGenerator.generateSyslog(device.services.syslog));
  }

  return commands;
}

function buildBaseDevice(device: ExtendedDevicePlan): Device {
  return {
    name: device.name,
    type: device.model.type,
    model: device.model.name,
    hostname: device.name,
    ssh: device.ssh,
    telnet: device.telnet,
    credentials: device.credentials,
    interfaces: device.interfaces as unknown as Device['interfaces'],
    vlans: device.vlans?.map(mapVlanPlanToSpec) as Device['vlans'],
    vtp: device.vtp,
    routing: mapRoutingPlanToSpec(device.routing || ({} as RoutingPlan)) as unknown as Device['routing'],
    acls: device.acls,
    nat: device.nat,
    lines: device.lines,
  };
}

/**
 * Genera los comandos IOS completos para un dispositivo
 */
export function generateIosCommands(device: DevicePlan): string[] {
  const dispositivo = device as ExtendedDevicePlan;
  const baseDevice = buildBaseDevice(dispositivo);
  const commands: string[] = [];

  appendSection(commands, BaseGenerator.generateBasic(baseDevice as any));
  appendSection(commands, VlanGenerator.generateInterfaces(baseDevice as any));

  if (dispositivo.vlans && dispositivo.vlans.length > 0) {
    appendSection(commands, VlanGenerator.generateVLANs(baseDevice.vlans || [], dispositivo.vtp as any));
  }

  if (dispositivo.vtp) {
    appendSection(commands, VlanGenerator.generateVTP(dispositivo.vtp as any));
  }

  if (dispositivo.routing) {
    appendSection(commands, RoutingGenerator.generateRouting(mapRoutingPlanToSpec(dispositivo.routing)));
    appendSection(commands, mapAdvancedRoutingPlanToSpec(dispositivo.routing));
  }

  appendSection(commands, buildSecurityCommands(dispositivo));
  appendSection(commands, buildServiceCommands(dispositivo));

  const stpSpec = buildStpSpec(dispositivo);
  if (stpSpec) {
    appendSection(commands, STPGenerator.generate(stpSpec));
  }

  const etherChannels = buildEtherChannels(dispositivo);
  if (etherChannels.length > 0) {
    appendSection(commands, EtherChannelGenerator.generate(etherChannels));
  }

  const ipv6Spec = buildIpv6Spec(dispositivo);
  if (ipv6Spec) {
    appendSection(commands, IPv6Generator.generate(ipv6Spec));
  }

  if (dispositivo.lines) {
    appendSection(commands, BaseGenerator.generateLines(dispositivo.lines as any));
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
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Se requiere un plan de topología válido'
        }
      };
    }

    if (!plan.devices || !Array.isArray(plan.devices)) {
      return {
        success: false,
        error: {
          code: 'INVALID_STRUCTURE',
          message: 'El plan debe contener un array de devices'
        }
      };
    }

    if (!plan.links || !Array.isArray(plan.links)) {
      return {
        success: false,
        error: {
          code: 'INVALID_STRUCTURE',
          message: 'El plan debe contener un array de links'
        }
      };
    }

    // Generar el script según el formato
    const result = format === 'python'
      ? generatePython(plan)
      : generateJavaScript(plan);

    return {
      success: true,
      data: {
        script: result.script,
        commands: result.commands,
        format,
        deviceCount: plan.devices.length,
        linkCount: plan.links.length
      },
      metadata: {
        itemCount: result.commands.length,
        extras: {
          deviceCount: plan.devices.length,
          linkCount: plan.links.length
        }
      }
    };
  }
};
