/**
 * LAB VALIDATOR - Validación avanzada de laboratorios
 * 
 * Valida:
 * - Estructura del YAML
 * - Compatibilidad de cables/puertos
 * - Conflictos de IP
 * - Consistencia de subredes
 * - Topología de red
 */

import type { LabSpec, DeviceSpec, ConnectionSpec } from '../canonical/index.ts';
import { ValidationEngine } from '../models/ValidationEngine.ts';

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'structure' | 'physical' | 'logical' | 'topology' | 'best-practice';
  message: string;
  device?: string;
  connection?: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export class LabValidator {
  private issues: ValidationIssue[] = [];

  /**
   * Valida un laboratorio completo
   */
  validate(lab: LabSpec): ValidationResult {
    this.issues = [];

    // 1. Validar estructura
    this.validateStructure(lab);

    // 2. Validar dispositivos
    this.validateDevices(lab.devices);

    // 3. Validar conexiones
    this.validateConnections(lab.connections, lab.devices);

    // 4. Validar topología
    this.validateTopology(lab);

    // 5. Validar conflictos de IP
    this.validateIPConflicts(lab.devices);

    // 6. Validar mejores prácticas
    this.validateBestPractices(lab);

    return {
      valid: !this.issues.some(i => i.severity === 'error'),
      issues: this.issues,
      summary: {
        errors: this.issues.filter(i => i.severity === 'error').length,
        warnings: this.issues.filter(i => i.severity === 'warning').length,
        info: this.issues.filter(i => i.severity === 'info').length
      }
    };
  }

  /**
   * Validaciones de estructura
   */
  private validateStructure(lab: LabSpec): void {
    if (!lab.metadata?.name) {
      this.addError('structure', 'Lab name is required');
    }

    if (!lab.devices || lab.devices.length === 0) {
      this.addError('structure', 'Lab must have at least one device');
    }
  }

  /**
   * Validaciones de dispositivos
   */
  private validateDevices(devices: DeviceSpec[]): void {
    const names = new Set<string>();

    for (const device of devices) {
      // Nombre duplicado
      if (names.has(device.name)) {
        this.addError('structure', `Duplicate device name: ${device.name}`, device.name);
      }
      names.add(device.name);

      // Validar hostname
      if (device.hostname && !/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(device.hostname)) {
        this.addWarning('best-practice', 
          `Invalid hostname format: ${device.hostname}`,
          device.name,
          'Hostnames should start with a letter and contain only alphanumeric, underscore, or hyphen'
        );
      }

      // Validar interfaces
      if (device.interfaces) {
        const ifaceNames = new Set<string>();
        for (const iface of device.interfaces) {
          // Nombre duplicado
          if (ifaceNames.has(iface.name)) {
            this.addError('structure', 
              `Duplicate interface name: ${iface.name}`,
              device.name
            );
          }
          ifaceNames.add(iface.name);

          // Validar IP si existe
          if (iface.ipAddress) {
            this.validateIPFormat(iface.ipAddress, device.name, iface.name);
          }
        }
      }
    }
  }

  /**
   * Validaciones de conexiones
   */
  private validateConnections(connections: ConnectionSpec[], devices: DeviceSpec[]): void {
    const deviceMap = new Map(devices.map(d => [d.name, d]));

    for (const conn of connections) {
      const fromDevice = deviceMap.get(conn.from.deviceName);
      const toDevice = deviceMap.get(conn.to.deviceName);

      // Verificar que los dispositivos existen
      if (!fromDevice) {
        this.addError('topology', 
          `Connection references non-existent device: ${conn.from.deviceName}`,
          undefined,
          `${conn.from.deviceName} -> ${conn.to.deviceName}`
        );
        continue;
      }
      if (!toDevice) {
        this.addError('topology', 
          `Connection references non-existent device: ${conn.to.deviceName}`,
          undefined,
          `${conn.from.deviceName} -> ${conn.to.deviceName}`
        );
        continue;
      }

      // Validar cable/puerto
      try {
        ValidationEngine.validateCableCompatibility(
          conn.from.portName,
          conn.cableType as any
        );
      } catch (e: any) {
        this.addError('physical', e.message, conn.from.deviceName);
      }

      try {
        ValidationEngine.validateCableCompatibility(
          conn.to.portName,
          conn.cableType as any
        );
      } catch (e: any) {
        this.addError('physical', e.message, conn.to.deviceName);
      }
    }
  }

  /**
   * Validaciones de topología
   */
  private validateTopology(lab: LabSpec): void {
    // Verificar que todos los dispositivos están conectados
    const connectedDevices = new Set<string>();
    for (const conn of lab.connections) {
      connectedDevices.add(conn.from.deviceName);
      connectedDevices.add(conn.to.deviceName);
    }

    for (const device of lab.devices) {
      if (!connectedDevices.has(device.name) && lab.devices.length > 1) {
        this.addWarning('topology', 
          `Device is not connected to any other device`,
          device.name
        );
      }
    }

    // Detectar bucles (básico)
    const visited = new Set<string>();
    const findLoop = (device: string, parent: string | null, path: string[]): boolean => {
      if (visited.has(device)) {
        this.addWarning('topology', 
          `Potential network loop detected: ${path.join(' -> ')} -> ${device}`,
          device
        );
        return true;
      }
      
      visited.add(device);
      
      const neighbors = lab.connections
        .filter(c => c.from.deviceName === device || c.to.deviceName === device)
        .map(c => c.from.deviceName === device ? c.to.deviceName : c.from.deviceName);
      
      for (const neighbor of neighbors) {
        if (neighbor !== parent) {
          if (findLoop(neighbor, device, [...path, device])) {
            return true;
          }
        }
      }
      
      visited.delete(device);
      return false;
    };

    if (lab.devices.length > 0) {
      findLoop(lab.devices[0].name, null, []);
    }
  }

  /**
   * Validar conflictos de IP
   */
  private validateIPConflicts(devices: DeviceSpec[]): void {
    const ipMap = new Map<string, string>(); // IP -> device name

    for (const device of devices) {
      if (!device.interfaces) continue;

      for (const iface of device.interfaces) {
        if (!iface.ipAddress) continue;

        const [ip] = iface.ipAddress.split('/');
        
        if (ipMap.has(ip)) {
          this.addError('logical', 
            `IP address conflict: ${ip} is used by ${ipMap.get(ip)} and ${device.name}`,
            device.name,
            undefined,
            `Change IP on one of the devices`
          );
        } else {
          ipMap.set(ip, device.name);
        }
      }
    }
  }

  /**
   * Validar mejores prácticas
   */
  private validateBestPractices(lab: LabSpec): void {
    // Verificar si hay dispositivos de capa de distribución sin redundancia
    const routers = lab.devices.filter(d => d.type === 'router' || d.type === 'multilayer-switch');
    const switches = lab.devices.filter(d => d.type === 'switch');

    // Sugerir VLANs si hay switch sin configuración
    for (const sw of switches) {
      const hasVlanConfig = sw.interfaces?.some(i => i.switchport?.accessVlan || i.switchport?.trunkVlans);
      if (!hasVlanConfig && lab.devices.length > 3) {
        this.addInfo('best-practice',
          `Switch has no VLAN configuration`,
          sw.name,
          undefined,
          'Consider adding VLAN configuration for better network segmentation'
        );
      }
    }

    // Verificar encriptación de passwords
    for (const device of lab.devices) {
      if (device.security?.enableSecret && !device.security.enableSecret.startsWith('$')) {
        this.addWarning('best-practice',
          `Enable secret should use encrypted format`,
          device.name
        );
      }
    }
  }

  /**
   * Validar formato de IP
   */
  private validateIPFormat(ipWithCidr: string, device: string, iface: string): void {
    const [ip, cidrStr] = ipWithCidr.split('/');
    
    // Validar formato IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      this.addError('logical', `Invalid IP format: ${ip}`, device);
      return;
    }

    // Validar octetos
    const octets = ip.split('.').map(Number);
    if (octets.some(o => o < 0 || o > 255)) {
      this.addError('logical', `Invalid IP octets: ${ip}`, device);
    }

    // Validar CIDR
    if (cidrStr) {
      const cidr = parseInt(cidrStr);
      if (isNaN(cidr) || cidr < 0 || cidr > 32) {
        this.addError('logical', `Invalid CIDR: ${cidrStr}`, device);
      }
    } else {
      this.addWarning('best-practice',
        `IP without CIDR notation: ${ipWithCidr}`,
        device,
        undefined,
        'Add CIDR notation (e.g., /24) for clarity'
      );
    }
  }

  private addError(category: ValidationIssue['category'], message: string, device?: string, connection?: string, suggestion?: string): void {
    this.issues.push({ severity: 'error', category, message, device, connection, suggestion });
  }

  private addWarning(category: ValidationIssue['category'], message: string, device?: string, connection?: string, suggestion?: string): void {
    this.issues.push({ severity: 'warning', category, message, device, connection, suggestion });
  }

  private addInfo(category: ValidationIssue['category'], message: string, device?: string, connection?: string, suggestion?: string): void {
    this.issues.push({ severity: 'info', category, message, device, connection, suggestion });
  }
}

/**
 * Función de conveniencia
 */
export function validateLab(lab: LabSpec): ValidationResult {
  return new LabValidator().validate(lab);
}
