import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

const PORT_NAME_PATTERN = /^(Ethernet|FastEthernet|GigabitEthernet|TenGigabitEthernet|FortyGigE|HundredGigE|Serial|Loopback|Vlan|Port-channel|Tunnel|NVI|Null|Dialer|Dot11Radio|Cellular|Async|BRIO|POS|ATM|Virtual-PPP|Tunnel|Wlan-GigabitEthernet)(\d+)(\/(\d+))?(\/(\d+))?(\.(\d+))?(:(\d+))?$/i;

export class PortName extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static from(value: string): PortName {
    const trimmed = value.trim();
    const formatted = PortName.normalizeFormat(trimmed);

    if (!PORT_NAME_PATTERN.test(formatted)) {
      throw DomainError.invalidValue(
        'nombre de puerto',
        value,
        'debe seguir la convención de nomenclatura IOS (ej: GigabitEthernet0/0, FastEthernet0/1/0, Loopback0)'
      );
    }
    return new PortName(formatted);
  }

  static tryFrom(value: string): PortName | null {
    try {
      return PortName.from(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return PortName.tryFrom(value) !== null;
  }

  private static normalizeFormat(value: string): string {
    return value.replace(/^[a-z]+|[A-Z][a-z]*\d*/gi, (match) => {
      const letters = match.replace(/\d/g, '');
      const numbers = match.replace(/[a-zA-Z]/g, '');
      return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase() + numbers;
    });
  }

  get type(): string {
    const match = this._value.match(/^[a-zA-Z-]+/);
    return match ? match[0] : '';
  }

  get slot(): number | null {
    const match = this._value.match(/\/(\d+)/);
    return match ? parseInt(match[1]!, 10) : null;
  }

  get port(): number | null {
    const parts = this._value.split('/');
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1]?.split('.')[0]?.split(':')[0] ?? '0';
      return parseInt(lastPart, 10);
    }
    return null;
  }

  get isPhysical(): boolean {
    const physicalTypes = ['Ethernet', 'FastEthernet', 'GigabitEthernet', 'TenGigabitEthernet', 'Serial'];
    return physicalTypes.some(t => this.type.toLowerCase().includes(t.toLowerCase()));
  }

  get isLogical(): boolean {
    const logicalTypes = ['Loopback', 'Vlan', 'Port-channel', 'Tunnel', 'NVI'];
    return logicalTypes.some(t => this.type.toLowerCase() === t.toLowerCase());
  }

  get isSubinterface(): boolean {
    return this._value.includes('.');
  }

  get parent(): PortName | null {
    if (!this.isSubinterface) return null;
    const parentName = this._value.split('.')[0];
    try {
      return PortName.from(parentName!);
    } catch {
      return null;
    }
  }

  toInterfaceCommand(): string {
    return `interface ${this._value}`;
  }

  toDescriptionCommand(description: string): string {
    return `description ${description}`;
  }

  override equals(other: PortName): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): string {
    return this._value;
  }
}

export function parsePortName(value: string): PortName {
  return PortName.from(value);
}

export function isValidPortName(value: string): boolean {
  return PortName.isValid(value);
}
