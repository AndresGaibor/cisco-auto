/**
 * Tipo de cable para enlaces de red
 */
export enum CableType {
  STRAIGHT = 'straight',
  CROSSOVER = 'crossover',
  FIBER = 'fiber',
  SERIAL = 'serial',
  CONSOLE = 'console',
}

/**
 * Punto de conexión de un enlace
 */
export interface ConnectionPoint {
  deviceName: string;
  interfaceName: string;
}

/**
 * Entidad que representa un enlace físico entre dos interfaces de dispositivos.
 *
 * Un enlace conecta dos interfaces a través de un tipo de cable específico.
 */
export class LinkEntity {
  private readonly _id: string;
  private readonly _sideA: ConnectionPoint;
  private readonly _sideB: ConnectionPoint;
  private readonly _cableType: CableType;
  private _active: boolean;

  constructor(sideA: ConnectionPoint, sideB: ConnectionPoint, cableType: CableType) {
    this._id = this.generateId(sideA, sideB);
    this._sideA = sideA;
    this._sideB = sideB;
    this._cableType = cableType;
    this._active = true;
  }

  // ===== Getters =====

  get id(): string {
    return this._id;
  }

  get sideA(): ConnectionPoint {
    return this._sideA;
  }

  get sideB(): ConnectionPoint {
    return this._sideB;
  }

  get cableType(): CableType {
    return this._cableType;
  }

  get active(): boolean {
    return this._active;
  }

  // ===== Métodos =====

  /**
   * Desconecta el enlace
   */
  disconnect(): void {
    this._active = false;
  }

  /**
   * Reconecta el enlace
   */
  reconnect(): void {
    this._active = true;
  }

  /**
   * Verifica si el enlace conecta con un dispositivo dado
   */
  connectsToDevice(deviceName: string): boolean {
    return this._sideA.deviceName === deviceName || this._sideB.deviceName === deviceName;
  }

  /**
   * Verifica si el enlace conecta con una interfaz específica
   */
  connectsToInterface(deviceName: string, interfaceName: string): boolean {
    return (
      (this._sideA.deviceName === deviceName && this._sideA.interfaceName === interfaceName) ||
      (this._sideB.deviceName === deviceName && this._sideB.interfaceName === interfaceName)
    );
  }

  /**
   * Obtiene el punto de conexión opuesto al dado
   */
  getOtherSide(deviceName: string, interfaceName: string): ConnectionPoint | null {
    if (this._sideA.deviceName === deviceName && this._sideA.interfaceName === interfaceName) {
      return this._sideB;
    }
    if (this._sideB.deviceName === deviceName && this._sideB.interfaceName === interfaceName) {
      return this._sideA;
    }
    return null;
  }

  /**
   * Serializa el enlace a JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      sideA: this._sideA,
      sideB: this._sideB,
      cableType: this._cableType,
      active: this._active,
    };
  }

  /**
   * Genera un ID único para el enlace
   */
  private generateId(a: ConnectionPoint, b: ConnectionPoint): string {
    // Ordenar para que el ID sea independiente del orden de los lados
    const sorted = [
      `${a.deviceName}:${a.interfaceName}`,
      `${b.deviceName}:${b.interfaceName}`,
    ].sort();
    return `${sorted[0]}<->${sorted[1]}`;
  }
}
