/**
 * DEVICE SPEC VALIDATOR
 *
 * Valida especificaciones de dispositivo ANTES de generar configuración
 * Detecta errores temprano en el proceso de generación
 */

import type { DeviceSpec, InterfaceSpec, VLANSpec, RoutingSpec, OSPFSpec, EIGRPSpec, BGPSpec } from '../canonical/device.spec';
import { VlanId, VlanName } from '@cisco-auto/kernel/domain/ios/value-objects';

// Re-export types and constants for backwards compatibility
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationInfo,
} from './validator-types';

export { ValidationCodes } from './validator-types';

import type { ValidationResult, ValidationError, ValidationWarning, ValidationInfo } from './validator-types';
import { ValidationCodes } from './validator-types';
import { ValidatorHelpers } from './validator-helpers';

/**
 * Valida especificaciones de dispositivo
 */
export class DeviceSpecValidator {
  /**
   * Valida una especificación de dispositivo completa
   */
  static validate(device: DeviceSpec, allDevices?: DeviceSpec[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    // Validaciones básicas
    this.validateBasic(device, errors, warnings);

    // Validar interfaces
    this.validateInterfaces(device, errors, warnings);

    // Validar VLANs
    this.validateVLANs(device, errors, warnings);

    // Validar routing
    this.validateRouting(device, errors, warnings);

    // Validar security
    this.validateSecurity(device, errors, warnings);

    // Validar capacidades del dispositivo
    this.validateCapabilities(device, errors, warnings);

    // Validaciones de topología (si se proporcionan todos los dispositivos)
    if (allDevices && allDevices.length > 1) {
      this.validateTopology(device, allDevices, errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  /**
   * Validaciones básicas del dispositivo
   */
  private static validateBasic(
    device: DeviceSpec,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Hostname no puede estar vacío si se especifica
    if (device.hostname !== undefined && device.hostname.trim() === '') {
      errors.push({
        code: ValidationCodes.DEVICE_UNSUPPORTED_FEATURE,
        message: 'Hostname cannot be empty',
        field: 'hostname',
        severity: 'error'
      });
    }

    // Hostname no debe contener espacios
    if (device.hostname && /\s/.test(device.hostname)) {
      errors.push({
        code: ValidationCodes.DEVICE_UNSUPPORTED_FEATURE,
        message: 'Hostname cannot contain spaces',
        field: 'hostname',
        severity: 'error'
      });
    }
  }

  /**
   * Valida todas las interfaces del dispositivo
   */
  private static validateInterfaces(
    device: DeviceSpec,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!device.interfaces || device.interfaces.length === 0) {
      return;
    }

    const seenInterfaces = new Set<string>();
    const seenIPs = new Map<string, string>();

    for (const iface of device.interfaces) {
      // Validar nombre de interfaz
      if (!ValidatorHelpers.isValidInterfaceName(iface.name)) {
        errors.push({
          code: ValidationCodes.INVALID_INTERFACE_NAME,
          message: `Invalid interface name: '${iface.name}'`,
          field: `interfaces.${iface.name}`,
          severity: 'error'
        });
        continue;
      }

      // Validar que la interfaz existe en el dispositivo
      if (!ValidatorHelpers.interfaceExistsOnDevice(device, iface.name)) {
        warnings.push({
          code: ValidationCodes.INTERFACE_NOT_ON_DEVICE,
          message: `Interface '${iface.name}' may not exist on this device model`,
          field: `interfaces.${iface.name}`,
          severity: 'warning'
        });
      }

      // Validar duplicados
      if (seenInterfaces.has(iface.name)) {
        errors.push({
          code: ValidationCodes.DUPLICATE_INTERFACE,
          message: `Duplicate interface: '${iface.name}'`,
          field: `interfaces.${iface.name}`,
          severity: 'error'
        });
      }
      seenInterfaces.add(iface.name);

      // Validar IP
      if (iface.ip) {
        const ipKey = `${iface.ip}/${iface.subnetMask || iface.cidr || ''}`;
        if (seenIPs.has(ipKey)) {
          errors.push({
            code: ValidationCodes.TOPOLOGY_DUPLICATE_IP,
            message: `Duplicate IP address: ${ipKey}`,
            field: `interfaces.${iface.name}.ip`,
            severity: 'error'
          });
        }
        seenIPs.set(ipKey, iface.name);

        if (!ValidatorHelpers.isValidIP(iface.ip.split('/')[0] || '')) {
          errors.push({
            code: ValidationCodes.INVALID_IP_FORMAT,
            message: `Invalid IP format: '${iface.ip}'`,
            field: `interfaces.${iface.name}.ip`,
            severity: 'error'
          });
        }
      }

      // Validar VLAN en access ports
      if (iface.vlan) {
        const vlanValue = iface.vlan.value;
        if (vlanValue < 1 || vlanValue > 4094) {
          errors.push({
            code: ValidationCodes.INVALID_VLAN_RANGE,
            message: `VLAN ${vlanValue} out of range (1-4094)`,
            field: `interfaces.${iface.name}.vlan`,
            severity: 'error'
          });
        }
      }

      // Validar native VLAN en trunk
      if (iface.nativeVlan) {
        const nativeVlanValue = iface.nativeVlan.value;
        if (nativeVlanValue < 1 || nativeVlanValue > 4094) {
          errors.push({
            code: ValidationCodes.NATIVE_VLAN_MISMATCH,
            message: `Native VLAN ${nativeVlanValue} out of range (1-4094)`,
            field: `interfaces.${iface.name}.nativeVlan`,
            severity: 'error'
          });
        }
      }

      // Validar allowed VLANs en trunk (ya validado por VlanRange constructor)

      // Validar CIDR si se usa notación IP/CIDR
      if (iface.ip && iface.ip.includes('/')) {
        const cidrPart = iface.ip.split('/')[1];
        if (cidrPart) {
          const cidr = parseInt(cidrPart, 10);
          if (isNaN(cidr) || cidr < 0 || cidr > 32) {
            errors.push({
              code: ValidationCodes.INVALID_SUBNET_MASK,
              message: `Invalid CIDR: '${cidrPart}'. Must be 0-32`,
              field: `interfaces.${iface.name}.ip`,
              severity: 'error'
            });
          }
        }
      }
    }
  }

  /**
   * Valida VLANs del dispositivo
   */
  private static validateVLANs(
    device: DeviceSpec,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!device.vlans || device.vlans.length === 0) {
      return;
    }

    const seenVlans = new Set<number>();

    for (const vlan of device.vlans) {
      const vlanIdValue = vlan.id.value;

      // Validar ID de VLAN (ya validado por VlanId constructor, pero chequeamos por seguridad)
      if (vlanIdValue < 1 || vlanIdValue > 4094) {
        errors.push({
          code: ValidationCodes.VLAN_INVALID_ID,
          message: `VLAN ID ${vlanIdValue} out of range (1-4094)`,
          field: `vlans.${vlanIdValue}`,
          severity: 'error'
        });
      }

      // VLAN 1 es reservada
      if (vlanIdValue === 1) {
        warnings.push({
          code: ValidationCodes.VLAN_INVALID_ID,
          message: 'VLAN 1 is the default VLAN. Consider using a different VLAN ID',
          field: `vlans.${vlanIdValue}`,
          severity: 'warning'
        });
      }

      // Validar duplicados
      if (seenVlans.has(vlanIdValue)) {
        errors.push({
          code: ValidationCodes.VLAN_DUPLICATE,
          message: `Duplicate VLAN ID: ${vlanIdValue}`,
          field: `vlans.${vlanIdValue}`,
          severity: 'error'
        });
      }
      seenVlans.add(vlanIdValue);

      // Validar nombre de VLAN (ya validado por VlanName constructor)
      if (vlan.name && vlan.name.value.length > 32) {
        warnings.push({
          code: ValidationCodes.VLAN_INVALID_NAME,
          message: `VLAN name '${vlan.name.value}' exceeds 32 characters. It will be truncated`,
          field: `vlans.${vlanIdValue}.name`,
          severity: 'warning'
        });
      }
    }

    // Validar límite de VLANs del dispositivo
    const maxVlans = ValidatorHelpers.getMaxVlansForDevice(device);
    if (device.vlans.length > maxVlans) {
      errors.push({
        code: ValidationCodes.VLAN_RANGE_EXCEEDED,
        message: `Device supports maximum ${maxVlans} VLANs, but ${device.vlans.length} defined`,
        field: 'vlans',
        severity: 'error'
      });
    }
  }

  /**
   * Valida configuración de routing
   */
  private static validateRouting(
    device: DeviceSpec,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!device.routing) {
      return;
    }

    // Validar OSPF
    if (device.routing.ospf) {
      this.validateOSPF(device, device.routing.ospf, errors, warnings);
    }

    // Validar EIGRP
    if (device.routing.eigrp) {
      this.validateEIGRP(device, device.routing.eigrp, errors, warnings);
    }

    // Validar BGP
    if (device.routing.bgp) {
      this.validateBGP(device, device.routing.bgp, errors, warnings);
    }
  }

  /**
   * Valida configuración OSPF
   */
  private static validateOSPF(
    device: DeviceSpec,
    ospf: OSPFSpec,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validar router ID
    if (ospf.routerId && !ValidatorHelpers.isValidIP(ospf.routerId)) {
      errors.push({
        code: ValidationCodes.ROUTER_ID_INVALID,
        message: `Invalid OSPF router-id: '${ospf.routerId}'`,
        field: 'routing.ospf.routerId',
        severity: 'error'
      });
    }

    // Validar áreas
    for (const area of ospf.areas) {
      // Área ID puede ser número o IP
      if (!/^\d+$/.test(area.areaId) && !ValidatorHelpers.isValidIP(area.areaId)) {
        errors.push({
          code: ValidationCodes.OSPF_AREA_INVALID,
          message: `Invalid OSPF area ID: '${area.areaId}'`,
          field: `routing.ospf.areas.${area.areaId}`,
          severity: 'error'
        });
      }

      // Validar redes
      for (const network of area.networks) {
        if (!network.includes('/')) {
          warnings.push({
            code: ValidationCodes.OSPF_NETWORK_INVALID,
            message: `OSPF network '${network}' should be in CIDR notation (e.g., 192.168.1.0/24)`,
            field: `routing.ospf.areas.${area.areaId}.networks`,
            severity: 'warning'
          });
        }
      }
    }

    // Warning si no hay router ID explícito
    if (!ospf.routerId) {
      warnings.push({
        code: ValidationCodes.ROUTER_ID_INVALID,
        message: 'OSPF without explicit router-id. Will use highest IP address',
        field: 'routing.ospf.routerId',
        severity: 'warning'
      });
    }
  }

  /**
   * Valida configuración EIGRP
   */
  private static validateEIGRP(
    device: DeviceSpec,
    eigrp: EIGRPSpec,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validar AS number
    if (eigrp.asNumber < 1 || eigrp.asNumber > 65535) {
      errors.push({
        code: ValidationCodes.EIGRP_ASN_INVALID,
        message: `EIGRP AS number ${eigrp.asNumber} out of range (1-65535)`,
        field: 'routing.eigrp.asNumber',
        severity: 'error'
      });
    }

    // Validar router ID
    if (eigrp.routerId && !ValidatorHelpers.isValidIP(eigrp.routerId)) {
      errors.push({
        code: ValidationCodes.ROUTER_ID_INVALID,
        message: `Invalid EIGRP router-id: '${eigrp.routerId}'`,
        field: 'routing.eigrp.routerId',
        severity: 'error'
      });
    }
  }

  /**
   * Valida configuración BGP
   */
  private static validateBGP(
    device: DeviceSpec,
    bgp: BGPSpec,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validar ASN
    if (bgp.asn < 1 || bgp.asn > 4294967295) {
      errors.push({
        code: ValidationCodes.BGP_ASN_INVALID,
        message: `BGP AS number ${bgp.asn} out of range (1-4294967295)`,
        field: 'routing.bgp.asn',
        severity: 'error'
      });
    }

    // Validar router ID
    if (bgp.routerId && !ValidatorHelpers.isValidIP(bgp.routerId)) {
      errors.push({
        code: ValidationCodes.ROUTER_ID_INVALID,
        message: `Invalid BGP router-id: '${bgp.routerId}'`,
        field: 'routing.bgp.routerId',
        severity: 'error'
      });
    }
  }

  /**
   * Valida configuración de seguridad
   */
  private static validateSecurity(
    device: DeviceSpec,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!device.security) {
      return;
    }

    // Validar ACLs
    if (device.security.acls) {
      for (const acl of device.security.acls) {
        // Validar nombre/número
        if (!acl.name || acl.name.trim() === '') {
          errors.push({
            code: ValidationCodes.ACL_INVALID_NAME,
            message: 'ACL name cannot be empty',
            field: `security.acls.${acl.name || 'unnamed'}`,
            severity: 'error'
          });
        }

        // Validar reglas
        for (const rule of acl.rules) {
          if (!['permit', 'deny'].includes(rule.action)) {
            errors.push({
              code: ValidationCodes.ACL_INVALID_RULE,
              message: `Invalid ACL action: '${rule.action}'. Must be 'permit' or 'deny'`,
              field: `security.acls.${acl.name}.rules`,
              severity: 'error'
            });
          }
        }
      }
    }
  }

  /**
   * Valida capacidades del dispositivo
   */
  private static validateCapabilities(
    device: DeviceSpec,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validar límite de VLANs
    const maxVlans = ValidatorHelpers.getMaxVlansForDevice(device);
    if (device.vlans && device.vlans.length > maxVlans) {
      errors.push({
        code: ValidationCodes.DEVICE_EXCEEDS_VLAN_LIMIT,
        message: `Device supports max ${maxVlans} VLANs, but ${device.vlans.length} defined`,
        field: 'vlans',
        severity: 'error'
      });
    }
  }

  /**
   * Valida topología (múltiples dispositivos)
   */
  private static validateTopology(
    device: DeviceSpec,
    allDevices: DeviceSpec[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validar router IDs duplicados en la topología
    const routerIds = new Map<string, string>();

    for (const dev of allDevices) {
      if (dev.routing?.ospf?.routerId) {
        const existing = routerIds.get(dev.routing.ospf.routerId);
        if (existing && existing !== dev.id) {
          errors.push({
            code: ValidationCodes.ROUTER_ID_DUPLICATE,
            message: `Duplicate OSPF router-id '${dev.routing.ospf.routerId}' on devices ${existing} and ${dev.id}`,
            field: 'routing.ospf.routerId',
            severity: 'error'
          });
        }
        routerIds.set(dev.routing.ospf.routerId, dev.id);
      }
    }

    // Validar IPs duplicadas en la topología
    const allIPs = new Map<string, string>();

    for (const dev of allDevices) {
      for (const iface of dev.interfaces || []) {
        if (iface.ip) {
          const ip = iface.ip.split('/')[0] || '';
          const existing = allIPs.get(ip);
          if (existing && existing !== dev.id) {
            errors.push({
              code: ValidationCodes.TOPOLOGY_DUPLICATE_IP,
              message: `Duplicate IP address '${ip}' on devices ${existing} and ${dev.id}`,
              field: `interfaces.${iface.name}.ip`,
              severity: 'error'
            });
          }
          allIPs.set(ip, dev.id);
        }
      }
    }
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================
}

export default DeviceSpecValidator;
