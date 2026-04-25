import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const MAX_VLAN_NAME_LENGTH = 32;
const VLAN_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$|^[a-zA-Z]$/;

export class VlanName extends ValueObject<string> {
  public readonly truncated: boolean;

  private constructor(value: string, truncated: boolean) {
    super(value);
    this.truncated = truncated;
  }

  static from(value: string): VlanName {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw DomainError.invalidValue('nombre VLAN', value, 'no puede estar vacío');
    }

    const needsTruncation = trimmed.length > MAX_VLAN_NAME_LENGTH;
    const truncatedValue = trimmed.slice(0, MAX_VLAN_NAME_LENGTH);

    if (!VLAN_NAME_PATTERN.test(truncatedValue)) {
      throw DomainError.invalidValue(
        'nombre VLAN',
        truncatedValue,
        'debe comenzar con una letra y contener solo caracteres alfanuméricos, guiones o guiones bajos'
      );
    }

    return new VlanName(truncatedValue, needsTruncation);
  }

  static tryFrom(value: string): VlanName | null {
    try {
      return VlanName.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return VlanName.tryFrom(value) !== null;
  }

  static fromOptional(value: string | null | undefined): VlanName | undefined {
    if (!value || value.trim() === '') {
      return undefined;
    }
    return VlanName.from(value);
  }

  get wasTruncated(): boolean {
    return this.truncated;
  }

  get originalLength(): number {
    return this.truncated ? MAX_VLAN_NAME_LENGTH : this._value.length;
  }

  override equals(other: VlanName): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): string {
    return this._value;
  }
}

export function parseVlanName(value: string): VlanName {
  return VlanName.from(value);
}

export function parseOptionalVlanName(value: string | null | undefined): VlanName | undefined {
  return VlanName.fromOptional(value);
}

export function isValidVlanName(value: string): boolean {
  return VlanName.isValid(value);
}
