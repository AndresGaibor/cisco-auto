import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';
import { Ipv4Address } from './ipv4-address.vo.js';
import { CidrPrefix } from './cidr-prefix.vo.js';
import { SubnetMask } from './ipv4-address.vo.js';
import { WildcardMask } from './wildcard-mask.vo.js';

export class IpWithPrefix extends ValueObject<string> {
  public readonly ip: Ipv4Address;
  public readonly prefix: CidrPrefix;

  private constructor(ip: Ipv4Address, prefix: CidrPrefix) {
    super(`${ip.toString()}/${prefix.value}`);
    this.ip = ip;
    this.prefix = prefix;
  }

  static from(ip: string | Ipv4Address, prefix: number | CidrPrefix): IpWithPrefix {
    const ipv4 = ip instanceof Ipv4Address ? ip : new Ipv4Address(ip);
    const cidr = prefix instanceof CidrPrefix ? prefix : new CidrPrefix(prefix);
    return new IpWithPrefix(ipv4, cidr);
  }

  static fromCidrNotation(cidrNotation: string): IpWithPrefix {
    return parseIpWithPrefix(cidrNotation);
  }

  static fromIpAndMask(ip: string, mask: string | SubnetMask): IpWithPrefix {
    const ipv4 = new Ipv4Address(ip);
    const subnetMask = mask instanceof SubnetMask ? mask : new SubnetMask(mask);
    return IpWithPrefix.from(ipv4, subnetMask.cidrPrefix.value);
  }

  static tryFrom(value: string): IpWithPrefix | null {
    try {
      return IpWithPrefix.fromCidrNotation(value);
    } catch {
      return null;
    }
  }

  static isValid(value: string): boolean {
    return IpWithPrefix.tryFrom(value) !== null;
  }

  get networkAddress(): Ipv4Address {
    const ipInt = this.ip.toInt();
    const maskInt = (~0 << (32 - this.prefix.value)) >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;

    return new Ipv4Address(
      `${(networkInt >>> 24) & 255}.${(networkInt >>> 16) & 255}.${(networkInt >>> 8) & 255}.${networkInt & 255}`
    );
  }

  get broadcastAddress(): Ipv4Address {
    const networkInt = this.networkAddress.toInt();
    const hostBits = 32 - this.prefix.value;
    const broadcastInt = networkInt | ((1 << hostBits) - 1);

    return new Ipv4Address(
      `${(broadcastInt >>> 24) & 255}.${(broadcastInt >>> 16) & 255}.${(broadcastInt >>> 8) & 255}.${broadcastInt & 255}`
    );
  }

  get firstUsableHost(): Ipv4Address | null {
    if (this.prefix.value >= 31) return null;
    const networkInt = this.networkAddress.toInt();
    const firstHostInt = (networkInt + 1) >>> 0;

    return new Ipv4Address(
      `${(firstHostInt >>> 24) & 255}.${(firstHostInt >>> 16) & 255}.${(firstHostInt >>> 8) & 255}.${firstHostInt & 255}`
    );
  }

  get lastUsableHost(): Ipv4Address | null {
    if (this.prefix.value >= 31) return null;
    const broadcastInt = this.broadcastAddress.toInt();
    const lastHostInt = (broadcastInt - 1) >>> 0;

    return new Ipv4Address(
      `${(lastHostInt >>> 24) & 255}.${(lastHostInt >>> 16) & 255}.${(lastHostInt >>> 8) & 255}.${lastHostInt & 255}`
    );
  }

  get subnetMask(): SubnetMask {
    return SubnetMask.fromCidr(this.prefix.value);
  }

  get wildcardMask(): WildcardMask {
    return WildcardMask.fromCidr(this.prefix);
  }

  get usableHosts(): number {
    return this.prefix.usableHosts;
  }

  get totalAddresses(): number {
    return this.prefix.totalAddresses;
  }

  get isDefaultRoute(): boolean {
    return this.prefix.value === 0;
  }

  get isHostRoute(): boolean {
    return this.prefix.value === 32;
  }

  get isPointToPoint(): boolean {
    return this.prefix.value === 31;
  }

  contains(ip: string | Ipv4Address): boolean {
    const ipAddr = ip instanceof Ipv4Address ? ip : new Ipv4Address(ip);
    const networkInt = this.networkAddress.toInt();
    const broadcastInt = this.broadcastAddress.toInt();
    const ipInt = ipAddr.toInt();

    return ipInt >= networkInt && ipInt <= broadcastInt;
  }

  containsNetwork(other: IpWithPrefix): boolean {
    if (this.prefix.value > other.prefix.value) {
      return false;
    }
    return (
      this.contains(other.networkAddress) &&
      this.contains(other.broadcastAddress)
    );
  }

  overlapsWith(other: IpWithPrefix): boolean {
    return this.contains(other.networkAddress) || other.contains(this.networkAddress);
  }

  toCidrNotation(): string {
    return `${this.ip.value}/${this.prefix.value}`;
  }

  toOspfFormat(): string {
    return `${this.networkAddress.value} ${this.wildcardMask.value}`;
  }

  toStaticRouteFormat(): string {
    if (this.isHostRoute) {
      return this.ip.value;
    }
    return `${this.networkAddress.value} ${this.subnetMask.value}`;
  }

  override equals(other: IpWithPrefix): boolean {
    return this.ip.equals(other.ip) && this.prefix.equals(other.prefix);
  }

  override toString(): string {
    return this.toCidrNotation();
  }

  override toJSON(): string {
    return this.toString();
  }
}

export function parseIpWithPrefix(value: string): IpWithPrefix {
  const parts = value.split('/');
  if (parts.length !== 2) {
    throw DomainError.invalidValue(
      'notación CIDR',
      value,
      'formato esperado: IP/prefijo (ej: 192.168.1.0/24)'
    );
  }

  const ip = new Ipv4Address(parts[0]!);
  const prefix = parseInt(parts[1]!, 10);

  if (isNaN(prefix)) {
    throw DomainError.invalidValue('longitud de prefijo', parts[1], 'no es un número válido');
  }

  return IpWithPrefix.from(ip, prefix);
}

export function isValidIpWithPrefix(value: string): boolean {
  try {
    parseIpWithPrefix(value);
    return true;
  } catch {
    return false;
  }
}
