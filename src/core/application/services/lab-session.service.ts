/**
 * Lab Session Service
 * Servicio de aplicación para gestionar la sesión de trabajo con un laboratorio
 */
import { Lab } from '../../domain/entities/lab.entity.ts';
import { Device, DeviceType, InterfaceConfig } from '../../domain/entities/device.entity.ts';
import { Connection } from '../../domain/entities/connection.entity.ts';
import { IpAddress } from '../../domain/value-objects/ip-address.vo.ts';
import { CableType } from '../../domain/value-objects/cable-type.vo.ts';
import { DomainValidationService, ValidationResult } from '../../domain/services/domain-validation.service.ts';
import { 
  CreateLabDto, 
  LabResponseDto, 
  LabStatsDto, 
  SaveLabDto 
} from '../dto/lab.dto.ts';
import {
  CreateDeviceDto,
  UpdateDeviceDto,
  InterfaceConfigDto,
  DeviceResponseDto,
  DeviceListResponseDto
} from '../dto/device.dto.ts';
import {
  CreateConnectionDto,
  ConnectionResponseDto,
  ConnectionListResponseDto,
  PortAvailabilityDto
} from '../dto/connection.dto.ts';

export interface SessionState {
  lab: Lab | null;
  currentFile: string | null;
  history: string[];
}

export class LabSessionService {
  private state: SessionState = {
    lab: null,
    currentFile: null,
    history: []
  };

  // ===== Gestión de Sesión =====

  /**
   * Obtiene el estado actual de la sesión
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Verifica si hay un laboratorio cargado
   */
  hasLab(): boolean {
    return this.state.lab !== null;
  }

  /**
   * Obtiene el laboratorio actual
   */
  getLab(): Lab | null {
    return this.state.lab;
  }

  /**
   * Crea un nuevo laboratorio
   */
  createLab(dto: CreateLabDto): LabResponseDto {
    const lab = Lab.create({
      name: dto.name,
      description: dto.description,
      author: dto.author,
      difficulty: dto.difficulty,
      estimatedTime: dto.estimatedTime,
      tags: dto.tags
    });

    this.state.lab = lab;
    this.state.currentFile = null;
    this.addToHistory(`Laboratorio '${dto.name}' creado`);

    return this.mapToLabResponse(lab);
  }

  /**
   * Carga un laboratorio existente
   */
  loadLab(lab: Lab, filePath?: string): LabResponseDto {
    this.state.lab = lab;
    this.state.currentFile = filePath || null;
    this.addToHistory(`Laboratorio '${lab.getMetadata().name}' cargado`);

    return this.mapToLabResponse(lab);
  }

  /**
   * Cierra la sesión actual
   */
  closeSession(): void {
    if (this.state.lab?.isModified()) {
      throw new Error('Hay cambios sin guardar. Usa guardar() primero o forzar con close(true)');
    }
    this.state.lab = null;
    this.state.currentFile = null;
    this.addToHistory('Sesión cerrada');
  }

  /**
   * Fuerza el cierre de la sesión sin guardar
   */
  forceClose(): void {
    this.state.lab = null;
    this.state.currentFile = null;
    this.addToHistory('Sesión cerrada (sin guardar)');
  }

  // ===== Gestión de Dispositivos =====

  /**
   * Agrega un dispositivo al laboratorio
   */
  addDevice(dto: CreateDeviceDto): DeviceResponseDto {
    this.ensureLabLoaded();

    const device = Device.create({
      name: dto.name,
      type: dto.type,
      model: dto.model,
      hostname: dto.hostname,
      iosVersion: dto.iosVersion,
      interfaces: [],
      ports: []
    });

    this.state.lab!.addDevice(device);
    this.addToHistory(`Dispositivo '${dto.name}' agregado`);

    return this.mapToDeviceResponse(device);
  }

  /**
   * Elimina un dispositivo del laboratorio
   */
  removeDevice(deviceId: string): void {
    this.ensureLabLoaded();
    
    const device = this.state.lab!.getDevice(deviceId);
    if (!device) {
      throw new Error(`Dispositivo con ID '${deviceId}' no encontrado`);
    }

    this.state.lab!.removeDevice(deviceId);
    this.addToHistory(`Dispositivo '${device.getName()}' eliminado`);
  }

  /**
   * Actualiza un dispositivo
   */
  updateDevice(deviceId: string, dto: UpdateDeviceDto): DeviceResponseDto {
    this.ensureLabLoaded();

    const device = this.state.lab!.getDevice(deviceId);
    if (!device) {
      throw new Error(`Dispositivo con ID '${deviceId}' no encontrado`);
    }

    if (dto.name) device.updateName(dto.name);
    if (dto.hostname) device.updateHostname(dto.hostname);
    // model no es mutable en la entidad, se establece al crear

    this.state.lab!.markAsModified();
    this.addToHistory(`Dispositivo '${device.getName()}' actualizado`);

    return this.mapToDeviceResponse(device);
  }

  /**
   * Lista todos los dispositivos
   */
  listDevices(): DeviceListResponseDto {
    this.ensureLabLoaded();

    const devices = this.state.lab!.getDevices();
    const byType: Record<string, number> = {};

    for (const device of devices) {
      const type = device.getType();
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      devices: devices.map(d => this.mapToDeviceResponse(d)),
      total: devices.length,
      byType
    };
  }

  /**
   * Obtiene un dispositivo por nombre
   */
  getDeviceByName(name: string): DeviceResponseDto | null {
    this.ensureLabLoaded();

    const device = this.state.lab!.findDeviceByName(name);
    return device ? this.mapToDeviceResponse(device) : null;
  }

  /**
   * Configura una interfaz de un dispositivo
   */
  configureInterface(deviceId: string, dto: InterfaceConfigDto): DeviceResponseDto {
    this.ensureLabLoaded();

    const device = this.state.lab!.getDevice(deviceId);
    if (!device) {
      throw new Error(`Dispositivo no encontrado`);
    }

    const interfaceConfig: InterfaceConfig = {
      name: dto.name,
      vlan: dto.vlan,
      mode: dto.mode,
      shutdown: dto.shutdown,
      description: dto.description
    };

    // Validar y crear IP si se proporciona
    if (dto.ip) {
      const ip = IpAddress.create(dto.ip);
      interfaceConfig.ip = ip;
      interfaceConfig.mask = dto.mask;

      if (dto.gateway) {
        interfaceConfig.gateway = IpAddress.create(dto.gateway);
      }

      // Validar configuración
      const validation = DomainValidationService.validateIpConfiguration(
        device,
        dto.name,
        ip,
        dto.mask || '255.255.255.0',
        interfaceConfig.gateway
      );

      if (!validation.valid) {
        throw new Error(`Configuración IP inválida: ${validation.errors[0].message}`);
      }
    }

    // Verificar si la interfaz ya existe
    const existingIface = device.getInterfaces().find(i => i.name === dto.name);
    if (existingIface) {
      device.updateInterface(dto.name, interfaceConfig);
    } else {
      device.addInterface(interfaceConfig);
    }

    this.state.lab!.markAsModified();
    this.addToHistory(`Interfaz '${dto.name}' configurada en '${device.getName()}'`);

    return this.mapToDeviceResponse(device);
  }

  // ===== Gestión de Conexiones =====

  /**
   * Crea una conexión entre dos dispositivos
   */
  addConnection(dto: CreateConnectionDto): ConnectionResponseDto {
    this.ensureLabLoaded();

    // Buscar dispositivos por nombre
    const fromDevice = this.state.lab!.findDeviceByName(dto.fromDeviceName);
    const toDevice = this.state.lab!.findDeviceByName(dto.toDeviceName);

    if (!fromDevice) {
      throw new Error(`Dispositivo origen '${dto.fromDeviceName}' no encontrado`);
    }
    if (!toDevice) {
      throw new Error(`Dispositivo destino '${dto.toDeviceName}' no encontrado`);
    }

    // Crear tipo de cable
    const cableType = CableType.create(dto.cableType);

    // Validar la conexión
    const validation = DomainValidationService.validateNewConnection(
      this.state.lab!,
      fromDevice.getId(),
      dto.fromPort,
      toDevice.getId(),
      dto.toPort,
      cableType
    );

    if (!validation.valid) {
      const error = validation.errors[0];
      throw new Error(error.message);
    }

    // Crear la conexión
    const connection = Connection.create({
      fromDeviceId: fromDevice.getId(),
      fromDeviceName: fromDevice.getName(),
      fromPort: dto.fromPort,
      toDeviceId: toDevice.getId(),
      toDeviceName: toDevice.getName(),
      toPort: dto.toPort,
      cableType
    });

    this.state.lab!.addConnection(connection);
    this.addToHistory(`Conexión creada: ${connection.toDisplayString()}`);

    return this.mapToConnectionResponse(connection);
  }

  /**
   * Elimina una conexión
   */
  removeConnection(connectionId: string): void {
    this.ensureLabLoaded();
    this.state.lab!.removeConnection(connectionId);
    this.addToHistory(`Conexión '${connectionId}' eliminada`);
  }

  /**
   * Lista todas las conexiones
   */
  listConnections(): ConnectionListResponseDto {
    this.ensureLabLoaded();

    const connections = this.state.lab!.getConnections();
    return {
      connections: connections.map(c => this.mapToConnectionResponse(c)),
      total: connections.length
    };
  }

  /**
   * Obtiene los puertos disponibles de un dispositivo
   */
  getAvailablePorts(deviceId: string): PortAvailabilityDto[] {
    this.ensureLabLoaded();

    const device = this.state.lab!.getDevice(deviceId);
    if (!device) {
      throw new Error('Dispositivo no encontrado');
    }

    const allPorts = device.getPorts();
    const availablePorts = this.state.lab!.getAvailablePorts(deviceId);
    const availableNames = new Set(availablePorts.map(p => p.getName()));

    return allPorts.map(port => ({
      deviceId,
      deviceName: device.getName(),
      portName: port.getName(),
      portType: port.getType(),
      available: availableNames.has(port.getName()),
      supportsFiber: port.supportsFiber(),
      supportsCopper: port.supportsCopper(),
      supportsSerial: port.supportsSerial()
    }));
  }

  // ===== Validación =====

  /**
   * Valida el laboratorio completo
   */
  validate(): ValidationResult {
    this.ensureLabLoaded();
    return DomainValidationService.validateLab(this.state.lab!);
  }

  /**
   * Obtiene estadísticas del laboratorio
   */
  getStats(): LabStatsDto {
    this.ensureLabLoaded();

    const stats = this.state.lab!.getStats();
    const validation = DomainValidationService.validateLab(this.state.lab!);

    return {
      deviceCount: stats.deviceCount,
      connectionCount: stats.connectionCount,
      devicesByType: stats.devicesByType,
      validationStatus: {
        valid: validation.valid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      }
    };
  }

  /**
   * Obtiene sugerencias para mejorar el laboratorio
   */
  getSuggestions(): string[] {
    this.ensureLabLoaded();

    const suggestions: string[] = [];
    const validation = DomainValidationService.validateLab(this.state.lab!);

    for (const warning of validation.warnings) {
      if (warning.suggestion) {
        suggestions.push(`${warning.entity || 'General'}: ${warning.suggestion}`);
      }
    }

    return suggestions;
  }

  // ===== Helpers Privados =====

  private ensureLabLoaded(): void {
    if (!this.state.lab) {
      throw new Error('No hay un laboratorio cargado. Usa crearLab() o cargarLab() primero.');
    }
  }

  private addToHistory(action: string): void {
    this.state.history.push(`[${new Date().toLocaleTimeString()}] ${action}`);
    // Mantener solo las últimas 100 acciones
    if (this.state.history.length > 100) {
      this.state.history.shift();
    }
  }

  private mapToLabResponse(lab: Lab): LabResponseDto {
    const metadata = lab.getMetadata();
    return {
      id: lab.getId(),
      metadata: {
        name: metadata.name,
        description: metadata.description,
        version: metadata.version,
        author: metadata.author,
        difficulty: metadata.difficulty,
        estimatedTime: metadata.estimatedTime,
        tags: metadata.tags
      },
      deviceCount: lab.getDevices().length,
      connectionCount: lab.getConnections().length,
      modified: lab.isModified(),
      originalFile: lab.getOriginalFile()
    };
  }

  private mapToDeviceResponse(device: Device): DeviceResponseDto {
    const availablePorts = device.getPorts()
      .filter(p => this.state.lab?.getAvailablePorts(device.getId()).some(ap => ap.getName() === p.getName()))
      .map(p => p.getName());

    return {
      id: device.getId(),
      name: device.getName(),
      type: device.getType(),
      typeDescription: device.getTypeDescription(),
      icon: device.getIcon(),
      model: device.getModel(),
      hostname: device.getHostname(),
      interfaces: device.getInterfaces().map(i => ({
        name: i.name,
        ip: i.ip?.getValue(),
        mask: i.mask,
        gateway: i.gateway?.getValue(),
        vlan: i.vlan,
        mode: i.mode,
        shutdown: i.shutdown,
        description: i.description
      })),
      portCount: device.getPorts().length,
      availablePorts,
      supportsRouting: device.supportsRouting(),
      supportsVlans: device.supportsVlans(),
      supportsModules: device.supportsModules()
    };
  }

  private mapToConnectionResponse(connection: Connection): ConnectionResponseDto {
    return {
      id: connection.getId(),
      fromDeviceId: connection.getFromDeviceId(),
      fromDeviceName: connection.getFromDeviceName(),
      fromPort: connection.getFromPort(),
      toDeviceId: connection.getToDeviceId(),
      toDeviceName: connection.getToDeviceName(),
      toPort: connection.getToPort(),
      cableType: connection.getCableType().getValue(),
      cableDisplayName: connection.getCableType().getDisplayName(),
      medium: connection.getMedium(),
      functional: connection.isFunctional(),
      displayString: connection.toDisplayString()
    };
  }
}
