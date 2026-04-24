/**
 * Value Object para números de secuencia del FileBridgeV2.
 *
 * Los seq numbers son enteros de 12 dígitos zero-padded para garantizar
 * ordenamiento correcto de archivos en el filesystem (orden lexicográfico).
 */
export class CommandSeq {
  public readonly value: number;
  private readonly _padded: string;

  /**
   * @param value - Número de secuencia (debe ser integer >= 1 y <= 999_999_999_999)
   * @throws Error si el valor no es válido
   */
  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new Error(`Sequence number must be an integer, got: ${value}`);
    }
    if (value < 1) {
      throw new Error(`Sequence number must be >= 1, got: ${value}`);
    }
    if (value > 999_999_999_999) {
      throw new Error(`Sequence number exceeds maximum (12 digits), got: ${value}`);
    }
    this.value = value;
    this._padded = String(value).padStart(12, "0");
  }

  /**
   * Deserialize from JSON (number).
   */
  static fromJSON(value: number): CommandSeq {
    return new CommandSeq(value);
  }

  /**
   * Serialize to JSON (number).
   */
  toJSON(): number {
    return this.value;
  }

  /** Valor numérico raw */
  get raw(): number {
    return this.value;
  }

  /** String zero-padded a 12 dígitos */
  get padded(): string {
    return this._padded;
  }

  /** Obtiene el siguiente seq number */
  next(): CommandSeq {
    return new CommandSeq(this.value + 1);
  }

  /**
   * Obtiene el seq anterior o null si this.value === 1
   */
  previous(): CommandSeq | null {
    if (this.value === 1) return null;
    return new CommandSeq(this.value - 1);
  }

  /** @returns true si this.value < other.value */
  isBefore(other: CommandSeq): boolean {
    return this.value < other.value;
  }

  /** @returns true si this.value > other.value */
  isAfter(other: CommandSeq): boolean {
    return this.value > other.value;
  }

  /**
   * Calcula la distancia absoluta a otro seq
   * @param other - Otro CommandSeq
   * @returns Distancia en valores absolutos
   */
  distanceTo(other: CommandSeq): number {
    return Math.abs(other.value - this.value);
  }

  /**
   * @param other - Seq de referencia
   * @param range - Rango a verificar
   * @returns true si la distancia a other <= range
   */
  isWithinRange(other: CommandSeq, range: number): boolean {
    return this.distanceTo(other) <= range;
  }

  /** @returns Versión padded para usar en filenames */
  toFileName(): string {
    return this._padded;
  }

  /** @returns String del valor numérico (para logging) */
  toString(): string {
    return String(this.value);
  }

  /** @param other - CommandSeq a comparar @returns true si son iguales */
  equals(other: CommandSeq): boolean {
    return this.value === other.value;
  }

  /**
   * Parse desde string padded (ej. "000000000042")
   * @param padded - String de 12 dígitos
   */
  static fromPadded(padded: string): CommandSeq {
    const num = parseInt(padded, 10);
    if (isNaN(num)) {
      throw new Error(`Invalid padded sequence: "${padded}"`);
    }
    return new CommandSeq(num);
  }

  /**
   * Parse desde nombre de archivo de comando (ej. "000000000042-configIos.json")
   * @param filename - Nombre de archivo con formato <seq>-<type>.json
   */
  static fromFileName(filename: string): CommandSeq {
    const match = filename.match(/^(\d{12})-/);
    if (!match) {
      throw new Error(`Invalid command filename: "${filename}"`);
    }
    return CommandSeq.fromPadded(match[1]!);
  }
}

/**
 * Create a CommandSeq from a number, throwing if invalid
 */
export function parseCommandSeq(value: number): CommandSeq {
  return new CommandSeq(value);
}

/**
 * Check if a number is a valid sequence number without throwing
 */
export function isValidCommandSeq(value: number): boolean {
  try {
    new CommandSeq(value);
    return true;
  } catch {
    return false;
  }
}
