export class NetworkUtils {
  /**
   * Convierte CIDR a máscara de subred
   * Usa método aritmético para evitar bugs con signed 32-bit bitwise operations
   */
  public static cidrToMask(cidr: number): string {
    if (cidr < 0 || cidr > 32) {
      throw new Error(`Invalid CIDR: ${cidr}. Must be 0-32`);
    }

    // Método aritmético seguro - evita problemas con signed/unsigned bitwise
    const octets: number[] = [];
    for (let i = 0; i < 4; i++) {
      const bits = Math.max(0, Math.min(8, cidr - i * 8));
      octets.push(256 - Math.pow(2, 8 - bits));
    }

    return octets.join('.');
  }

  /**
   * Convierte CIDR a wildcard mask
   * Usa método aritmético para evitar bugs con signed 32-bit bitwise operations
   */
  public static cidrToWildcard(cidr: number): string {
    if (cidr < 0 || cidr > 32) {
      throw new Error(`Invalid CIDR: ${cidr}. Must be 0-32`);
    }

    // Wildcard es el inverso de la máscara: 255 - cada octeto de la máscara
    const octets: number[] = [];
    for (let i = 0; i < 4; i++) {
      const bits = Math.max(0, Math.min(8, cidr - i * 8));
      const maskOctet = 256 - Math.pow(2, 8 - bits);
      octets.push(255 - maskOctet);
    }

    return octets.join('.');
  }
}
