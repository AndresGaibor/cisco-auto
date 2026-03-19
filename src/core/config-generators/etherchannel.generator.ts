/**
 * ETHERCHANNEL GENERATOR
 * 
 * Genera configuración de EtherChannel (LACP, PAgP, Static)
 */

import type { EtherChannelSpec } from '../canonical/protocol.spec';

export class EtherChannelGenerator {
  /**
   * Genera configuración de múltiples EtherChannels
   */
  static generate(channels: EtherChannelSpec[]): string[] {
    const commands: string[] = [];
    
    commands.push('! EtherChannel Configuration');
    
    for (const channel of channels) {
      commands.push('');
      commands.push(...this.generateChannel(channel));
    }
    
    // Load balancing global (solo una vez)
    const loadBalancing = channels.find(c => c.loadBalancing);
    if (loadBalancing?.loadBalancing) {
      commands.push('');
      commands.push('! Load Balancing Method');
      commands.push(`port-channel load-balance ${loadBalancing.loadBalancing}`);
    }
    
    return commands;
  }
  
  /**
   * Genera configuración de un EtherChannel
   */
  private static generateChannel(spec: EtherChannelSpec): string[] {
    const commands: string[] = [];
    
    // Configurar interfaces miembro
    for (const iface of spec.interfaces) {
      commands.push(`interface ${iface}`);
      
      if (spec.description) {
        commands.push(` description Member of ${spec.portChannel}`);
      }
      
      // Modo del canal
      const modeCmd = this.getModeCommand(spec.mode, spec.protocol);
      commands.push(` channel-group ${spec.groupId} mode ${modeCmd}`);
      
      commands.push(' exit');
    }
    
    // Configurar puerto lógico Port-channel
    commands.push(`interface ${spec.portChannel}`);
    
    if (spec.description) {
      commands.push(` description ${spec.description}`);
    }
    
    // Modo switchport
    if (spec.trunkMode) {
      if (spec.trunkMode === 'access') {
        commands.push(' switchport mode access');
        if (spec.accessVlan) {
          commands.push(` switchport access vlan ${spec.accessVlan}`);
        }
      } else if (spec.trunkMode === 'trunk') {
        commands.push(' switchport mode trunk');
        
        // VLAN nativa
        if (spec.nativeVlan) {
          commands.push(` switchport trunk native vlan ${spec.nativeVlan}`);
        }
        
        // VLANs permitidas
        if (spec.allowedVlans) {
          if (spec.allowedVlans === 'all') {
            commands.push(' switchport trunk allowed vlan all');
          } else {
            const vlans = spec.allowedVlans.join(',');
            commands.push(` switchport trunk allowed vlan ${vlans}`);
          }
        }
      }
    }
    
    commands.push(' exit');
    
    return commands;
  }
  
  /**
   * Obtiene el comando de modo correcto según protocolo
   */
  private static getModeCommand(
    mode: EtherChannelSpec['mode'],
    protocol: EtherChannelSpec['protocol']
  ): string {
    // LACP: active, passive
    // PAgP: desirable, auto
    // Static: on
    
    if (protocol === 'static') {
      return 'on';
    }
    
    return mode;
  }
  
  /**
   * Genera configuración de ejemplo LACP
   */
  static generateLACPExample(): string {
    const spec: EtherChannelSpec = {
      groupId: 1,
      mode: 'active',
      protocol: 'lacp',
      interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
      portChannel: 'Port-channel1',
      trunkMode: 'trunk',
      nativeVlan: 1,
      allowedVlans: [1, 10, 20, 30],
      description: 'Trunk to Core Switch',
      loadBalancing: 'src-dst-ip'
    };
    
    return this.generate([spec]).join('\n');
  }
  
  /**
   * Genera configuración de ejemplo PAgP
   */
  static generatePAgPExample(): string {
    const spec: EtherChannelSpec = {
      groupId: 2,
      mode: 'desirable',
      protocol: 'pagp',
      interfaces: ['GigabitEthernet1/0/1', 'GigabitEthernet1/0/2'],
      portChannel: 'Port-channel2',
      trunkMode: 'trunk',
      description: 'Trunk to Distribution'
    };
    
    return this.generate([spec]).join('\n');
  }
  
  /**
   * Genera configuración de ejemplo static (sin protocolo)
   */
  static generateStaticExample(): string {
    const spec: EtherChannelSpec = {
      groupId: 3,
      mode: 'on',
      protocol: 'static',
      interfaces: ['GigabitEthernet0/3', 'GigabitEthernet0/4'],
      portChannel: 'Port-channel3',
      trunkMode: 'access',
      accessVlan: 10,
      description: 'Access to Server Farm'
    };
    
    return this.generate([spec]).join('\n');
  }
  
  /**
   * Valida configuración de EtherChannel
   */
  static validate(spec: EtherChannelSpec): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validar group ID (1-64 en Catalyst)
    if (spec.groupId < 1 || spec.groupId > 64) {
      errors.push(`Group ID ${spec.groupId} must be between 1 and 64`);
    }
    
    // Validar interfaces
    if (spec.interfaces.length < 1) {
      errors.push('EtherChannel requires at least 1 interface');
    }
    
    if (spec.interfaces.length > 8) {
      errors.push('EtherChannel supports maximum 8 interfaces');
    }
    
    // Validar modo vs protocolo
    if (spec.protocol === 'lacp') {
      if (spec.mode !== 'active' && spec.mode !== 'passive') {
        errors.push(`LACP protocol requires mode 'active' or 'passive', got '${spec.mode}'`);
      }
    }
    
    if (spec.protocol === 'pagp') {
      if (spec.mode !== 'desirable' && spec.mode !== 'auto') {
        errors.push(`PAgP protocol requires mode 'desirable' or 'auto', got '${spec.mode}'`);
      }
    }
    
    if (spec.protocol === 'static' && spec.mode !== 'on') {
      errors.push(`Static EtherChannel requires mode 'on', got '${spec.mode}'`);
    }
    
    // Warnings
    if (spec.mode === 'on') {
      warnings.push('Static mode (on) does not use LACP/PAgP negotiation. Ensure both ends match');
    }
    
    if (spec.protocol === 'pagp') {
      warnings.push('PAgP is Cisco proprietary. LACP is IEEE standard and preferred');
    }
    
    // Validar VLANs
    if (spec.allowedVlans && Array.isArray(spec.allowedVlans)) {
      for (const vlan of spec.allowedVlans) {
        if (vlan < 1 || vlan > 4094) {
          errors.push(`Invalid VLAN ${vlan} in allowedVlans`);
        }
      }
    }
    
    if (spec.nativeVlan && (spec.nativeVlan < 1 || spec.nativeVlan > 4094)) {
      errors.push(`Invalid native VLAN ${spec.nativeVlan}`);
    }
    
    if (spec.accessVlan && (spec.accessVlan < 1 || spec.accessVlan > 4094)) {
      errors.push(`Invalid access VLAN ${spec.accessVlan}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Valida compatibilidad entre dos EtherChannels que se conectan
   */
  static validateCompatibility(
    channel1: EtherChannelSpec,
    channel2: EtherChannelSpec
  ): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Mismo protocolo
    if (channel1.protocol !== channel2.protocol) {
      issues.push(`Protocol mismatch: ${channel1.protocol} vs ${channel2.protocol}`);
    }
    
    // Modos compatibles
    const compatibleModes: Record<string, string[]> = {
      'active': ['active', 'passive'],
      'passive': ['active'],
      'desirable': ['desirable', 'auto'],
      'auto': ['desirable'],
      'on': ['on']
    };
    
    if (!compatibleModes[channel1.mode]?.includes(channel2.mode)) {
      issues.push(`Mode mismatch: ${channel1.mode} is not compatible with ${channel2.mode}`);
    }
    
    // Trunk settings
    if (channel1.trunkMode === 'trunk' && channel2.trunkMode === 'trunk') {
      if (channel1.nativeVlan !== channel2.nativeVlan) {
        issues.push(`Native VLAN mismatch: ${channel1.nativeVlan} vs ${channel2.nativeVlan}`);
      }
    }
    
    return {
      compatible: issues.length === 0,
      issues
    };
  }
}

export default EtherChannelGenerator;
