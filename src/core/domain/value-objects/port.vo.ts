/**
 * Value Object: Port
 * Representa un puerto de red con sus características
 */
export enum PortType {
  ETHERNET = 'Ethernet',
  FAST_ETHERNET = 'FastEthernet',
  GIGABIT_ETHERNET = 'GigabitEthernet',
  SERIAL = 'Serial',
  FIBER = 'Fiber',
  CONSOLE = 'Console',
  AUX = 'AUX',
  USB = 'USB',
  RS232 = 'RS232'
}

export interface PortConfig {
  name: string;
  type: PortType;
  number: string;
  supportsFiber: boolean;
  supportsCopper: boolean;
  supportsSerial: boolean;
  isModular?: boolean;
  moduleSlot?: number;
}

export class Port {
  private constructor(private readonly config: PortConfig) {}

  static create(name: string): Port {
    const parsed = Port.parsePortName(name);
    return new Port(parsed);
  }

  static createFromConfig(config: PortConfig): Port {
    return new Port(config);
  }

  /**
   * Parsea el nombre de un puerto y extrae sus características
   */
  private static parsePortName(name: string): PortConfig {
    const lowerName = name.toLowerCase();
    
    let type: PortType;
    let supportsFiber = false;
    let supportsCopper = false;
    let supportsSerial = false;
    let number = '';

    if (lowerName.includes('fastethernet') || lowerName.includes('fa')) {
      type = PortType.FAST_ETHERNET;
      supportsCopper = true;
      const match = name.match(/(?:FastEthernet|Fa)[\s\/]?(\d+(?:\/\d+)?)/i);
      number = match?.[1] || '0/0';
    } else if (lowerName.includes('gigabitethernet') || lowerName.includes('gi') || lowerName.includes('gig')) {
      type = PortType.GIGABIT_ETHERNET;
      supportsCopper = true;
      supportsFiber = lowerName.includes('fiber') || lowerName.includes('sfp');
      const match = name.match(/(?:GigabitEthernet|Gi|Gig)[\s\/]?(\d+(?:\/\d+)?)/i);
      number = match?.[1] || '0/0';
    } else if (lowerName.includes('serial') || lowerName.includes('se')) {
      type = PortType.SERIAL;
      supportsSerial = true;
      const match = name.match(/(?:Serial|Se)[\s\/]?(\d+(?:\/\d+:\d+)?)/i);
      number = match?.[1] || '0/0/0';
    } else if (lowerName.includes('console') || lowerName.includes('con')) {
      type = PortType.CONSOLE;
      const match = name.match(/(?:Console|Con)[\s\/]?(\d*)/i);
      number = match?.[1] || '0';
    } else if (lowerName.includes('aux')) {
      type = PortType.AUX;
      number = '0';
    } else if (lowerName.includes('rs232')) {
      type = PortType.RS232;
      number = '0';
    } else if (lowerName.includes('fiber')) {
      type = PortType.FIBER;
      supportsFiber = true;
      number = '0';
    } else {
      type = PortType.ETHERNET;
      supportsCopper = true;
      number = name;
    }

    return {
      name,
      type,
      number,
      supportsFiber,
      supportsCopper,
      supportsSerial
    };
  }

  getName(): string {
    return this.config.name;
  }

  getType(): PortType {
    return this.config.type;
  }

  getNumber(): string {
    return this.config.number;
  }

  supportsFiber(): boolean {
    return this.config.supportsFiber;
  }

  supportsCopper(): boolean {
    return this.config.supportsCopper;
  }

  supportsSerial(): boolean {
    return this.config.supportsSerial;
  }

  isModular(): boolean {
    return this.config.isModular || false;
  }

  /**
   * Obtiene el nombre formateado del puerto
   */
  getFormattedName(): string {
    const prefixes: Record<PortType, string> = {
      [PortType.ETHERNET]: 'Ethernet',
      [PortType.FAST_ETHERNET]: 'FastEthernet',
      [PortType.GIGABIT_ETHERNET]: 'GigabitEthernet',
      [PortType.SERIAL]: 'Serial',
      [PortType.FIBER]: 'Fiber',
      [PortType.CONSOLE]: 'Console',
      [PortType.AUX]: 'AUX',
      [PortType.USB]: 'USB',
      [PortType.RS232]: 'RS232'
    };
    return `${prefixes[this.config.type]}${this.config.number}`;
  }

  /**
   * Verifica si el puerto está disponible para una conexión
   */
  isAvailableForConnection(connectedPorts: string[]): boolean {
    return !connectedPorts.includes(this.config.name);
  }

  equals(other: Port): boolean {
    return this.config.name === other.config.name;
  }

  toString(): string {
    return this.config.name;
  }
}
