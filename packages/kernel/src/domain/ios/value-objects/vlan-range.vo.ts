import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';
import { VlanId } from './vlan-id.vo.js';

function parseVlanRangeString(rangeStr: string): number[] {
  const result: number[] = [];
  const parts = rangeStr.split(',').map((s) => s.trim());

  for (const part of parts) {
    if (!part) continue;

    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]!, 10);
      const end = parseInt(rangeMatch[2]!, 10);

      if (start > end) {
        throw DomainError.invalidValue(
          'rango VLAN',
          part,
          `el inicio (${start}) debe ser <= al final (${end})`
        );
      }

      for (let i = start; i <= end; i++) {
        result.push(i);
      }
    } else {
      const vlanId = parseInt(part, 10);
      if (isNaN(vlanId)) {
        throw DomainError.invalidValue('ID VLAN en rango', part, 'no es un número válido');
      }
      result.push(vlanId);
    }
  }

  return result;
}

export class VlanRange extends ValueObject<VlanId[]> {
  public readonly sorted: boolean;
  public readonly unique: boolean;

  private constructor(
    vlans: VlanId[],
    options: { sort?: boolean; unique?: boolean }
  ) {
    super(vlans);
    this.sorted = options.sort ?? true;
    this.unique = options.unique ?? true;
  }

  static from(
    vlans: Array<number | string | VlanId>,
    options: { sort?: boolean; unique?: boolean } = {}
  ): VlanRange {
    const { sort = true, unique = true } = options;

    if (!Array.isArray(vlans) || vlans.length === 0) {
      throw DomainError.invalidValue('VlanRange', vlans, 'requiere al menos un ID VLAN');
    }

    const vlanIds = vlans.map((v) =>
      v instanceof VlanId ? v : typeof v === 'string' ? VlanId.fromString(v) : VlanId.from(v)
    );

    let processed = vlanIds;
    if (unique) {
      const seen = new Set<number>();
      processed = vlanIds.filter((vlan) => {
        if (seen.has(vlan.value)) return false;
        seen.add(vlan.value);
        return true;
      });
    }

    if (sort) {
      processed = [...processed].sort((a, b) => a.compareTo(b));
    }

    return new VlanRange(processed, { sort, unique });
  }

  static fromString(rangeStr: string, options: { sort?: boolean; unique?: boolean } = {}): VlanRange {
    const vlanNumbers = parseVlanRangeString(rangeStr);
    return VlanRange.from(vlanNumbers, options);
  }

  static tryFrom(
    vlans: Array<number | string | VlanId> | string,
    options?: { sort?: boolean; unique?: boolean }
  ): VlanRange | null {
    try {
      return typeof vlans === 'string'
        ? VlanRange.fromString(vlans, options)
        : VlanRange.from(vlans, options);
    } catch {
      return null;
    }
  }

  static isValid(vlans: Array<number | string>): boolean {
    try {
      VlanRange.from(vlans);
      return true;
    } catch {
      return false;
    }
  }

  static isValidString(rangeStr: string): boolean {
    try {
      VlanRange.fromString(rangeStr);
      return true;
    } catch {
      return false;
    }
  }

  toNumbers(): number[] {
    return this._value.map((v) => v.value);
  }

  toCompressedString(): string {
    if (this._value.length === 0) return '';

    const numbers = this.toNumbers();
    const ranges: string[] = [];
    let start = numbers[0]!;
    let end = start;

    for (let i = 1; i < numbers.length; i++) {
      const current = numbers[i]!;
      if (current === end + 1) {
        end = current;
      } else {
        ranges.push(start === end ? String(start) : `${start}-${end}`);
        start = current;
        end = current;
      }
    }

    ranges.push(start === end ? String(start) : `${start}-${end}`);

    return ranges.join(',');
  }

  contains(vlanId: number | VlanId): boolean {
    const value = vlanId instanceof VlanId ? vlanId.value : vlanId;
    return this._value.some((v) => v.value === value);
  }

  containsAll(other: VlanRange): boolean {
    return other._value.every((v) => this.contains(v.value));
  }

  add(vlanId: number | string | VlanId): VlanRange {
    const newVlan =
      vlanId instanceof VlanId
        ? vlanId
        : typeof vlanId === 'string'
        ? VlanId.fromString(vlanId)
        : VlanId.from(vlanId);

    return VlanRange.from([...this._value, newVlan], {
      sort: this.sorted,
      unique: this.unique,
    });
  }

  remove(vlanId: number | VlanId): VlanRange {
    const value = vlanId instanceof VlanId ? vlanId.value : vlanId;
    const filtered = this._value.filter((v) => v.value !== value);

    if (filtered.length === 0) {
      throw DomainError.notAllowed('remover VLAN', 'no se pueden eliminar todas las VLANs del VlanRange');
    }

    return VlanRange.from(filtered, {
      sort: this.sorted,
      unique: this.unique,
    });
  }

  get size(): number {
    return this._value.length;
  }

  get min(): number {
    return this._value[0]?.value ?? 0;
  }

  get max(): number {
    return this._value[this._value.length - 1]?.value ?? 0;
  }

  override equals(other: VlanRange): boolean {
    if (this._value.length !== other._value.length) return false;
    return this._value.every((v, i) => v.equals(other._value[i]!));
  }

  override toString(): string {
    return this.toNumbers().join(',');
  }

  override toJSON(): number[] {
    return this.toNumbers();
  }

  *[Symbol.iterator](): Iterator<VlanId> {
    for (const vlan of this._value) {
      yield vlan;
    }
  }
}

export function parseVlanRange(
  vlans: Array<number | string | VlanId> | string,
  options?: { sort?: boolean; unique?: boolean }
): VlanRange {
  return typeof vlans === 'string'
    ? VlanRange.fromString(vlans, options)
    : VlanRange.from(vlans, options);
}

export function isValidVlanRange(vlans: Array<number | string> | string): boolean {
  return typeof vlans === 'string'
    ? VlanRange.isValidString(vlans)
    : VlanRange.isValid(vlans);
}
