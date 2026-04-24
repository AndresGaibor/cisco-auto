/**
 * Value Object para identificadores únicos de comandos.
 *
 * Usa UUID v4 para correlar comandos con resultados en el bridge.
 * El formato UUID v4 garantiza unicidad global y aleatoriedad.
 */
import { randomUUID } from "node:crypto";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Comando ID validado como UUID v4.
 */
export class CommandId {
  public readonly value: string;

  /**
   * @param value - String UUID v4 a validar
   * @throws Error si no es UUID v4 válido
   */
  constructor(value: string) {
    const trimmed = value.trim();
    if (!UUID_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid command ID: "${value}". Must be a valid UUID v4 format.`
      );
    }
    this.value = trimmed.toLowerCase();
  }

  /** Genera un nuevo CommandId único (UUID v4 random) */
  static generate(): CommandId {
    return new CommandId(randomUUID());
  }

  /** Deserialize from JSON */
  static fromJSON(value: string): CommandId {
    return new CommandId(value);
  }

  /** Serialize to JSON */
  toJSON(): string {
    return this.value;
  }

  /** Valor raw del UUID */
  get raw(): string {
    return this.value;
  }

  /** Forma corta (primeros 8 caracteres) */
  get short(): string {
    return this.value.substring(0, 8);
  }

  /** Version del UUID (carácter 14, debe ser 4 para v4) */
  get version(): number {
    return parseInt(this.value.charAt(14), 10);
  }

  /**
   * Variant del UUID (caracteres 19-20, indica RFC 4122)
   * @returns "RFC4122" si es variant válido, "unknown" si no
   */
  get variant(): string {
    const variantChar = this.value.charAt(19);
    if (["8", "9", "a", "b"].includes(variantChar)) {
      return "RFC4122";
    }
    return "unknown";
  }

  /** @returns true si es UUID v4 válido */
  get isValid(): boolean {
    return UUID_PATTERN.test(this.value);
  }

  /** @returns true si es el UUID nil (todos ceros) */
  get isNil(): boolean {
    return this.value === "00000000-0000-4000-8000-000000000000";
  }

  /** @param other - CommandId a comparar @returns true si son iguales */
  equals(other: CommandId): boolean {
    return this.value === other.value;
  }

  /** @returns String del UUID completo */
  toString(): string {
    return this.value;
  }

  /** @returns Nombre de archivo de resultado para este ID */
  toResultFileName(): string {
    return `${this.value}.json`;
  }
}

/**
 * Create a CommandId from a string, throwing if invalid
 */
export function parseCommandId(value: string): CommandId {
  return new CommandId(value);
}

/**
 * Check if a string is a valid command ID without throwing
 */
export function isValidCommandId(value: string): boolean {
  try {
    new CommandId(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a new unique command ID
 */
export function generateCommandId(): string {
  return CommandId.generate().value;
}
