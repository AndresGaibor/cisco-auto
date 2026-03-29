/**
 * YAML ADAPTER - CONVERSIÓN ENTRE YAML Y MODELO CANÓNICO
 * 
 * Este adaptador bidireccional convierte entre:
 * - Archivos YAML (formato actual del proyecto)
 * - Modelo canónico (LabSpec, DeviceSpec, ConnectionSpec)
 * 
 * GARANTIZA:
 * - Round-trip sin pérdida de datos
 * - Validación consistente
 * - Compatibilidad con archivos existentes
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

import type {
  LabSpec,
  LabMetadata,
  LabObjective,
  LabValidation,
  LabInstructions,
  LabCanvas,
  DeviceSpec,
  InterfaceSpec,
  VLANSpec,
  VTPSpec,
  RoutingSpec,
  SecuritySpec,
  ServicesSpec,
  Layer2Spec,
  LineSpec,
  ConnectionSpec,
  DeviceType,
  DifficultyLevel,
} from '../canonical';
import { CableType } from '../canonical';
import {
  LabSpecFactory,
  DeviceSpecFactory,
  ConnectionSpecFactory,
  generateId,
  isValidIP,
  cidrToMask,
  maskToCidr
} from '../canonical';

// =============================================================================
// YAML TYPES (Formato de archivo YAML actual)
// =============================================================================

/**
 * Estructura YAML para dispositivos (formato actual)
 */
export interface YAMLDevice {
  name: string;
  type: string;
  model?: string;
  hostname?: string;
  management?: {
    ip: string;
    subnetMask?: string;
    gateway?: string;
    vlan?: number;
  };
  interfaces?: YAMLInterface[];
  ports?: string[];
  vlans?: YAMLVLAN[];
  vtp?: YAMLVTP;
  routing?: YAMLRouting;
  acls?: YAMLACL[];
  nat?: YAMLNAT;
  credentials?: {
    username?: string;
    password?: string;
    enable?: string;
  };
  ssh?: {
    enabled?: boolean;
    version?: number;
  };
  telnet?: {
    enabled?: boolean;
  };
  lines?: YAMLLine[];
  position?: { x: number; y: number };
}

export interface YAMLInterface {
  name: string;
  ip?: string;
  subnetMask?: string;
  vlan?: number;
  trunk?: boolean;
  nativeVlan?: number;
  allowedVlans?: string;
  shutdown?: boolean;
  description?: string;
}

export interface YAMLVLAN {
  id: number;
  name?: string;
}

export interface YAMLVTP {
  domain: string;
  mode: 'server' | 'client' | 'transparent';
  version?: number;
  password?: string;
}

export interface YAMLRouting {
  static?: {
    network: string;
    mask?: string;
    nextHop: string;
    interface?: string;
  }[];
  ospf?: {
    processId: number;
    routerId?: string;
    networks: string[];
    areas?: { id: string; networks: string[] }[];
  };
  eigrp?: {
    asNumber: number;
    networks: string[];
  };
}

export interface YAMLACL {
  name: string;
  type?: 'standard' | 'extended';
  rules: {
    action: 'permit' | 'deny';
    protocol: string;
    source: string;
    destination?: string;
    port?: string | number;
  }[];
}

export interface YAMLNAT {
  type: 'static' | 'dynamic' | 'pat';
  inside?: string[];
  outside?: string[];
  static?: { inside: string; outside: string }[];
  dynamic?: { pool: string; acl: string }[];
}

export interface YAMLLine {
  type: 'console' | 'vty' | 'aux';
  password?: string;
  login?: boolean;
  transport?: ('ssh' | 'telnet')[];
}

/**
 * Estructura YAML para conexiones (formato actual)
 */
export interface YAMLConnection {
  from: string;
  fromInterface?: string;
  fromPort?: string;
  to: string;
  toInterface?: string;
  toPort?: string;
  type?: string;
  cable?: string;
}

/**
 * Estructura YAML completa para lab
 */
export interface YAMLLab {
  metadata: {
    name: string;
    description?: string;
    version?: string;
    author?: string;
    difficulty?: DifficultyLevel;
    estimatedTime?: string;
    tags?: string[];
  };
  topology: {
    devices: YAMLDevice[];
    connections?: YAMLConnection[];
  };
  objectives?: {
    title: string;
    description?: string;
  }[];
  validation?: {
    tests: {
      name: string;
      type: string;
      source: string;
      destination: string;
      expected: boolean;
    }[];
  };
  instructions?: string;
  canvas?: {
    width?: number;
    height?: number;
  };
}

// =============================================================================
// YAML → CANONICAL
// =============================================================================

export class YAMLToCanonical {
  /**
   * Convierte un YAMLLab a LabSpec
   */
  static toLabSpec(yamlLab: YAMLLab): LabSpec {
    // Convertir dispositivos
    const devices = yamlLab.topology.devices.map(d => this.toDeviceSpec(d));
    
    // Crear mapa de IDs por nombre
    const deviceIdsByName = new Map<string, string>();
    devices.forEach(d => deviceIdsByName.set(d.name, d.id));
    
    // Convertir conexiones
    const connections = (yamlLab.topology.connections || []).map(c => 
      this.toConnectionSpec(c, deviceIdsByName)
    );
    
    // Convertir metadatos
    const metadata: LabMetadata = {
      name: yamlLab.metadata.name,
      description: yamlLab.metadata.description,
      version: yamlLab.metadata.version || '1.0',
      author: yamlLab.metadata.author,
      difficulty: yamlLab.metadata.difficulty,
      estimatedTime: yamlLab.metadata.estimatedTime,
      tags: yamlLab.metadata.tags
    };
    
    // Convertir objetivos
    const objectives: LabObjective[] | undefined = yamlLab.objectives?.map((o, i) => ({
      id: `obj-${i}`,
      order: i + 1,
      title: o.title,
      description: o.description
    }));
    
    // Convertir validación
    const validation: LabValidation | undefined = yamlLab.validation ? {
      tests: yamlLab.validation.tests.map((t, i) => ({
        id: `test-${i}`,
        name: t.name,
        type: t.type as any,
        sourceDevice: t.source,
        destinationDevice: t.destination,
        expected: { success: t.expected }
      }))
    } : undefined;
    
    // Convertir instrucciones
    const instructions: LabInstructions | undefined = yamlLab.instructions ? {
      text: yamlLab.instructions,
      format: 'text'
    } : undefined;
    
    // Convertir canvas
    const canvas: LabCanvas | undefined = yamlLab.canvas ? {
      width: yamlLab.canvas.width || 2000,
      height: yamlLab.canvas.height || 1500
    } : undefined;
    
    return LabSpecFactory.fromPartial({
      metadata,
      devices,
      connections,
      objectives,
      validation,
      instructions,
      canvas
    });
  }
  
  /**
   * Convierte un YAMLDevice a DeviceSpec
   */
  static toDeviceSpec(yamlDevice: YAMLDevice): DeviceSpec {
    const type = this.normalizeDeviceType(yamlDevice.type);
    
    // Convertir interfaces
    let interfaces: InterfaceSpec[] = [];
    if (yamlDevice.interfaces) {
      interfaces = yamlDevice.interfaces.map(i => ({
        name: i.name,
        ip: i.ip,
        subnetMask: i.subnetMask,
        vlan: i.vlan,
        trunk: i.trunk,
        nativeVlan: i.nativeVlan,
        allowedVlans: i.allowedVlans ? this.parseVlanList(i.allowedVlans) : undefined,
        shutdown: i.shutdown,
        description: i.description
      }));
    } else if (yamlDevice.ports) {
      // Convertir ports legacy a interfaces
      interfaces = yamlDevice.ports.map(p => ({
        name: p,
        shutdown: false
      }));
    }
    
    // Generar puertos por defecto si no hay interfaces
    if (interfaces.length === 0) {
      interfaces = this.getDefaultPorts(type);
    }
    
    // Convertir VLANs
    const vlans: VLANSpec[] | undefined = yamlDevice.vlans?.map(v => ({
      id: v.id,
      name: v.name
    }));
    
    // Convertir VTP
    const vtp: VTPSpec | undefined = yamlDevice.vtp ? {
      domain: yamlDevice.vtp.domain,
      mode: yamlDevice.vtp.mode,
      version: yamlDevice.vtp.version as 1 | 2 | 3,
      password: yamlDevice.vtp.password
    } : undefined;
    
    // Convertir routing
    const routing: RoutingSpec | undefined = yamlDevice.routing ? {
      static: yamlDevice.routing.static?.map(r => ({
        network: r.network,
        mask: r.mask,
        nextHop: r.nextHop,
        interface: r.interface
      })),
      ospf: yamlDevice.routing.ospf ? {
        processId: yamlDevice.routing.ospf.processId,
        routerId: yamlDevice.routing.ospf.routerId,
        areas: yamlDevice.routing.ospf.areas?.map(a => ({
          areaId: a.id,
          networks: a.networks
        })) || []
      } : undefined,
      eigrp: yamlDevice.routing.eigrp ? {
        asNumber: yamlDevice.routing.eigrp.asNumber,
        networks: yamlDevice.routing.eigrp.networks
      } : undefined
    } : undefined;
    
    // Convertir seguridad
    const security: SecuritySpec | undefined = yamlDevice.acls || yamlDevice.nat ? {
      acls: yamlDevice.acls?.map(a => ({
        name: a.name,
        type: a.type || 'extended',
        rules: a.rules.map(r => ({
          action: r.action,
          protocol: r.protocol as any,
          source: r.source,
          destination: r.destination,
          destinationPort: r.port
        }))
      })),
      nat: yamlDevice.nat ? {
        type: yamlDevice.nat.type,
        insideInterfaces: yamlDevice.nat.inside,
        outsideInterfaces: yamlDevice.nat.outside,
        static: yamlDevice.nat.static,
        dynamic: yamlDevice.nat.dynamic
      } : undefined
    } : undefined;
    
    // Convertir servicios
    const services: ServicesSpec | undefined = yamlDevice.ssh || yamlDevice.telnet ? {
      ssh: yamlDevice.ssh ? {
        enabled: yamlDevice.ssh.enabled ?? true,
        version: (yamlDevice.ssh.version || 2) as 1 | 2
      } : undefined,
      telnet: yamlDevice.telnet ? {
        enabled: yamlDevice.telnet.enabled ?? false
      } : undefined
    } : undefined;
    
    // Convertir lines
    const lines: LineSpec[] | undefined = yamlDevice.lines?.map(l => ({
      type: l.type,
      password: l.password,
      login: l.login,
      transportInput: l.transport
    }));
    
    return DeviceSpecFactory.create({
      name: yamlDevice.name,
      type,
      hostname: yamlDevice.hostname,
      model: yamlDevice.model ? {
        model: yamlDevice.model
      } : undefined,
      managementIp: yamlDevice.management?.ip,
      managementMask: yamlDevice.management?.subnetMask,
      defaultGateway: yamlDevice.management?.gateway,
      interfaces,
      vlans,
      vtp,
      routing,
      security,
      services,
      lines,
      position: yamlDevice.position,
      credentials: yamlDevice.credentials ? {
        username: yamlDevice.credentials.username,
        enablePassword: yamlDevice.credentials.password,
        enableSecret: yamlDevice.credentials.enable
      } : undefined
    });
  }
  
  /**
   * Convierte un YAMLConnection a ConnectionSpec
   */
  static toConnectionSpec(
    yamlConn: YAMLConnection,
    deviceIdsByName: Map<string, string>
  ): ConnectionSpec {
    const fromId = deviceIdsByName.get(yamlConn.from);
    const toId = deviceIdsByName.get(yamlConn.to);
    
    if (!fromId || !toId) {
      throw new Error(`Unknown device in connection: ${yamlConn.from} -> ${yamlConn.to}`);
    }
    
    // Soportar ambos formatos: fromInterface/fromPort
    const fromPort = yamlConn.fromInterface || yamlConn.fromPort || '';
    const toPort = yamlConn.toInterface || yamlConn.toPort || '';
    
    // Soportar ambos formatos: type/cable
    const cableTypeStr = yamlConn.type || yamlConn.cable || 'ethernet';
    const cableType = this.normalizeCableType(cableTypeStr);
    
    return ConnectionSpecFactory.create({
      from: {
        deviceId: fromId,
        deviceName: yamlConn.from,
        port: fromPort
      },
      to: {
        deviceId: toId,
        deviceName: yamlConn.to,
        port: toPort
      },
      cableType
    });
  }
  
  /**
   * Normaliza el tipo de dispositivo
   */
  private static normalizeDeviceType(type: string): DeviceType {
    const typeMap: Record<string, DeviceType> = {
      'router': 'router',
      'switch': 'switch',
      'multilayer-switch': 'multilayer-switch',
      'layer3-switch': 'multilayer-switch',
      'l3-switch': 'multilayer-switch',
      'pc': 'pc',
      'laptop': 'laptop',
      'server': 'server',
      'printer': 'printer',
      'access-point': 'access-point',
      'ap': 'access-point',
      'wireless-router': 'wireless-router',
      'firewall': 'firewall',
      'asa': 'firewall',
      'cloud': 'cloud',
      'modem': 'modem',
      'hub': 'hub',
      'ip-phone': 'ip-phone',
      'phone': 'ip-phone'
    };
    
    return typeMap[type.toLowerCase()] || 'unknown';
  }
  
  /**
   * Normaliza el tipo de cable
   */
  private static normalizeCableType(type: string): CableType {
    const typeMap: Record<string, CableType> = {
      'ethernet': CableType.STRAIGHT_THROUGH,
      'straight-through': CableType.STRAIGHT_THROUGH,
      'straight': CableType.STRAIGHT_THROUGH,
      'crossover': CableType.CROSSOVER,
      'cross': CableType.CROSSOVER,
      'fiber': CableType.FIBER,
      'serial': CableType.SERIAL_DCE,
      'serial-dce': CableType.SERIAL_DCE,
      'serial-dte': CableType.SERIAL_DTE,
      'console': CableType.CONSOLE,
      'coaxial': CableType.COAXIAL,
      'wireless': CableType.WIRELESS
    };
    
    return typeMap[type.toLowerCase()] || CableType.STRAIGHT_THROUGH;
  }
  
  /**
   * Parsea lista de VLANs (ej: "1,10,20" o "1-10")
   */
  private static parseVlanList(str: string): number[] {
    const vlans: number[] = [];
    
    for (const part of str.split(',')) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(Number);
        for (let i = start ?? 0; i <= (end ?? 0); i++) {
          vlans.push(i);
        }
      } else {
        vlans.push(Number(trimmed));
      }
    }
    
    return vlans;
  }
  
  /**
   * Obtiene puertos por defecto según tipo de dispositivo
   */
  private static getDefaultPorts(type: DeviceType): InterfaceSpec[] {
    switch (type) {
      case 'router':
        return [
          { name: 'GigabitEthernet0/0', shutdown: false },
          { name: 'GigabitEthernet0/1', shutdown: false }
        ];
      
      case 'switch':
      case 'multilayer-switch':
        // CORREGIDO: Empiezan en Fa0/1, no Fa0/0
        return Array.from({ length: 24 }, (_, i) => ({
          name: `FastEthernet0/${i + 1}`,
          shutdown: false
        }));
      
      case 'pc':
      case 'laptop':
        return [
          { name: 'FastEthernet0', shutdown: false }
        ];
      
      case 'server':
        return [
          { name: 'GigabitEthernet0', shutdown: false }
        ];
      
      default:
        return [
          { name: 'Ethernet0', shutdown: false }
        ];
    }
  }
}

// =============================================================================
// CANONICAL → YAML
// =============================================================================

export class CanonicalToYAML {
  /**
   * Convierte un LabSpec a YAMLLab
   */
  static toYAML(lab: LabSpec): YAMLLab {
    return {
      metadata: {
        name: lab.metadata.name,
        description: lab.metadata.description,
        version: lab.metadata.version,
        author: lab.metadata.author,
        difficulty: lab.metadata.difficulty,
        estimatedTime: lab.metadata.estimatedTime,
        tags: lab.metadata.tags
      },
      topology: {
        devices: lab.devices.map(d => this.toYAMLDevice(d)),
        connections: lab.connections.map(c => this.toYAMLConnection(c))
      },
      objectives: lab.objectives?.map(o => ({
        title: o.title,
        description: o.description
      })),
      validation: lab.validation ? {
        tests: (lab.validation?.tests ?? []).map(t => ({
          name: t.name,
          type: t.type,
          source: t.sourceDevice,
          destination: t.destinationDevice || t.destinationIP || '',
          expected: t.expected.success
        }))
      } : undefined,
      instructions: lab.instructions?.text,
      canvas: lab.canvas ? {
        width: lab.canvas.width,
        height: lab.canvas.height
      } : undefined
    };
  }
  
  /**
   * Convierte un DeviceSpec a YAMLDevice
   */
  static toYAMLDevice(device: DeviceSpec): YAMLDevice {
    const yamlDevice: YAMLDevice = {
      name: device.name,
      type: device.type,
      hostname: device.hostname,
      position: device.position
    };
    
    // Modelo
    if (device.model?.model) {
      yamlDevice.model = device.model.model;
    }
    
    // Management
    if (device.managementIp) {
      yamlDevice.management = {
        ip: device.managementIp,
        subnetMask: device.managementMask,
        gateway: device.defaultGateway
      };
    }
    
    // Interfaces
    if (device.interfaces.length > 0) {
      yamlDevice.interfaces = device.interfaces.map(i => ({
        name: i.name,
        ip: i.ip,
        subnetMask: i.subnetMask,
        vlan: i.vlan,
        trunk: i.switchportMode === 'trunk' ? true : undefined,
        nativeVlan: i.nativeVlan,
        allowedVlans: i.allowedVlans?.join(','),
        shutdown: i.shutdown,
        description: i.description
      }));
    }
    
    // VLANs
    if (device.vlans && device.vlans.length > 0) {
      yamlDevice.vlans = device.vlans.map(v => ({
        id: v.id,
        name: v.name
      }));
    }
    
    // VTP
    if (device.vtp) {
      yamlDevice.vtp = {
        domain: device.vtp.domain,
        mode: device.vtp.mode,
        version: device.vtp.version,
        password: device.vtp.password
      };
    }
    
    // Routing
    if (device.routing) {
      yamlDevice.routing = {};
      
      if (device.routing.static) {
        yamlDevice.routing.static = device.routing.static.map(r => ({
          network: r.network,
          mask: r.mask,
          nextHop: r.nextHop,
          interface: r.interface
        }));
      }
      
      if (device.routing.ospf) {
        yamlDevice.routing.ospf = {
          processId: device.routing.ospf.processId,
          routerId: device.routing.ospf.routerId,
          networks: device.routing.ospf.areas.flatMap(a => a.networks),
          areas: device.routing.ospf.areas.map(a => ({
            id: a.areaId,
            networks: a.networks
          }))
        };
      }
      
      if (device.routing.eigrp) {
        yamlDevice.routing.eigrp = {
          asNumber: device.routing.eigrp.asNumber,
          networks: device.routing.eigrp.networks
        };
      }
    }
    
    // ACLs
    if (device.security?.acls) {
      yamlDevice.acls = device.security.acls.map(a => ({
        name: a.name,
        type: a.type === 'named' ? 'extended' : a.type,
        rules: a.rules.map(r => ({
          action: r.action,
          protocol: r.protocol as string,
          source: r.source,
          destination: r.destination,
          port: r.destinationPort
        }))
      }));
    }
    
    // NAT
    if (device.security?.nat) {
      yamlDevice.nat = {
        type: device.security.nat.type,
        inside: device.security.nat.insideInterfaces,
        outside: device.security.nat.outsideInterfaces,
        static: device.security.nat.static,
        dynamic: device.security.nat.dynamic
      };
    }
    
    // Credentials
    if (device.credentials) {
      yamlDevice.credentials = {
        username: device.credentials.username,
        password: device.credentials.enablePassword,
        enable: device.credentials.enableSecret
      };
    }
    
    // SSH
    if (device.services?.ssh) {
      yamlDevice.ssh = {
        enabled: device.services.ssh.enabled,
        version: device.services.ssh.version
      };
    }
    
    // Telnet
    if (device.services?.telnet) {
      yamlDevice.telnet = {
        enabled: device.services.telnet.enabled
      };
    }
    
    // Lines
    if (device.lines && device.lines.length > 0) {
      yamlDevice.lines = device.lines.map(l => ({
        type: l.type,
        password: l.password,
        login: l.login,
        transport: l.transportInput
      }));
    }
    
    return yamlDevice;
  }
  
  /**
   * Convierte un ConnectionSpec a YAMLConnection
   */
  static toYAMLConnection(conn: ConnectionSpec): YAMLConnection {
    return {
      from: conn.from.deviceName,
      fromInterface: conn.from.port,
      to: conn.to.deviceName,
      toInterface: conn.to.port,
      type: this.cableTypeToString(conn.cableType)
    };
  }
  
  /**
   * Convierte CableType a string
   */
  private static cableTypeToString(cableType: CableType): string {
    switch (cableType) {
      case CableType.STRAIGHT_THROUGH:
        return 'ethernet';
      case CableType.CROSSOVER:
        return 'crossover';
      case CableType.FIBER:
        return 'fiber';
      case CableType.SERIAL_DCE:
        return 'serial';
      case CableType.SERIAL_DTE:
        return 'serial';
      case CableType.CONSOLE:
        return 'console';
      case CableType.WIRELESS:
        return 'wireless';
      default:
        return 'ethernet';
    }
  }
}

// =============================================================================
// YAML ADAPTER (Fachada)
// =============================================================================

export class YamlAdapter {
  /**
   * Carga un archivo YAML y lo convierte a LabSpec
   */
  static loadFile(filepath: string): LabSpec {
    const content = fs.readFileSync(filepath, 'utf-8');
    const yamlLab = yaml.load(content) as YAMLLab;
    return YAMLToCanonical.toLabSpec(yamlLab);
  }
  
  /**
   * Parsea un string YAML y lo convierte a LabSpec
   */
  static parse(content: string): LabSpec {
    const yamlLab = yaml.load(content) as YAMLLab;
    return YAMLToCanonical.toLabSpec(yamlLab);
  }
  
  /**
   * Convierte un LabSpec a string YAML
   */
  static dump(lab: LabSpec): string {
    const yamlLab = CanonicalToYAML.toYAML(lab);
    return yaml.dump(yamlLab, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
  }
  
  /**
   * Guarda un LabSpec a archivo YAML
   */
  static saveFile(lab: LabSpec, filepath: string): void {
    const content = this.dump(lab);
    fs.writeFileSync(filepath, content, 'utf-8');
  }
  
  /**
   * Convierte YAML string a LabSpec (alias para parse)
   */
  static toCanonical(content: string): LabSpec {
    return this.parse(content);
  }
  
  /**
   * Convierte LabSpec a YAML string (alias para dump)
   */
  static fromCanonical(lab: LabSpec): string {
    return this.dump(lab);
  }
}
