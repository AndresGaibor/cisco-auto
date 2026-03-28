export class NetworkUtils {
  /**
   * Convierte CIDR a máscara de subred
   */
  public static cidrToMask(cidr: number): string {
    const mask = 0xffffffff << (32 - cidr);
    return [
      (mask >>> 24) & 0xff,
      (mask >>> 16) & 0xff,
      (mask >>> 8) & 0xff,
      mask & 0xff
    ].join('.');
  }

  /**
   * Convierte CIDR a wildcard mask
   */
  public static cidrToWildcard(cidr: number): string {
    const mask = ~(0xffffffff << (32 - cidr)) & 0xffffffff;
    return [
      (mask >>> 24) & 0xff,
      (mask >>> 16) & 0xff,
      (mask >>> 8) & 0xff,
      mask & 0xff
    ].join('.');
  }
}
