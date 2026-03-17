/**
 * Domain Validation Service
 * Servicio de dominio para validaciones complejas que no pertenecen a una sola entidad
 */
import { Lab } from '../entities/lab.entity.ts';
import { Device, DeviceType } from '../entities/device.entity.ts';
import { Connection } from '../entities/connection.entity.ts';
import { IpAddress } from '../value-objects/ip-address.vo.ts';
import { CableType } from '../value-objects/cable-type.vo.ts';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'physical' | 'logical' | 'configuration';
  message: string;
  entity?: string;
  field?: string;
}

export interface ValidationWarning {
  type: 'suggestion' | 'best_practice' | 'missing';
  message: string;
  entity?: string;
  suggestion?: string;
}

export class DomainValidationService {
  /**
   * Valida un laboratorio completo
   */
  static validateLab(lab: Lab): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar IPs duplicadas
    const ipValidation = lab.validateIpConflicts();
    if (!ipValidation.valid) {
      for (const conflict of ipValidation.conflicts) {
        errors.push({
          type: 'logical',
          message: conflict
        });
      }
    }

    // Validar conexiones físicas
    const connectionValidation = lab.validateConnections();
    if (!connectionValidation.valid) {
      for (const error of connectionValidation.errors) {
        errors.push({
          type: 'physical',
          message: error
        });
      }
    }

    // Validar conectividad básica (cada dispositivo debería tener al menos una conexión)
    for (const device of lab.getDevices()) {
      const connections = lab.getConnections().filter(c => c.involvesDevice(device.getId()));
      if (connections.length === 0) {
        warnings.push({
          type: 'missing',
          entity: device.getName(),
          message: `El dispositivo ${device.getName()} no tiene conexiones`,
          suggestion: 'Conecta este dispositivo a la red'
        });
      }

      // Validar configuración IP según el tipo de dispositivo
      if (device.getType() !== 'switch' && device.getType() !== 'hub') {
        const interfaces = device.getInterfaces();
        const configuredInterfaces = interfaces.filter(i => i.ip);
        
        if (configuredInterfaces.length === 0 && connections.length > 0) {
          warnings.push({
            type: 'configuration',
            entity: device.getName(),
            message: `${device.getName()} tiene conexiones pero no tiene IPs configuradas`,
            suggestion: 'Configura al menos una interfaz con IP/máscara'
          });
        }
      }
    }

    // Validar que haya al menos un dispositivo
    if (lab.getDevices().length === 0) {
      errors.push({
        type: 'configuration',
        message: 'El laboratorio no tiene dispositivos'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valida una nueva conexión antes de agregarla
   */
  static validateNewConnection(
    lab: Lab,
    fromDeviceId: string,
    fromPort: string,
    toDeviceId: string,
    toPort: string,
    cableType: CableType
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const fromDevice = lab.getDevice(fromDeviceId);
    const toDevice = lab.getDevice(toDeviceId);

    // Validar dispositivos
    if (!fromDevice) {
      errors.push({ type: 'physical', message: 'Dispositivo origen no encontrado' });
    }
    if (!toDevice) {
      errors.push({ type: 'physical', message: 'Dispositivo destino no encontrado' });
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Validar que no se conecte a sí mismo
    if (fromDeviceId === toDeviceId) {
      errors.push({
        type: 'physical',
        message: 'No se puede conectar un dispositivo a sí mismo'
      });
    }

    // Validar puertos disponibles
    if (lab.isPortInUse(fromDeviceId, fromPort)) {
      errors.push({
        type: 'physical',
        message: `El puerto ${fromPort} de ${fromDevice!.getName()} ya está en uso`,
        entity: fromDevice!.getName(),
        field: fromPort
      });
    }
    if (lab.isPortInUse(toDeviceId, toPort)) {
      errors.push({
        type: 'physical',
        message: `El puerto ${toPort} de ${toDevice!.getName()} ya está en uso`,
        entity: toDevice!.getName(),
        field: toPort
      });
    }

    // Validar compatibilidad de cable con puertos
    const fromValidation = cableType.isCompatibleWithPort(fromPort);
    if (!fromValidation.compatible) {
      errors.push({
        type: 'physical',
        message: fromValidation.reason!,
        entity: fromDevice!.getName(),
        field: fromPort
      });
    }

    const toValidation = cableType.isCompatibleWithPort(toPort);
    if (!toValidation.compatible) {
      errors.push({
        type: 'physical',
        message: toValidation.reason!,
        entity: toDevice!.getName(),
        field: toPort
      });
    }

    // Sugerencias basadas en tipos de dispositivos
    const suggestions = lab.getCableSuggestions(fromDeviceId, toDeviceId);
    if (suggestions.length > 0 && !fromValidation.compatible) {
      warnings.push({
        type: 'suggestion',
        message: 'Sugerencias de cable para esta conexión:',
        suggestion: suggestions.join(', ')
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valida configuración IP de un dispositivo
   */
  static validateIpConfiguration(
    device: Device,
    interfaceName: string,
    ip: IpAddress,
    mask: string,
    gateway?: IpAddress
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar que la interfaz exista
    const iface = device.getInterfaces().find(i => i.name === interfaceName);
    if (!iface) {
      errors.push({
        type: 'configuration',
        entity: device.getName(),
        field: interfaceName,
        message: `La interfaz ${interfaceName} no existe en ${device.getName()}`
      });
      return { valid: false, errors, warnings };
    }

    // Validar máscara
    if (!IpAddress.isValidMask(mask)) {
      errors.push({
        type: 'logical',
        entity: device.getName(),
        field: interfaceName,
        message: `Máscara de subred inválida: ${mask}`
      });
    }

    // Validar gateway si se proporciona
    if (gateway && mask) {
      const ipNetwork = ip.getNetworkAddress(mask);
      const gwNetwork = gateway.getNetworkAddress(mask);

      if (ipNetwork !== gwNetwork) {
        errors.push({
          type: 'logical',
          entity: device.getName(),
          field: interfaceName,
          message: `El gateway ${gateway.getValue()} no está en la misma red que la IP ${ip.getValue()}/${IpAddress.maskToCidr(mask)}`
        });
      }
    }

    // Advertencia si es una IP de red o broadcast
    const cidr = IpAddress.maskToCidr(mask);
    const networkParts = ip.getNetworkAddress(mask).split('.').map(Number);
    const ipParts = ip.getValue().split('.').map(Number);
    
    // IP de red
    if (ipParts[3] === (networkParts[3] & (256 - Math.pow(2, 32 - cidr) % 256))) {
      warnings.push({
        type: 'best_practice',
        entity: device.getName(),
        field: interfaceName,
        message: `La IP ${ip.getValue()} parece ser una dirección de red`
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Obtiene sugerencias de configuración para un dispositivo
   */
  static getDeviceSuggestions(device: Device, lab: Lab): ValidationWarning[] {
    const suggestions: ValidationWarning[] = [];

    switch (device.getType()) {
      case 'router':
        // Sugerir configurar rutas si tiene múltiples interfaces
        const interfaces = device.getInterfaces();
        const configuredInterfaces = interfaces.filter(i => i.ip);
        
        if (configuredInterfaces.length > 1) {
          const hasRoutingConfigured = device.toJSON().routing !== undefined;
          if (!hasRoutingConfigured) {
            suggestions.push({
              type: 'best_practice',
              entity: device.getName(),
              message: `${device.getName()} tiene múltiples redes configuradas`,
              suggestion: 'Considera configurar rutas estáticas o un protocolo de routing (OSPF, EIGRP)'
            });
          }
        }
        break;

      case 'switch':
        // Sugerir configurar VLANs si tiene muchos puertos
        const ports = device.getPorts();
        if (ports.length > 8) {
          const vlansConfigured = (device.toJSON() as any).vlans;
          if (!vlansConfigured || vlansConfigured.length <= 1) {
            suggestions.push({
              type: 'best_practice',
              entity: device.getName(),
              message: `${device.getName()} tiene ${ports.length} puertos`,
              suggestion: 'Considera segmentar la red usando VLANs para mejorar seguridad y rendimiento'
            });
          }
        }
        break;

      case 'server':
        // Sugerir configurar servicios
        const services = (device.toJSON() as any).services;
        if (!services || services.length === 0) {
          suggestions.push({
            type: 'missing',
            entity: device.getName(),
            message: `${device.getName()} no tiene servicios configurados`,
            suggestion: 'Configura servicios como DNS, DHCP, HTTP o FTP según el propósito del servidor'
          });
        }
        break;
    }

    return suggestions;
  }
}
