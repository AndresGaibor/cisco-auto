/**
 * Value Object: CableType
 * Representa los tipos de cables soportados con sus restricciones
 */
export enum CableTypeEnum {
  COPPER_STRAIGHT = 'eStraightThrough',
  COPPER_CROSS = 'eCrossOver',
  FIBER = 'eFiber',
  SERIAL_DCE = 'eSerialDCE',
  SERIAL_DTE = 'eSerialDTE',
  CONSOLE = 'eConsole',
  COAXIAL = 'eCoaxial'
}

export class CableType {
  private constructor(private readonly type: CableTypeEnum) {}

  static create(type: string): CableType {
    const normalizedType = type.toLowerCase().replace(/[-_\s]/g, '');
    
    const typeMap: Record<string, CableTypeEnum> = {
      'copperstraight': CableTypeEnum.COPPER_STRAIGHT,
      'cobredirecto': CableTypeEnum.COPPER_STRAIGHT,
      'straight': CableTypeEnum.COPPER_STRAIGHT,
      'coppercross': CableTypeEnum.COPPER_CROSS,
      'cobrecruzado': CableTypeEnum.COPPER_CROSS,
      'cross': CableTypeEnum.COPPER_CROSS,
      'fiber': CableTypeEnum.FIBER,
      'fibra': CableTypeEnum.FIBER,
      'serialdce': CableTypeEnum.SERIAL_DCE,
      'dce': CableTypeEnum.SERIAL_DCE,
      'serialdte': CableTypeEnum.SERIAL_DTE,
      'dte': CableTypeEnum.SERIAL_DTE,
      'serial': CableTypeEnum.SERIAL_DTE,
      'console': CableTypeEnum.CONSOLE,
      'consola': CableTypeEnum.CONSOLE,
      'rollover': CableTypeEnum.CONSOLE,
      'coaxial': CableTypeEnum.COAXIAL
    };

    const cableType = typeMap[normalizedType];
    if (!cableType) {
      throw new Error(`Tipo de cable no soportado: ${type}. Tipos válidos: ${Object.values(CableTypeEnum).join(', ')}`);
    }

    return new CableType(cableType);
  }

  static fromEnum(type: CableTypeEnum): CableType {
    return new CableType(type);
  }

  getValue(): CableTypeEnum {
    return this.type;
  }

  /**
   * Obtiene el nombre amigable en español
   */
  getDisplayName(): string {
    const names: Record<CableTypeEnum, string> = {
      [CableTypeEnum.COPPER_STRAIGHT]: 'Cobre Directo',
      [CableTypeEnum.COPPER_CROSS]: 'Cobre Cruzado',
      [CableTypeEnum.FIBER]: 'Fibra Óptica',
      [CableTypeEnum.SERIAL_DCE]: 'Serial DCE',
      [CableTypeEnum.SERIAL_DTE]: 'Serial DTE',
      [CableTypeEnum.CONSOLE]: 'Cable Consola',
      [CableTypeEnum.COAXIAL]: 'Coaxial'
    };
    return names[this.type];
  }

  /**
   * Verifica si es un cable de fibra
   */
  isFiber(): boolean {
    return this.type === CableTypeEnum.FIBER;
  }

  /**
   * Verifica si es un cable serial
   */
  isSerial(): boolean {
    return this.type === CableTypeEnum.SERIAL_DCE || this.type === CableTypeEnum.SERIAL_DTE;
  }

  /**
   * Verifica si es un cable de consola
   */
  isConsole(): boolean {
    return this.type === CableTypeEnum.CONSOLE;
  }

  /**
   * Verifica si es un cable de cobre
   */
  isCopper(): boolean {
    return this.type === CableTypeEnum.COPPER_STRAIGHT || this.type === CableTypeEnum.COPPER_CROSS;
  }

  /**
   * Valida compatibilidad con un tipo de puerto
   */
  isCompatibleWithPort(portName: string): { compatible: boolean; reason?: string } {
    const port = portName.toLowerCase();

    // Regla: Puertos Serial solo aceptan cables Serial
    if (port.includes('serial') && !this.isSerial()) {
      return { 
        compatible: false, 
        reason: `El puerto ${portName} es Serial y requiere cable Serial (DCE o DTE)` 
      };
    }

    // Regla: Puertos de Fibra solo aceptan cables de Fibra
    if (port.includes('fiber') && !this.isFiber()) {
      return { 
        compatible: false, 
        reason: `El puerto ${portName} requiere cable de Fibra Óptica` 
      };
    }

    // Regla: Puertos FastEthernet/Gigabit (Cobre) no aceptan Fibra directamente
    if ((port.includes('fastethernet') || port.includes('gigabit')) && 
        !port.includes('fiber') && this.isFiber()) {
      return { 
        compatible: false, 
        reason: `No puedes conectar cable de Fibra en un puerto de Cobre (${portName})` 
      };
    }

    // Regla: Cable de consola solo va a puertos Console/RS232
    if (this.isConsole() && !port.includes('console') && !port.includes('rs 232')) {
      return { 
        compatible: false, 
        reason: `El cable de Consola solo puede conectarse a puertos Console o RS 232` 
      };
    }

    return { compatible: true };
  }

  /**
   * Obtiene descripción de uso recomendado
   */
  getUsageDescription(): string {
    const descriptions: Record<CableTypeEnum, string> = {
      [CableTypeEnum.COPPER_STRAIGHT]: 'Para conectar dispositivos diferentes (Router-Switch, PC-Switch)',
      [CableTypeEnum.COPPER_CROSS]: 'Para conectar dispositivos iguales (Switch-Switch, Router-Router, PC-PC)',
      [CableTypeEnum.FIBER]: 'Para conexiones de larga distancia o alta velocidad',
      [CableTypeEnum.SERIAL_DCE]: 'Para conexiones WAN serie (provee clocking)',
      [CableTypeEnum.SERIAL_DTE]: 'Para conexiones WAN serie (recibe clocking)',
      [CableTypeEnum.CONSOLE]: 'Para acceso de configuración inicial vía puerto de consola',
      [CableTypeEnum.COAXIAL]: 'Para conexiones legacy o coaxiales'
    };
    return descriptions[this.type];
  }

  equals(other: CableType): boolean {
    return this.type === other.type;
  }

  toString(): string {
    return this.type;
  }
}
