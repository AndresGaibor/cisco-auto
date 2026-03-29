/**
 * DEVICE SPEC VALIDATOR
 *
 * Valida especificaciones de dispositivo ANTES de generar configuración
 * Detecta errores temprano en el proceso de generación
 */

import type { DeviceSpec, InterfaceSpec, VLANSpec, RoutingSpec, OSPFSpec, EIGRPSpec, BGPSpec } from '../canonical/device.spec';
import { switchCatalog } from '../catalog/switches';
import { routerCatalog } from '../catalog/routers';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

export interface ValidationError {
  code: string;
  message: string;
  field: string;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  message: string;
  field: string;
  severity: 'warning';
}

export interface ValidationInfo {
  code: string;
  message: string;
  field: string;
  severity: 'info';
}

/**
 * Códigos de error de validación
 */
export const ValidationCodes = {
  // Interfaces
  INVALID_INTERFACE_NAME: 'IFACE_INVALID_NAME',
  INTERFACE_NOT_ON_DEVICE: 'IFACE_NOT_ON_DEVICE',
  DUPLICATE_INTERFACE: 'IFACE_DUPLICATE',
  INVALID_IP_FORMAT: 'IFACE_INVALID_IP',
  INVALID_SUBNET_MASK: 'IFACE_INVALID_MASK',
  INVALID_VLAN_RANGE: 'IFACE_INVALID_VLAN',
  NATIVE_VLAN_MISMATCH: 'IFACE_NATIVE_VLAN_MISMATCH',
  
  // VLANs
  VLAN_INVALID_ID: 'VLAN_INVALID_ID',
  VLAN_DUPLICATE: 'VLAN_DUPLICATE',
  VLAN_INVALID_NAME: 'VLAN_INVALID_NAME',
  VLAN_RANGE_EXCEEDED: 'VLAN_RANGE_EXCEEDED',
  
  // Routing
  ROUTER_ID_INVALID: 'ROUTING_ROUTER_ID_INVALID',
  ROUTER_ID_DUPLICATE: 'ROUTING_ROUTER_ID_DUPLICATE',
  OSPF_AREA_INVALID: 'ROUTING_OSPF_AREA_INVALID',
  OSPF_NETWORK_INVALID: 'ROUTING_OSPF_NETWORK_INVALID',
  EIGRP_ASN_INVALID: 'ROUTING_EIGRP_ASN_INVALID',
  BGP_ASN_INVALID: 'ROUTING_BGP_ASN_INVALID',
  
  // Security
  ACL_INVALID_NAME: 'SECURITY_ACL_INVALID_NAME',
  ACL_INVALID_RULE: 'SECURITY_ACL_INVALID_RULE',
  
  // Device capabilities
  DEVICE_EXCEEDS_VLAN_LIMIT: 'DEVICE_VLAN_LIMIT',
  DEVICE_EXCEEDS_ACL_LIMIT: 'DEVICE_ACL_LIMIT',
  DEVICE_UNSUPPORTED_FEATURE: 'DEVICE_UNSUPPORTED_FEATURE',
  
  // Topology
  TOPOLOGY_DUPLICATE_IP: 'TOPO_DUPLICATE_IP',
  TOPOLOGY_DUPLICATE_ROUTER_ID: 'TOPO_DUPLICATE_ROUTER_ID',
} as const;

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
      if (!this.isValidInterfaceName(iface.name)) {
        errors.push({
          code: ValidationCodes.INVALID_INTERFACE_NAME,
          message: `Invalid interface name: '${iface.name}'`,
          field: `interfaces.${iface.name}`,
          severity: 'error'
        });
        continue;
      }

      // Validar que la interfaz existe en el dispositivo
      if (!this.interfaceExistsOnDevice(device, iface.name)) {
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

        if (!this.isValidIP(iface.ip.split('/')[0] || '')) {
          errors.push({
            code: ValidationCodes.INVALID_IP_FORMAT,
            message: `Invalid IP format: '${iface.ip}'`,
            field: `interfaces.${iface.name}.ip`,
            severity: 'error'
          });
        }
      }

      // Validar VLAN en access ports
      if (iface.vlan && (iface.vlan < 1 || iface.vlan > 4094)) {
        errors.push({
          code: ValidationCodes.INVALID_VLAN_RANGE,
          message: `VLAN ${iface.vlan} out of range (1-4094)`,
          field: `interfaces.${iface.name}.vlan`,
          severity: 'error'
        });
      }

      // Validar native VLAN en trunk
      if (iface.nativeVlan !== undefined && (iface.nativeVlan < 1 || iface.nativeVlan > 4094)) {
        errors.push({
          code: ValidationCodes.NATIVE_VLAN_MISMATCH,
          message: `Native VLAN ${iface.nativeVlan} out of range (1-4094)`,
          field: `interfaces.${iface.name}.nativeVlan`,
          severity: 'error'
        });
      }

      // Validar allowed VLANs en trunk
      if (iface.allowedVlans) {
        const invalidVlans = iface.allowedVlans.filter(v => v < 1 || v > 4094);
        if (invalidVlans.length > 0) {
          errors.push({
            code: ValidationCodes.INVALID_VLAN_RANGE,
            message: `Invalid VLANs in allowedVlans: ${invalidVlans.join(', ')}`,
            field: `interfaces.${iface.name}.allowedVlans`,
            severity: 'error'
          });
        }
      }

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
      // Validar ID de VLAN
      if (vlan.id < 1 || vlan.id > 4094) {
        errors.push({
          code: ValidationCodes.VLAN_INVALID_ID,
          message: `VLAN ID ${vlan.id} out of range (1-4094)`,
          field: `vlans.${vlan.id}`,
          severity: 'error'
        });
      }

      // VLAN 1 es reservada
      if (vlan.id === 1) {
        warnings.push({
          code: ValidationCodes.VLAN_INVALID_ID,
          message: 'VLAN 1 is the default VLAN. Consider using a different VLAN ID',
          field: `vlans.${vlan.id}`,
          severity: 'warning'
        });
      }

      // Validar duplicados
      if (seenVlans.has(vlan.id)) {
        errors.push({
          code: ValidationCodes.VLAN_DUPLICATE,
          message: `Duplicate VLAN ID: ${vlan.id}`,
          field: `vlans.${vlan.id}`,
          severity: 'error'
        });
      }
      seenVlans.add(vlan.id);

      // Validar nombre de VLAN
      if (vlan.name && vlan.name.length > 32) {
        warnings.push({
          code: ValidationCodes.VLAN_INVALID_NAME,
          message: `VLAN name '${vlan.name}' exceeds 32 characters. It will be truncated`,
          field: `vlans.${vlan.id}.name`,
          severity: 'warning'
        });
      }
    }

    // Validar límite de VLANs del dispositivo
    const maxVlans = this.getMaxVlansForDevice(device);
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
    if (ospf.routerId && !this.isValidIP(ospf.routerId)) {
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
      if (!/^\d+$/.test(area.areaId) && !this.isValidIP(area.areaId)) {
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
    if (eigrp.routerId && !this.isValidIP(eigrp.routerId)) {
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
    if (bgp.routerId && !this.isValidIP(bgp.routerId)) {
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
    const maxVlans = this.getMaxVlansForDevice(device);
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

  /**
   * Verifica si un nombre de interfaz es válido
   */
  private static isValidInterfaceName(name: string): boolean {
    const patterns = [
      /^FastEthernet\d+\/\d+$/i,
      /^GigabitEthernet\d+\/\d+$/i,
      /^TenGigabitEthernet\d+\/\d+$/i,
      /^Serial\d+\/\d+(\/\d+)?$/i,  // Allow Serial0/0 and Serial0/0/0
      /^Vlan\d+$/i,
      /^Port-channel\d+$/i,
      /^Loopback\d+$/i,
      /^Tunnel\d+$/i,
    ];

    return patterns.some(p => p.test(name));
  }

  /**
   * Verifica si una interfaz existe en el dispositivo
   */
  private static interfaceExistsOnDevice(device: DeviceSpec, interfaceName: string): boolean {
    // Para SVIs (VlanX) y interfaces lógicas, siempre son válidas
    if (/^(Vlan|Port-channel|Loopback|Tunnel)/i.test(interfaceName)) {
      return true;
    }

    // Buscar en catálogos
    const allPorts = this.getAllDevicePorts(device);
    const normalized = interfaceName.toLowerCase();

    // Verificar si el nombre coincide con algún puerto
    return allPorts.some(port => {
      const portName = `${port.prefix}${port.module}/${port.range[0]}`.toLowerCase();
      return normalized.startsWith(portName.substring(0, portName.lastIndexOf('/')));
    });
  }

  /**
   * Obtiene todos los puertos de un dispositivo desde el catálogo
   */
  private static getAllDevicePorts(device: DeviceSpec): Array<{ prefix: string; module: number; range: [number, number] }> {
    const ports: Array<{ prefix: string; module: number; range: [number, number] }> = [];

    // Buscar en switch catalog
    const switchEntry = switchCatalog.find(s =>
      s.model.toLowerCase() === device.model?.model?.toLowerCase() ||
      s.id.toLowerCase() === device.model?.model?.toLowerCase()
    );

    if (switchEntry) {
      for (const port of switchEntry.fixedPorts) {
        if (port.type !== 'Console') {
          ports.push({ prefix: port.prefix, module: port.module, range: port.range });
        }
      }
    }

    // Buscar en router catalog
    const routerEntry = routerCatalog.find(r =>
      r.model.toLowerCase() === device.model?.model?.toLowerCase()
    );

    if (routerEntry) {
      for (const port of routerEntry.fixedPorts) {
        if (port.type !== 'Console') {
          ports.push({ prefix: port.prefix, module: port.module, range: port.range });
        }
      }
    }

    return ports;
  }

  /**
   * Obtiene el máximo de VLANs soportadas por el dispositivo
   */
  private static getMaxVlansForDevice(device: DeviceSpec): number {
    // Default para switches L2
    let maxVlans = 255;

    // Buscar en switch catalog
    const switchEntry = switchCatalog.find(s =>
      s.model.toLowerCase() === device.model?.model?.toLowerCase()
    );

    if (switchEntry) {
      maxVlans = switchEntry.capabilities.maxVlans;
    }

    // Buscar en router catalog (routers soportan menos VLANs)
    const routerEntry = routerCatalog.find(r =>
      r.model.toLowerCase() === device.model?.model?.toLowerCase()
    );

    if (routerEntry) {
      maxVlans = routerEntry.capabilities.maxVlans;
    }

    return maxVlans;
  }

  /**
   * Verifica si una IP es válida
   */
  private static isValidIP(ip: string): boolean {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!pattern.test(ip)) return false;

    const octets = ip.split('.').map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
  }
}

export default DeviceSpecValidator;
