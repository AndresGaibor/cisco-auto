/**
 * PORT TEMPLATE GENERATOR
 *
 * Genera configuraciones de puertos predeterminadas basadas en el modelo de switch
 * Proporciona templates para diferentes escenarios de uso
 */

import type { InterfaceSpec } from '../canonical/device.spec';
import type { SwitchportMode } from '../canonical/types';
import { deviceCatalog, DeviceHardwareProfile } from '../catalog';

/**
 * Tipo de puerto para template
 */
export type PortTemplateType =
  | 'access'           // Puerto access para VLAN única
  | 'trunk'            // Puerto trunk para múltiples VLANs
  | 'voice'            // Puerto con VLAN de voz
  | 'guest'            // Puerto para invitados (VLAN aislada)
  | 'management'       // Puerto de gestión
  | 'server'           // Puerto para servidor
  | 'uplink'           // Puerto de uplink
  | 'shutdown';        // Puerto apagado por seguridad

/**
 * Configuración de template de puerto
 */
export interface PortTemplate {
  type: PortTemplateType;
  description?: string;
  vlan?: number;
  nativeVlan?: number;
  allowedVlans?: number[];
  voiceVlan?: number;
  shutdown?: boolean;
  speed?: 'auto' | '10' | '100' | '1000';
  duplex?: 'auto' | 'full' | 'half';
  stpPortfast?: boolean;
  stpBpduguard?: boolean;
  portSecurity?: boolean;
  maxMacAddresses?: number;
}

/**
 * Templates predeterminados por tipo de puerto
 */
export const defaultPortTemplates: Record<PortTemplateType, PortTemplate> = {
  access: {
    type: 'access',
    description: 'Access port',
    vlan: 1,
    speed: 'auto',
    duplex: 'auto',
    stpPortfast: true,
    stpBpduguard: true
  },
  trunk: {
    type: 'trunk',
    description: 'Trunk port',
    nativeVlan: 1,
    allowedVlans: [1],
    speed: 'auto',
    duplex: 'auto'
  },
  voice: {
    type: 'voice',
    description: 'Voice port with IP phone',
    vlan: 10,
    voiceVlan: 100,
    speed: 'auto',
    duplex: 'auto',
    stpPortfast: true,
    stpBpduguard: true
  },
  guest: {
    type: 'guest',
    description: 'Guest network port',
    vlan: 99,
    speed: 'auto',
    duplex: 'auto',
    stpPortfast: true,
    stpBpduguard: true,
    portSecurity: true,
    maxMacAddresses: 1
  },
  management: {
    type: 'management',
    description: 'Management port',
    vlan: 999,
    speed: '100',
    duplex: 'full',
    stpPortfast: false
  },
  server: {
    type: 'server',
    description: 'Server port',
    vlan: 10,
    speed: '1000',
    duplex: 'full',
    stpPortfast: true,
    stpBpduguard: true,
    portSecurity: true,
    maxMacAddresses: 1
  },
  uplink: {
    type: 'uplink',
    description: 'Uplink to core/distribution',
    nativeVlan: 1,
    allowedVlans: [1],
    speed: '1000',
    duplex: 'full'
  },
  shutdown: {
    type: 'shutdown',
    description: 'Unused port - disabled',
    vlan: 999,
    shutdown: true,
    speed: 'auto',
    duplex: 'auto'
  }
};

/**
 * Genera configuración IOS para un template de puerto
 */
export class PortTemplateGenerator {
  /**
   * Genera configuración de interfaz para un puerto con template
   */
  static generateInterfaceConfig(
    interfaceName: string,
    template: PortTemplate
  ): string[] {
    const commands: string[] = [];

    commands.push(`interface ${interfaceName}`);

    // Descripción
    if (template.description) {
      commands.push(` description ${template.description}`);
    }

    // Modo switchport
    if (template.type === 'trunk' || template.type === 'uplink') {
      commands.push(' switchport mode trunk');

      // VLAN nativa
      if (template.nativeVlan) {
        commands.push(` switchport trunk native vlan ${template.nativeVlan}`);
      }

      // VLANs permitidas
      if (template.allowedVlans && template.allowedVlans.length > 0) {
        commands.push(` switchport trunk allowed vlan ${template.allowedVlans.join(',')}`);
      }
    } else {
      commands.push(' switchport mode access');

      // VLAN de acceso
      if (template.vlan) {
        commands.push(` switchport access vlan ${template.vlan}`);
      }

      // VLAN de voz
      if (template.voiceVlan) {
        commands.push(` switchport voice vlan ${template.voiceVlan}`);
      }
    }

    // Velocidad y dúplex
    if (template.speed) {
      commands.push(` speed ${template.speed}`);
    }
    if (template.duplex) {
      commands.push(` duplex ${template.duplex}`);
    }

    // STP PortFast
    if (template.stpPortfast) {
      commands.push(' spanning-tree portfast');
    }

    // STP BPDU Guard
    if (template.stpBpduguard) {
      commands.push(' spanning-tree bpduguard enable');
    }

    // Port Security
    if (template.portSecurity) {
      commands.push(' switchport port-security');
      if (template.maxMacAddresses) {
        commands.push(` switchport port-security maximum ${template.maxMacAddresses}`);
      }
      commands.push(' switchport port-security violation shutdown');
      commands.push(' switchport port-security aging time 2');
    }

    // Shutdown
    if (template.shutdown) {
      commands.push(' shutdown');
    } else {
      commands.push(' no shutdown');
    }

    commands.push(' exit');

    return commands;
  }

  /**
   * Aplica template a múltiples puertos
   */
  static applyTemplate(
    interfaces: string[],
    template: PortTemplate
  ): string[] {
    const commands: string[] = [];

    for (const iface of interfaces) {
      commands.push(...this.generateInterfaceConfig(iface, template));
    }

    return commands;
  }

  /**
   * Genera configuración para puertos no utilizados (shutdown)
   */
  static generateUnusedPortsConfig(interfaceNames: string[]): string[] {
    return this.applyTemplate(interfaceNames, defaultPortTemplates.shutdown);
  }

  /**
   * Obtiene puertos disponibles de un modelo de switch
   */
  static getPortsByModel(model: string): {
    fastEthernet: string[];
    gigabitEthernet: string[];
    sfp: string[];
    all: string[];
  } {
    const switchEntry = deviceCatalog.getByModel(model);

    if (!switchEntry) {
      return { fastEthernet: [], gigabitEthernet: [], sfp: [], all: [] };
    }

    const hardware = DeviceHardwareProfile.fromCatalogEntry(switchEntry);

    const result = {
      fastEthernet: [] as string[],
      gigabitEthernet: [] as string[],
      sfp: [] as string[],
      all: [] as string[]
    };

    for (const port of hardware.ports) {
      if (port.value.type === 'Console') continue;

      for (const portName of port.names) {
        result.all.push(portName);

        if (port.value.type === 'FastEthernet') {
          result.fastEthernet.push(portName);
        } else if (port.value.type === 'GigabitEthernet') {
          if (port.value.connector === 'sfp') {
            result.sfp.push(portName);
          } else {
            result.gigabitEthernet.push(portName);
          }
        }
      }
    }

    return result;
  }

  /**
   * Genera configuración predeterminada para todos los puertos de un switch
   */
  static generateDefaultSwitchConfig(model: string): string[] {
    const ports = this.getPortsByModel(model);
    const commands: string[] = [];

    commands.push('! Default port configuration');

    // Configurar puertos Gigabit como trunk (uplinks potenciales)
    if (ports.gigabitEthernet.length > 0) {
      commands.push('! GigabitEthernet ports (potential uplinks)');
      commands.push(...this.applyTemplate(ports.gigabitEthernet, defaultPortTemplates.trunk));
    }

    // Configurar puertos FastEthernet como access VLAN 1
    if (ports.fastEthernet.length > 0) {
      commands.push('! FastEthernet ports (access)');
      commands.push(...this.applyTemplate(ports.fastEthernet, defaultPortTemplates.access));
    }

    // Configurar puertos SFP como trunk
    if (ports.sfp.length > 0) {
      commands.push('! SFP uplink ports');
      commands.push(...this.applyTemplate(ports.sfp, defaultPortTemplates.uplink));
    }

    return commands;
  }

  /**
   * Valida que un template sea válido
   */
  static validateTemplate(template: PortTemplate): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar VLAN
    if (template.vlan !== undefined && (template.vlan < 1 || template.vlan > 4094)) {
      errors.push(`Invalid VLAN ${template.vlan}. Must be 1-4094`);
    }

    // Validar native VLAN
    if (template.nativeVlan !== undefined && (template.nativeVlan < 1 || template.nativeVlan > 4094)) {
      errors.push(`Invalid native VLAN ${template.nativeVlan}. Must be 1-4094`);
    }

    // Validar voice VLAN
    if (template.voiceVlan !== undefined && (template.voiceVlan < 1 || template.voiceVlan > 4094)) {
      errors.push(`Invalid voice VLAN ${template.voiceVlan}. Must be 1-4094`);
    }

    // Validar allowed VLANs
    if (template.allowedVlans) {
      const invalidVlans = template.allowedVlans.filter(v => v < 1 || v > 4094);
      if (invalidVlans.length > 0) {
        errors.push(`Invalid allowed VLANs: ${invalidVlans.join(', ')}`);
      }
    }

    // Warning: voice sin access VLAN
    if (template.voiceVlan && !template.vlan) {
      warnings.push('Voice VLAN configured without access VLAN');
    }

    // Warning: trunk sin allowed VLANs
    if ((template.type === 'trunk' || template.type === 'uplink') &&
        (!template.allowedVlans || template.allowedVlans.length === 0)) {
      warnings.push('Trunk port without allowed VLANs specified');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default PortTemplateGenerator;
