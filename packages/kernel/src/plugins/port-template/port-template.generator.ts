import { portTemplateConfigSchema, type PortTemplateConfigInput, type PortTemplate } from './port-template.schema.js';

export const PORT_TEMPLATE_VERIFY_COMMANDS = ['show interfaces status', 'show interfaces switchport', 'show running-config interface'] as const;

/**
 * Genera configuración IOS para un template de puerto en una interfaz
 */
function generateInterfaceConfig(interfaceName: string, template: PortTemplate): string[] {
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
    if (template.nativeVlan !== undefined) {
      commands.push(` switchport trunk native vlan ${template.nativeVlan}`);
    }

    // VLANs permitidas
    if (template.allowedVlans && template.allowedVlans.length > 0) {
      commands.push(` switchport trunk allowed vlan ${template.allowedVlans.join(',')}`);
    }
  } else {
    commands.push(' switchport mode access');

    // VLAN de acceso
    if (template.vlan !== undefined) {
      commands.push(` switchport access vlan ${template.vlan}`);
    }

    // VLAN de voz
    if (template.voiceVlan !== undefined) {
      commands.push(` switchport voice vlan ${template.voiceVlan}`);
    }
  }

  // Velocidad y dúplex
  if (template.speed !== undefined) {
    commands.push(` speed ${template.speed}`);
  }
  if (template.duplex !== undefined) {
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
    if (template.maxMacAddresses !== undefined) {
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
 * Genera todos los comandos de port-template a partir de una configuración
 */
export function generatePortTemplateCommands(spec: PortTemplateConfigInput): string[] {
  const config = portTemplateConfigSchema.parse(spec);
  const commands: string[] = [];

  for (const ifaceSpec of config.interfaces) {
    commands.push(...generateInterfaceConfig(ifaceSpec.interfaceName, ifaceSpec.template));
  }

  return commands;
}
