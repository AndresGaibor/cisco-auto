/**
 * IOS PARSERS - COMMON UTILITIES
 * 
 * Funciones helper para parsing de comandos IOS
 */

export class ParserUtils {
  /**
   * Extraer líneas válidas (no vacías, no headers)
   */
  static getValidLines(output: string, skipHeaders: boolean = true): string[] {
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (!skipHeaders || !this.isHeaderLine(line)));
  }

  static isHeaderLine(line: string): boolean {
    const headers = [
      /^Interface\s+IP-Address/i,
      /^VLAN\s+Name/i,
      /^Destination\s+Next Hop/i,
      /^Interface\s+Encapsulation/i,
      /^Device ID\s+Local Intrfce/i,
      /^Address\s+Age\s+Hardware/i,
      /^Mac Address Table/i,
      /^Port\s+Role Sts Cost\s+Prio.Nbr/i,
      /^Root ID\s+Priority Address/i,
    ];
    return headers.some(pattern => pattern.test(line));
  }

  /**
   * Convertir línea a campos por whitespace
   */
  static parseFields(line: string, count?: number): string[] {
    const fields = line.split(/\s+/);
    return count ? fields.slice(0, count) : fields;
  }

  /**
   * Extraer dirección IP
   */
  static extractIp(value: string): string | null {
    const match = value.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
    return match?.[1] ?? null;
  }

  /**
   * Extraer máscara de subred
   */
  static extractMask(value: string): string | null {
    const match = value.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
    if (!match) return null;
    const ip = match[0];
    // Si es una máscara válida (todos los 1s seguidos de 0s)
    const parts = ip.split('.').map(p => parseInt(p, 10));
    const binary = parts.map(p => p.toString(2).padStart(8, '0')).join('');
    if (/^1*0*$/.test(binary)) {
      return ip;
    }
    return null;
  }

  /**
   * Convertir estado up/down
   */
  static parseStatus(status: string): 'up' | 'down' | 'administratively down' {
    const lower = status.toLowerCase();
    if (lower === 'up') return 'up';
    if (lower.includes('admin')) return 'administratively down';
    return 'down';
  }

  /**
   * Convertir protocolo up/down
   */
  static parseProtocol(protocol: string): 'up' | 'down' {
    return protocol.toLowerCase() === 'up' ? 'up' : 'down';
  }

  /**
   * Convertir yes/no
   */
  static parseYesNo(value: string): boolean {
    return value.toLowerCase() === 'yes';
  }

  /**
   * Convertir a número seguro
   */
  static parseNumber(value: string, defaultValue: number = 0): number {
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Validar IPv4
   */
  static isValidIpv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
      const num = parseInt(p, 10);
      return num >= 0 && num <= 255;
    });
  }

  /**
   * Validar VLAN ID
   */
  static isValidVlanId(id: string): boolean {
    const num = parseInt(id, 10);
    return num >= 1 && num <= 4094;
  }

  /**
   * Normalizar nombre de interfaz
   */
  static normalizeInterfaceName(name: string): string {
    return name
      .toLowerCase()
      .replace('fastethernet', 'fa')
      .replace('gigabitethernet', 'gi')
      .replace('ethernet', 'eth')
      .replace('serial', 's')
      .replace('loopback', 'lo');
  }
}
