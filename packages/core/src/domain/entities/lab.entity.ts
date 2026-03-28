/**
 * Aggregate Root: Lab
 * Agregado raíz que representa un laboratorio completo
 */
import { Device, DeviceType } from './device.entity.ts';
import { Connection } from './connection.entity.ts';
import { IpAddress } from '../value-objects/ip-address.vo.ts';
import { CableType } from '../value-objects/cable-type.vo.ts';
import { Port } from '../value-objects/port.vo.ts';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Objective {
  id: string;
  description: string;
  points: number;
  validationType: 'connectivity' | 'configuration' | 'show_command';
}

export interface ValidationRule {
  type: 'connectivity' | 'routing' | 'vlans' | 'acl';
  config: Record<string, unknown>;
}

export interface LabMetadata {
  name: string;
  description?: string;
  version: string;
  author?: string;
  difficulty: DifficultyLevel;
  estimatedTime?: string;
  tags?: string[];
}

export interface LabProps {
  id: string;
  metadata: LabMetadata;
  devices: Map<string, Device>;
  connections: Connection[];
  objectives?: Objective[];
  validationRules?: ValidationRule[];
  instructions?: string;
  resources?: {
    pkaFile?: string;
    pktFile?: string;
    solution?: string;
  };
  modified: boolean;
  originalFile?: string;
}

export class Lab {
  private constructor(private props: LabProps) {}

  static create(metadata: Omit<LabMetadata, 'version'> & { version?: string }): Lab {
    const id = `lab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Lab({
      id,
      metadata: {
        ...metadata,
        version: metadata.version || '1.0'
      },
      devices: new Map(),
      connections: [],
      objectives: [],
      validationRules: [],
      modified: true
    });
  }

  static load(props: Omit<LabProps, 'devices'> & { devices: Device[] }): Lab {
    const deviceMap = new Map<string, Device>();
    for (const device of props.devices) {
      deviceMap.set(device.getId(), device);
    }

    return new Lab({
      ...props,
      devices: deviceMap,
      modified: false
    });
  }

  // Getters
  getId(): string {
    return this.props.id;
  }

  getMetadata(): LabMetadata {
    return { ...this.props.metadata };
  }

  getDevices(): Device[] {
    return Array.from(this.props.devices.values());
  }

  getConnections(): Connection[] {
    return [...this.props.connections];
  }

  getObjectives(): Objective[] {
    return [...(this.props.objectives || [])];
  }

  isModified(): boolean {
    return this.props.modified;
  }

  getOriginalFile(): string | undefined {
    return this.props.originalFile;
  }

  // Gestión de dispositivos
  addDevice(device: Device): void {
    // Validar nombre único
    const existingByName = this.findDeviceByName(device.getName());
    if (existingByName) {
      throw new Error(`Ya existe un dispositivo con el nombre '${device.getName()}'`);
    }

    this.props.devices.set(device.getId(), device);
    this.markAsModified();
  }

  removeDevice(deviceId: string): void {
    const device = this.props.devices.get(deviceId);
    if (!device) {
      throw new Error(`Dispositivo con ID '${deviceId}' no encontrado`);
    }

    // Eliminar conexiones asociadas
    this.props.connections = this.props.connections.filter(
      conn => !conn.involvesDevice(deviceId)
    );

    this.props.devices.delete(deviceId);
    this.markAsModified();
  }

  getDevice(deviceId: string): Device | undefined {
    return this.props.devices.get(deviceId);
  }

  findDeviceByName(name: string): Device | undefined {
    return Array.from(this.props.devices.values()).find(
      d => d.getName().toLowerCase() === name.toLowerCase()
    );
  }

  // Gestión de conexiones
  addConnection(connection: Connection): void {
    // Validar que los dispositivos existan
    const fromDevice = this.props.devices.get(connection.getFromDeviceId());
    const toDevice = this.props.devices.get(connection.getToDeviceId());
    
    if (!fromDevice) {
      throw new Error(`Dispositivo origen '${connection.getFromDeviceName()}' no encontrado`);
    }
    if (!toDevice) {
      throw new Error(`Dispositivo destino '${connection.getToDeviceName()}' no encontrado`);
    }

    // Validar que los puertos no estén ya en uso
    const fromPortInUse = this.isPortInUse(connection.getFromDeviceId(), connection.getFromPort());
    const toPortInUse = this.isPortInUse(connection.getToDeviceId(), connection.getToPort());

    if (fromPortInUse) {
      throw new Error(`El puerto ${connection.getFromPort()} de ${connection.getFromDeviceName()} ya está en uso`);
    }
    if (toPortInUse) {
      throw new Error(`El puerto ${connection.getToPort()} de ${connection.getToDeviceName()} ya está en uso`);
    }

    this.props.connections.push(connection);
    this.markAsModified();
  }

  removeConnection(connectionId: string): void {
    const index = this.props.connections.findIndex(c => c.getId() === connectionId);
    if (index === -1) {
      throw new Error(`Conexión '${connectionId}' no encontrada`);
    }
    this.props.connections.splice(index, 1);
    this.markAsModified();
  }

  findConnection(deviceId: string, portName?: string): Connection | undefined {
    return this.props.connections.find(c => 
      portName 
        ? c.usesPort(deviceId, portName)
        : c.involvesDevice(deviceId)
    );
  }

  /**
   * Verifica si un puerto específico está en uso
   */
  isPortInUse(deviceId: string, portName: string): boolean {
    return this.props.connections.some(c => c.usesPort(deviceId, portName));
  }

  /**
   * Obtiene todos los puertos disponibles de un dispositivo
   */
  getAvailablePorts(deviceId: string): Port[] {
    const device = this.props.devices.get(deviceId);
    if (!device) return [];

    return device.getPorts().filter(port => 
      !this.isPortInUse(deviceId, port.getName())
    );
  }

  // Validaciones
  /**
   * Valida que no haya IPs duplicadas en la red
   */
  validateIpConflicts(): { valid: boolean; conflicts: string[] } {
    const ipMap = new Map<string, string[]>();
    const conflicts: string[] = [];

    for (const device of this.props.devices.values()) {
      // Verificar IPs de interfaces
      for (const iface of device.getInterfaces()) {
        if (iface.ip) {
          const ip = iface.ip.getValue();
          const existing = ipMap.get(ip) || [];
          existing.push(`${device.getName()}.${iface.name}`);
          ipMap.set(ip, existing);
        }
      }

      // Verificar IP de management
      const managementIp = device.toJSON().managementIp;
      if (managementIp) {
        const ip = (managementIp as any).getValue ? (managementIp as any).getValue() : managementIp;
        const existing = ipMap.get(ip) || [];
        existing.push(`${device.getName()}(mgmt)`);
        ipMap.set(ip, existing);
      }
    }

    for (const [ip, devices] of ipMap.entries()) {
      if (devices.length > 1) {
        conflicts.push(`IP ${ip} duplicada en: ${devices.join(', ')}`);
      }
    }

    return { valid: conflicts.length === 0, conflicts };
  }

  /**
   * Valida todas las conexiones físicas
   */
  validateConnections(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const conn of this.props.connections) {
      const fromDevice = this.props.devices.get(conn.getFromDeviceId());
      const toDevice = this.props.devices.get(conn.getToDeviceId());

      if (!fromDevice || !toDevice) continue;

      // Validar compatibilidad de cable con puerto origen
      const fromValidation = conn.getCableType().isCompatibleWithPort(conn.getFromPort());
      if (!fromValidation.compatible) {
        errors.push(`${conn.getFromDeviceName()}(${conn.getFromPort()}): ${fromValidation.reason}`);
      }

      // Validar compatibilidad de cable con puerto destino
      const toValidation = conn.getCableType().isCompatibleWithPort(conn.getToPort());
      if (!toValidation.compatible) {
        errors.push(`${conn.getToDeviceName()}(${conn.getToPort()}): ${toValidation.reason}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Gestión de estado
  markAsModified(): void {
    this.props.modified = true;
  }

  markAsSaved(filePath?: string): void {
    this.props.modified = false;
    if (filePath) {
      this.props.originalFile = filePath;
    }
  }

  updateMetadata(metadata: Partial<LabMetadata>): void {
    this.props.metadata = { ...this.props.metadata, ...metadata };
    this.markAsModified();
  }

  /**
   * Obtiene estadísticas del laboratorio
   */
  getStats(): {
    deviceCount: number;
    connectionCount: number;
    devicesByType: Record<string, number>;
  } {
    const devices = this.getDevices();
    const devicesByType: Record<string, number> = {};

    for (const device of devices) {
      const type = device.getType();
      devicesByType[type] = (devicesByType[type] || 0) + 1;
    }

    return {
      deviceCount: devices.length,
      connectionCount: this.props.connections.length,
      devicesByType
    };
  }

  /**
   * Obtiene sugerencias de cables para una conexión
   */
  getCableSuggestions(fromDeviceId: string, toDeviceId: string): string[] {
    const fromDevice = this.props.devices.get(fromDeviceId);
    const toDevice = this.props.devices.get(toDeviceId);

    if (!fromDevice || !toDevice) return [];

    const suggestions: string[] = [];

    // Router-Switch: Cobre directo
    if ((fromDevice.getType() === 'router' && toDevice.getType() === 'switch') ||
        (fromDevice.getType() === 'switch' && toDevice.getType() === 'router')) {
      suggestions.push('Cobre Directo (recomendado para Router-Switch)');
    }

    // PC-Switch: Cobre directo
    if ((fromDevice.getType() === 'pc' && toDevice.getType() === 'switch') ||
        (fromDevice.getType() === 'switch' && toDevice.getType() === 'pc')) {
      suggestions.push('Cobre Directo (recomendado para PC-Switch)');
    }

    // Switch-Switch: Cobre cruzado
    if (fromDevice.getType() === 'switch' && toDevice.getType() === 'switch') {
      suggestions.push('Cobre Cruzado (recomendado para Switch-Switch)');
    }

    // Router-Router: Serial o Cobre cruzado
    if (fromDevice.getType() === 'router' && toDevice.getType() === 'router') {
      suggestions.push('Serial DCE/DTE (para conexiones WAN)');
      suggestions.push('Cobre Cruzado (para conexiones LAN)');
    }

    return suggestions;
  }

  /**
   * Serializa el agregado completo
   */
  toJSON(): object {
    return {
      id: this.props.id,
      metadata: this.props.metadata,
      devices: this.getDevices().map(d => d.toJSON()),
      connections: this.props.connections.map(c => c.toJSON()),
      objectives: this.props.objectives,
      validationRules: this.props.validationRules,
      instructions: this.props.instructions,
      resources: this.props.resources,
      modified: this.props.modified
    };
  }
}
