/**
 * YAML Lab Repository
 * Adaptador de infraestructura para persistencia en YAML
 */
import { LabRepository } from '../../../ports/input/lab-repository.port.ts';
import { Lab, LabMetadata, DifficultyLevel } from '../../../domain/entities/lab.entity.ts';
import { Device, DeviceType, InterfaceConfig } from '../../../domain/entities/device.entity.ts';
import { Connection } from '../../../domain/entities/connection.entity.ts';
import { IpAddress } from '../../../domain/value-objects/ip-address.vo.ts';
import { CableType } from '../../../domain/value-objects/cable-type.vo.ts';
import { Port } from '../../../domain/value-objects/port.vo.ts';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

interface YamlLabStructure {
  metadata: {
    name: string;
    description?: string;
    version: string;
    author?: string;
    difficulty: string;
    estimatedTime?: string;
    tags?: string[];
  };
  topology: {
    devices: YamlDevice[];
    connections?: YamlConnection[];
  };
  objectives?: unknown[];
  validation?: unknown;
  instructions?: string;
  resources?: {
    pkaFile?: string;
    pktFile?: string;
    solution?: string;
  };
}

interface YamlDevice {
  name: string;
  type: string;
  model?: string;
  hostname?: string;
  iosVersion?: string;
  management?: {
    ip: string;
    subnetMask: string;
    gateway?: string;
    vlan?: number;
  };
  interfaces?: YamlInterface[];
  vlans?: unknown[];
  routing?: unknown;
  services?: unknown[];
  ports?: string[];
}

interface YamlInterface {
  name: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  vlan?: number;
  mode?: string;
  shutdown?: boolean;
  description?: string;
}

interface YamlConnection {
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
  cable: string;
}

export class YamlLabRepository implements LabRepository {
  getSupportedExtension(): string {
    return '.yaml';
  }

  async load(filePath: string): Promise<Lab> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo no encontrado: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const data = yaml.load(content) as YamlLabStructure;

    if (!data.metadata || !data.topology) {
      throw new Error('Estructura YAML inválida: falta metadata o topology');
    }

    // Convertir dispositivos
    const devices: Device[] = [];
    for (const yamlDevice of data.topology.devices || []) {
      const device = this.parseDevice(yamlDevice);
      devices.push(device);
    }

    // Crear el lab
    const lab = Lab.load({
      id: `lab_${Date.now()}`,
      metadata: {
        name: data.metadata.name,
        description: data.metadata.description,
        version: data.metadata.version,
        author: data.metadata.author,
        difficulty: this.parseDifficulty(data.metadata.difficulty),
        estimatedTime: data.metadata.estimatedTime,
        tags: data.metadata.tags
      },
      devices,
      connections: [], // Las conexiones se procesan después
      objectives: [],
      validationRules: [],
      instructions: data.instructions,
      resources: data.resources,
      modified: false,
      originalFile: filePath
    });

    // Procesar conexiones (necesitamos los IDs de los dispositivos ya creados)
    for (const yamlConnection of data.topology.connections || []) {
      const connection = this.parseConnection(yamlConnection, lab);
      if (connection) {
        lab.addConnection(connection);
      }
    }

    return lab;
  }

  async save(lab: Lab, filePath: string): Promise<void> {
    const data = this.serializeLab(lab);
    const yamlContent = yaml.dump(data, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false
    });

    // Asegurar que el directorio existe
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, yamlContent, 'utf-8');
    lab.markAsSaved(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    return fs.existsSync(filePath);
  }

  // ===== Private Helpers =====

  private parseDevice(yamlDevice: YamlDevice): Device {
    const interfaces: InterfaceConfig[] = [];

    for (const yamlIface of yamlDevice.interfaces || []) {
      const iface: InterfaceConfig = {
        name: yamlIface.name,
        vlan: yamlIface.vlan,
        mode: yamlIface.mode as any,
        shutdown: yamlIface.shutdown,
        description: yamlIface.description
      };

      if (yamlIface.ip && yamlIface.mask) {
        try {
          iface.ip = IpAddress.create(yamlIface.ip);
          iface.mask = yamlIface.mask;
          if (yamlIface.gateway) {
            iface.gateway = IpAddress.create(yamlIface.gateway);
          }
        } catch {
          // Ignorar IPs inválidas
        }
      }

      interfaces.push(iface);
    }

    // Crear puertos por defecto según el tipo de dispositivo
    const ports: Port[] = [];
    if (yamlDevice.ports) {
      for (const portName of yamlDevice.ports) {
        ports.push(Port.create(portName));
      }
    } else {
      // Puertos por defecto según tipo
      ports.push(...this.getDefaultPorts(yamlDevice.type as DeviceType));
    }

    return Device.create({
      name: yamlDevice.name,
      type: yamlDevice.type as DeviceType,
      model: yamlDevice.model,
      hostname: yamlDevice.hostname,
      iosVersion: yamlDevice.iosVersion,
      interfaces,
      ports
    });
  }

  private parseConnection(yamlConnection: YamlConnection, lab: Lab): Connection | null {
    const fromDevice = lab.findDeviceByName(yamlConnection.from);
    const toDevice = lab.findDeviceByName(yamlConnection.to);

    if (!fromDevice || !toDevice) {
      return null;
    }

    try {
      const cableType = CableType.create(yamlConnection.cable);

      return Connection.create({
        fromDeviceId: fromDevice.getId(),
        fromDeviceName: fromDevice.getName(),
        fromPort: yamlConnection.fromPort,
        toDeviceId: toDevice.getId(),
        toDeviceName: toDevice.getName(),
        toPort: yamlConnection.toPort,
        cableType
      });
    } catch {
      return null;
    }
  }

  private serializeLab(lab: Lab): YamlLabStructure {
    const metadata = lab.getMetadata();

    return {
      metadata: {
        name: metadata.name,
        description: metadata.description,
        version: metadata.version,
        author: metadata.author,
        difficulty: metadata.difficulty,
        estimatedTime: metadata.estimatedTime,
        tags: metadata.tags
      },
      topology: {
        devices: lab.getDevices().map(d => this.serializeDevice(d)),
        connections: lab.getConnections().map(c => ({
          from: c.getFromDeviceName(),
          fromPort: c.getFromPort(),
          to: c.getToDeviceName(),
          toPort: c.getToPort(),
          cable: c.getCableType().getValue()
        }))
      },
      instructions: lab.toJSON().instructions as string,
      resources: lab.toJSON().resources as any
    };
  }

  private serializeDevice(device: Device): YamlDevice {
    const json = device.toJSON();

    return {
      name: json.name,
      type: json.type,
      model: json.model,
      hostname: json.hostname,
      iosVersion: json.iosVersion,
      management: json.managementIp ? {
        ip: (json.managementIp as any).getValue?.() || json.managementIp,
        subnetMask: json.managementMask || '255.255.255.0',
        gateway: json.managementGateway ? 
          ((json.managementGateway as any).getValue?.() || json.managementGateway) : 
          undefined,
        vlan: json.managementVlan
      } : undefined,
      interfaces: json.interfaces.map((i: any) => ({
        name: i.name,
        ip: i.ip?.getValue?.() || i.ip,
        mask: i.mask,
        gateway: i.gateway?.getValue?.() || i.gateway,
        vlan: i.vlan,
        mode: i.mode,
        shutdown: i.shutdown,
        description: i.description
      })),
      ports: device.getPorts().map(p => p.getName())
    };
  }

  private parseDifficulty(difficulty: string): DifficultyLevel {
    const valid: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
    return valid.includes(difficulty as DifficultyLevel) ? 
      (difficulty as DifficultyLevel) : 
      'beginner';
  }

  private getDefaultPorts(deviceType: DeviceType): Port[] {
    const ports: Port[] = [];

    switch (deviceType) {
      case 'router':
        ports.push(
          Port.create('GigabitEthernet0/0'),
          Port.create('GigabitEthernet0/1'),
          Port.create('GigabitEthernet0/2')
        );
        break;
      case 'switch':
      case 'multilayer-switch':
        // Cisco switch ports start at Fa0/1, not Fa0/0
        for (let i = 1; i <= 24; i++) {
          ports.push(Port.create(`FastEthernet0/${i}`));
        }
        ports.push(Port.create('GigabitEthernet0/1'));
        ports.push(Port.create('GigabitEthernet0/2'));
        break;
      case 'pc':
      case 'server':
        ports.push(Port.create('FastEthernet0'));
        break;
      case 'wireless-router':
        ports.push(
          Port.create('Internet'),
          Port.create('Ethernet1'),
          Port.create('Ethernet2'),
          Port.create('Ethernet3'),
          Port.create('Ethernet4')
        );
        break;
      default:
        ports.push(Port.create('FastEthernet0'));
    }

    return ports;
  }
}
