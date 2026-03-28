/**
 * Value Object: IpAddress
 * Representa una dirección IP válida con validación de formato
 */
export class IpAddress {
  private constructor(private readonly value: string) {}

  static create(ip: string): IpAddress {
    if (!IpAddress.isValid(ip)) {
      throw new Error(`Dirección IP inválida: ${ip}`);
    }
    return new IpAddress(ip);
  }

  static isValid(ip: string): boolean {
    const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
  }

  getValue(): string {
    return this.value;
  }

  /**
   * Obtiene la dirección de red dada una máscara
   */
  getNetworkAddress(mask: string): string {
    const ipParts = this.value.split('.').map(Number);
    const maskParts = mask.split('.').map(Number);
    
    const networkParts = ipParts.map((part, i) => part & maskParts[i]);
    return networkParts.join('.');
  }

  /**
   * Convierte la IP a formato CIDR dada una máscara
   */
  toCidr(mask: string): string {
    const cidr = IpAddress.maskToCidr(mask);
    return `${this.value}/${cidr}`;
  }

  /**
   * Convierte máscara a notación CIDR
   */
  static maskToCidr(mask: string): number {
    const parts = mask.split('.').map(Number);
    return parts.reduce((acc, part) => acc + part.toString(2).replace(/0/g, '').length, 0);
  }

  /**
   * Convierte notación CIDR a máscara
   */
  static cidrToMask(cidr: number): string {
    const mask = [];
    for (let i = 0; i < 4; i++) {
      const bits = Math.min(8, Math.max(0, cidr - i * 8));
      mask.push(256 - Math.pow(2, 8 - bits));
    }
    return mask.join('.');
  }

  /**
   * Valida si una máscara es válida
   */
  static isValidMask(mask: string): boolean {
    const parts = mask.split('.').map(Number);
    if (parts.length !== 4) return false;
    
    const binary = parts.map(p => p.toString(2).padStart(8, '0')).join('');
    return /^1*0*$/.test(binary);
  }

  equals(other: IpAddress): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
