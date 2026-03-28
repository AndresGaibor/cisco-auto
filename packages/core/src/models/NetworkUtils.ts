/**
 * NetworkUtils.ts
 * Utilidades avanzadas para validación de direccionamiento y máscaras.
 */

export class NetworkUtils {
  /**
   * Valida si un string es una IP válida
   */
  public static isValidIp(ip: string): boolean {
    const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
  }

  /**
   * Valida si una máscara es válida (ej. 255.255.255.0)
   */
  public static isValidMask(mask: string): boolean {
    const parts = mask.split('.').map(Number);
    if (parts.length !== 4) return false;
    
    const fullMask = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    const binary = (fullMask >>> 0).toString(2);
    
    // Una máscara válida debe tener 1s seguidos de 0s
    return /^1+0*$/.test(binary);
  }

  /**
   * Convierte CIDR (24) a Máscara (255.255.255.0)
   */
  public static cidrToMask(cidr: number): string {
    if (cidr < 0 || cidr > 32) throw new Error("CIDR inválido");
    const mask = 0xffffffff << (32 - cidr);
    return [
      (mask >>> 24) & 0xff,
      (mask >>> 16) & 0xff,
      (mask >>> 8) & 0xff,
      mask & 0xff
    ].join('.');
  }

  /**
   * Convierte Máscara a CIDR
   */
  public static maskToCidr(mask: string): number {
    const parts = mask.split('.').map(Number);
    let cidr = 0;
    for (const part of parts) {
      if (part === 255) cidr += 8;
      else {
        let current = part;
        while (current > 0) {
          cidr += (current & 1);
          current >>= 1;
        }
        break;
      }
    }
    return cidr;
  }

  /**
   * Obtiene la dirección de red
   */
  public static getNetworkAddress(ip: string, mask: string): string {
    const i = ip.split('.').map(Number);
    const m = mask.split('.').map(Number);
    return i.map((byte, idx) => byte & m[idx]).join('.');
  }
}
