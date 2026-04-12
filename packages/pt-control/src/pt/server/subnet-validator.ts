// ============================================================================
// SubnetValidator - Valida configuración de subredes DHCP
// ============================================================================

import type { DhcpPoolConfig, SubnetValidationResult } from './dhcp-appliance-types.js';

/**
 * SubnetValidator - valida rangos DHCP y configuración de subred
 */
export class SubnetValidator {
  /**
   * Validar configuración completa de pool
   */
  validatePoolConfig(config: DhcpPoolConfig): SubnetValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar IP range
    const rangeResult = this.validateRange(config.startIp, config.endIp, config.mask);
    errors.push(...rangeResult.errors);
    warnings.push(...rangeResult.warnings);

    // Validar gateway
    const gatewayResult = this.validateGateway(config.defaultRouter, config.network, config.mask);
    errors.push(...gatewayResult.errors);
    warnings.push(...gatewayResult.warnings);

    // Validar network match
    if (rangeResult.network && gatewayResult.network) {
      if (rangeResult.network !== gatewayResult.network) {
        errors.push(`Network mismatch: rango belongs to ${rangeResult.network}, gateway is in ${gatewayResult.network}`);
      }
    }

    // Validar DNS (opcional)
    if (config.dnsServer) {
      const dnsValid = this.isValidIp(config.dnsServer);
      if (!dnsValid) {
        errors.push(`DNS server IP inválido: ${config.dnsServer}`);
      }
    }

    // Warnings de buenas prácticas
    if (config.maxUsers && config.maxUsers > 254) {
      warnings.push('maxUsers > 254 puede causar problemas de rendimiento');
    }

    // Calcular utilización sugerida
    if (rangeResult.usableCount) {
      const maxSuggested = Math.floor(rangeResult.usableCount * 0.8);
      if (config.maxUsers && config.maxUsers > maxSuggested) {
        warnings.push(`maxUsers debería ser <= ${maxSuggested} para dejar espacio (80% de ${rangeResult.usableCount})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validar rango IP
   */
  validateRange(startIp: string, endIp: string, mask: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    network?: string;
    usableCount?: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar IPs
    if (!this.isValidIp(startIp)) {
      errors.push(`Start IP inválida: ${startIp}`);
    }
    if (!this.isValidIp(endIp)) {
      errors.push(`End IP inválida: ${endIp}`);
    }
    if (!this.isValidMask(mask)) {
      errors.push(`Máscara inválida: ${mask}`);
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Comparar IPs
    const startNum = this.ipToNumber(startIp);
    const endNum = this.ipToNumber(endIp);

    if (startNum > endNum) {
      errors.push('Start IP debe ser menor que End IP');
    }

    // Calcular network y usable
    const maskNum = this.ipToNumber(mask);
    const networkNum = startNum & maskNum;
    const network = this.numberToIp(networkNum);
    const usableCount = (endNum - startNum) + 1;

    // Validar que IPs están en la misma subred
    const startNetwork = startNum & maskNum;
    const endNetwork = endNum & maskNum;
    if (startNetwork !== endNetwork) {
      errors.push('Start y End IP deben estar en la misma subred');
    }

    // Warning si rango es muy pequeño
    if (usableCount < 5) {
      warnings.push('Rango muy pequeño (< 5 IPs), considera ampliar');
    }

    // Warning si rango es muy grande
    if (usableCount > 200) {
      warnings.push('Rango muy grande (> 200 IPs), considera reducir');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      network,
      usableCount,
    };
  }

  /**
   * Validar gateway
   */
  validateGateway(gateway: string, network: string, mask: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    network?: string;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.isValidIp(gateway)) {
      errors.push(`Gateway IP inválida: ${gateway}`);
      return { valid: false, errors, warnings };
    }

    if (!this.isValidIp(network) || !this.isValidMask(mask)) {
      errors.push('Network o mask inválidos para validación de gateway');
      return { valid: false, errors, warnings };
    }

    const gatewayNum = this.ipToNumber(gateway);
    const networkNum = this.ipToNumber(network);
    const maskNum = this.ipToNumber(mask);

    // Gateway debe estar en la subred
    const gatewayNetwork = gatewayNum & maskNum;
    if (gatewayNetwork !== networkNum) {
      errors.push(`Gateway ${gateway} no está en la red ${network}/${mask}`);
    }

    // Warning si gateway es la primera IP del rango (común pero no ideal)
    const firstIp = networkNum + 1;
    if (gatewayNum === firstIp) {
      warnings.push('Gateway es la primera IP de la subred (común pero considera IPs separadas para servicios)');
    }

    // Warning si gateway es broadcast
    const broadcast = networkNum | (~maskNum >>> 0);
    if (gatewayNum === broadcast) {
      errors.push('Gateway no puede ser la dirección de broadcast');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      network: this.numberToIp(gatewayNetwork),
    };
  }

  /**
   * Sugerir rango óptimo basado en subred
   */
  suggestOptimalRange(network: string, mask: string, prefixSize: number = 25): {
    startIp: string;
    endIp: string;
    suggested: boolean;
  } {
    const networkNum = this.ipToNumber(network);
    const maskNum = this.ipToNumber(mask);

    // Calcular rango según prefix
    const hostBits = 32 - prefixSize;
    const totalIPs = Math.pow(2, hostBits);

    // Dejar espacio para gateway (primera) y algunos reservados
    const startNum = networkNum + 10; // Empezar en .10
    const endNum = networkNum + Math.min(totalIPs - 1, 50); // Máximo 50 IPs

    return {
      startIp: this.numberToIp(startNum),
      endIp: this.numberToIp(endNum),
      suggested: true,
    };
  }

  /**
   * Verificar si una IP es válida
   */
  isValidIp(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    
    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) return false;
    }
    return true;
  }

  /**
   * Verificar si una máscara es válida
   */
  isValidMask(mask: string): boolean {
    if (!this.isValidIp(mask)) return false;
    
    const maskNum = this.ipToNumber(mask);
    // Máscara válida debe ser una secuencia de 1s seguida de 0s
    // Encontrar primer 0 y verificar que el resto son 0s
    const binary = maskNum.toString(2).padStart(32, '0');
    const firstZero = binary.indexOf('0');
    if (firstZero === -1) return true; // 255.255.255.255 es válido
    
    const afterFirstZero = binary.substring(firstZero);
    if (afterFirstZero.includes('1')) return false;
    
    return true;
  }

  /**
   * Convertir IP a número
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }

  /**
   * Convertir número a IP
   */
  private numberToIp(num: number): string {
    return [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255,
    ].join('.');
  }
}