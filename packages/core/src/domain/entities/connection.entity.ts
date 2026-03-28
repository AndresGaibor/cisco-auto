/**
 * Entity: Connection
 * Representa una conexión física entre dos dispositivos
 */
import { CableType, CableTypeEnum } from '../value-objects/cable-type.vo.ts';
import { Port } from '../value-objects/port.vo.ts';

export interface ConnectionProps {
  id: string;
  fromDeviceId: string;
  fromDeviceName: string;
  fromPort: string;
  toDeviceId: string;
  toDeviceName: string;
  toPort: string;
  cableType: CableType;
  medium: LinkMedium;
  length?: number;
  functional?: boolean;
}

export enum LinkMedium {
  COPPER = 'Copper',
  FIBER = 'Fiber',
  SERIAL = 'Serial',
  WIRELESS = 'Wireless',
  CONSOLE = 'Console'
}

export class Connection {
  private constructor(private props: ConnectionProps) {}

  static create(props: Omit<ConnectionProps, 'id' | 'medium'> & { id?: string; medium?: LinkMedium }): Connection {
    const id = props.id || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validar dispositivos diferentes
    if (props.fromDeviceId === props.toDeviceId) {
      throw new Error('No se puede conectar un dispositivo a sí mismo');
    }

    // Determinar medio físico basado en el cable
    const medium = props.medium || Connection.inferMedium(props.cableType);

    return new Connection({
      ...props,
      id,
      medium,
      length: props.length || 1,
      functional: props.functional !== false
    });
  }

  /**
   * Infiere el medio físico basado en el tipo de cable
   */
  private static inferMedium(cableType: CableType): LinkMedium {
    const type = cableType.getValue();
    
    if (type === CableTypeEnum.FIBER) {
      return LinkMedium.FIBER;
    }
    if (type === CableTypeEnum.SERIAL_DCE || type === CableTypeEnum.SERIAL_DTE) {
      return LinkMedium.SERIAL;
    }
    if (type === CableTypeEnum.CONSOLE) {
      return LinkMedium.CONSOLE;
    }
    return LinkMedium.COPPER;
  }

  // Getters
  getId(): string {
    return this.props.id;
  }

  getFromDeviceId(): string {
    return this.props.fromDeviceId;
  }

  getFromDeviceName(): string {
    return this.props.fromDeviceName;
  }

  getFromPort(): string {
    return this.props.fromPort;
  }

  getToDeviceId(): string {
    return this.props.toDeviceId;
  }

  getToDeviceName(): string {
    return this.props.toDeviceName;
  }

  getToPort(): string {
    return this.props.toPort;
  }

  getCableType(): CableType {
    return this.props.cableType;
  }

  getMedium(): LinkMedium {
    return this.props.medium;
  }

  isFunctional(): boolean {
    return this.props.functional || false;
  }

  /**
   * Verifica si esta conexión involucra un dispositivo específico
   */
  involvesDevice(deviceId: string): boolean {
    return this.props.fromDeviceId === deviceId || this.props.toDeviceId === deviceId;
  }

  /**
   * Verifica si esta conexión usa un puerto específico de un dispositivo
   */
  usesPort(deviceId: string, portName: string): boolean {
    if (this.props.fromDeviceId === deviceId && this.props.fromPort === portName) {
      return true;
    }
    if (this.props.toDeviceId === deviceId && this.props.toPort === portName) {
      return true;
    }
    return false;
  }

  /**
   * Obtiene el otro extremo de la conexión dado un dispositivo
   */
  getOtherEnd(deviceId: string, portName?: string): { deviceId: string; deviceName: string; port: string } | null {
    if (this.props.fromDeviceId === deviceId) {
      if (!portName || this.props.fromPort === portName) {
        return {
          deviceId: this.props.toDeviceId,
          deviceName: this.props.toDeviceName,
          port: this.props.toPort
        };
      }
    }
    if (this.props.toDeviceId === deviceId) {
      if (!portName || this.props.toPort === portName) {
        return {
          deviceId: this.props.fromDeviceId,
          deviceName: this.props.fromDeviceName,
          port: this.props.fromPort
        };
      }
    }
    return null;
  }

  /**
   * Marca la conexión como no funcional
   */
  markAsNonFunctional(): void {
    this.props.functional = false;
  }

  /**
   * Marca la conexión como funcional
   */
  markAsFunctional(): void {
    this.props.functional = true;
  }

  /**
   * Obtiene representación legible de la conexión
   */
  toDisplayString(): string {
    return `${this.props.fromDeviceName}(${this.props.fromPort}) ←[${this.props.cableType.getDisplayName()}]→ ${this.props.toDeviceName}(${this.props.toPort})`;
  }

  /**
   * Serializa la entidad
   */
  toJSON(): ConnectionProps {
    return {
      ...this.props,
      cableType: this.props.cableType as any
    };
  }
}
