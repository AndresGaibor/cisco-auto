/**
 * Entity: Device
 * Entidad de dominio que representa un dispositivo de red
 */
import { IpAddress } from '../value-objects/ip-address.vo.ts';
import { Port, PortType } from '../value-objects/port.vo.ts';

export type DeviceType = 
  | 'router' 
  | 'switch' 
  | 'multilayer-switch'
  | 'pc' 
  | 'server' 
  | 'access-point'
  | 'firewall'
  | 'cloud'
  | 'modem'
  | 'printer'
  | 'wireless-router';

export interface InterfaceConfig {
  name: string;
  ip?: IpAddress;
  mask?: string;
  gateway?: IpAddress;
  vlan?: number;
  mode?: 'access' | 'trunk' | 'routed';
  shutdown?: boolean;
  description?: string;
}

export interface DeviceCredentials {
  username: string;
  password: string;
  enablePassword?: string;
}

export interface SSHConfig {
  enabled: boolean;
  version: 1 | 2;
  port: number;
}

export interface DeviceProps {
  id: string;
  name: string;
  type: DeviceType;
  model?: string;
  hostname?: string;
  iosVersion?: string;
  interfaces: InterfaceConfig[];
  ports: Port[];
  credentials?: DeviceCredentials;
  ssh?: SSHConfig;
  managementIp?: IpAddress;
  managementMask?: string;
  managementGateway?: IpAddress;
  managementVlan?: number;
}

export class Device {
  private constructor(private props: DeviceProps) {}

  static create(props: Omit<DeviceProps, 'id'> & { id?: string }): Device {
    const id = props.id || `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validar nombre único
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('El nombre del dispositivo es requerido');
    }

    // Validar tipo de dispositivo
    const validTypes: DeviceType[] = [
      'router', 'switch', 'multilayer-switch', 'pc', 'server', 
      'access-point', 'firewall', 'cloud', 'modem', 'printer', 'wireless-router'
    ];
    if (!validTypes.includes(props.type)) {
      throw new Error(`Tipo de dispositivo inválido: ${props.type}`);
    }

    return new Device({
      ...props,
      id,
      interfaces: props.interfaces || [],
      ports: props.ports || []
    });
  }

  // Getters
  getId(): string {
    return this.props.id;
  }

  getName(): string {
    return this.props.name;
  }

  getType(): DeviceType {
    return this.props.type;
  }

  getModel(): string | undefined {
    return this.props.model;
  }

  getHostname(): string | undefined {
    return this.props.hostname;
  }

  getInterfaces(): InterfaceConfig[] {
    return [...this.props.interfaces];
  }

  getPorts(): Port[] {
    return [...this.props.ports];
  }

  getCredentials(): DeviceCredentials | undefined {
    return this.props.credentials;
  }

  // Setters y métodos de modificación
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('El nombre no puede estar vacío');
    }
    this.props.name = name;
  }

  updateHostname(hostname: string): void {
    this.props.hostname = hostname;
  }

  addInterface(config: InterfaceConfig): void {
    // Validar que no exista otra interfaz con el mismo nombre
    const existing = this.props.interfaces.find(i => i.name === config.name);
    if (existing) {
      throw new Error(`La interfaz ${config.name} ya existe en el dispositivo ${this.props.name}`);
    }
    this.props.interfaces.push(config);
  }

  updateInterface(name: string, config: Partial<InterfaceConfig>): void {
    const index = this.props.interfaces.findIndex(i => i.name === name);
    if (index === -1) {
      throw new Error(`Interfaz ${name} no encontrada en el dispositivo ${this.props.name}`);
    }
    const existing = this.props.interfaces[index]!;
    this.props.interfaces[index] = { ...existing, ...config, name: existing.name };
  }

  removeInterface(name: string): void {
    const index = this.props.interfaces.findIndex(i => i.name === name);
    if (index === -1) {
      throw new Error(`Interfaz ${name} no encontrada`);
    }
    this.props.interfaces.splice(index, 1);
  }

  addPort(port: Port): void {
    const existing = this.props.ports.find(p => p.getName() === port.getName());
    if (existing) {
      throw new Error(`El puerto ${port.getName()} ya existe`);
    }
    this.props.ports.push(port);
  }

  updateCredentials(credentials: DeviceCredentials): void {
    this.props.credentials = credentials;
  }

  updateSSH(config: SSHConfig): void {
    this.props.ssh = config;
  }

  updateManagementIp(ip: IpAddress, mask: string, gateway?: IpAddress): void {
    // Validar que la IP y el gateway estén en la misma red
    if (gateway) {
      const ipNetwork = ip.getNetworkAddress(mask);
      const gwNetwork = gateway.getNetworkAddress(mask);
      if (ipNetwork !== gwNetwork) {
        throw new Error(`El gateway ${gateway.getValue()} no está en la misma red que la IP ${ip.getValue()}`);
      }
    }
    this.props.managementIp = ip;
    this.props.managementMask = mask;
    this.props.managementGateway = gateway;
  }

  /**
   * Verifica si el dispositivo soporta routing
   */
  supportsRouting(): boolean {
    return ['router', 'multilayer-switch', 'wireless-router', 'firewall'].includes(this.props.type);
  }

  /**
   * Verifica si el dispositivo soporta VLANs
   */
  supportsVlans(): boolean {
    return ['switch', 'multilayer-switch'].includes(this.props.type);
  }

  /**
   * Verifica si el dispositivo soporta módulos
   */
  supportsModules(): boolean {
    return ['router', 'switch', 'multilayer-switch'].includes(this.props.type);
  }

  /**
   * Obtiene el icono representativo del dispositivo
   */
  getIcon(): string {
    const icons: Record<DeviceType, string> = {
      'router': '🌐',
      'switch': '🔀',
      'multilayer-switch': '🔀',
      'pc': '🖥️',
      'server': '🖥️',
      'access-point': '📡',
      'firewall': '🛡️',
      'cloud': '☁️',
      'modem': '📞',
      'printer': '🖨️',
      'wireless-router': '📶'
    };
    return icons[this.props.type];
  }

  /**
   * Obtiene descripción del tipo de dispositivo en español
   */
  getTypeDescription(): string {
    const descriptions: Record<DeviceType, string> = {
      'router': 'Router',
      'switch': 'Switch',
      'multilayer-switch': 'Switch Multicapa',
      'pc': 'PC',
      'server': 'Servidor',
      'access-point': 'Access Point',
      'firewall': 'Firewall',
      'cloud': 'Nube',
      'modem': 'Módem',
      'printer': 'Impresora',
      'wireless-router': 'Router Inalámbrico'
    };
    return descriptions[this.props.type];
  }

  /**
   * Serializa la entidad a un objeto plano
   */
  toJSON(): DeviceProps {
    return {
      ...this.props,
      interfaces: this.props.interfaces.map(i => ({
        ...i,
        ip: i.ip?.getValue(),
        gateway: i.gateway?.getValue()
      })) as any,
      managementIp: this.props.managementIp?.getValue() as any,
      managementGateway: this.props.managementGateway?.getValue() as any
    };
  }

  /**
   * Crea una copia de la entidad
   */
  clone(): Device {
    return Device.create({ ...this.props });
  }
}
