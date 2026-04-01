/**
 * Port Builder - Builds interface port configurations
 * Handles access ports, trunk ports, and port settings
 */

export interface AccessPortConfig {
  interfaceName: string;
  vlanId: number;
  spanning_tree_portfast?: boolean;
  bpdu_guard?: boolean;
  description?: string;
}

export interface TrunkPortConfig {
  interfaceName: string;
  nativeVlan?: number;
  allowedVlans: number[];
  encapsulation?: 'dot1q' | 'isl';
  description?: string;
}

export class PortBuilder {
  buildAccessPort(config: AccessPortConfig): string[] {
    const commands: string[] = [];

    commands.push(`interface ${config.interfaceName}`);
    commands.push(`switchport mode access`);
    commands.push(`switchport access vlan ${config.vlanId}`);

    if (config.spanning_tree_portfast) {
      commands.push(`spanning-tree portfast`);
    }

    if (config.bpdu_guard) {
      commands.push(`spanning-tree bpduguard enable`);
    }

    if (config.description) {
      commands.push(`description ${config.description}`);
    }

    commands.push('exit');

    return commands;
  }

  buildTrunkPort(config: TrunkPortConfig): string[] {
    const commands: string[] = [];

    commands.push(`interface ${config.interfaceName}`);
    commands.push(`switchport mode trunk`);

    if (config.encapsulation) {
      commands.push(`switchport trunk encapsulation ${config.encapsulation}`);
    }

    if (config.nativeVlan) {
      commands.push(`switchport trunk native vlan ${config.nativeVlan}`);
    }

    if (config.allowedVlans.length > 0) {
      const vlanList = config.allowedVlans.join(',');
      commands.push(`switchport trunk allowed vlan ${vlanList}`);
    }

    if (config.description) {
      commands.push(`description ${config.description}`);
    }

    commands.push('exit');

    return commands;
  }

  buildPortSpeed(interfaceName: string, speed: string, duplex?: 'full' | 'half' | 'auto'): string[] {
    const commands: string[] = [];

    commands.push(`interface ${interfaceName}`);
    commands.push(`speed ${speed}`);

    if (duplex) {
      commands.push(`duplex ${duplex}`);
    }

    commands.push('exit');

    return commands;
  }

  buildPortDescription(interfaceName: string, description: string): string[] {
    return [
      `interface ${interfaceName}`,
      `description ${description}`,
      'exit',
    ];
  }

  buildPortShutdown(interfaceName: string, shutdown: boolean): string[] {
    return [
      `interface ${interfaceName}`,
      shutdown ? 'shutdown' : 'no shutdown',
      'exit',
    ];
  }

  validateAccessPort(config: AccessPortConfig): string[] {
    const errors: string[] = [];

    if (!config.interfaceName) {
      errors.push('Interface name is required');
    }

    if (config.vlanId < 1 || config.vlanId > 4094) {
      errors.push(`Invalid VLAN ID: ${config.vlanId} (1-4094)`);
    }

    return errors;
  }

  validateTrunkPort(config: TrunkPortConfig): string[] {
    const errors: string[] = [];

    if (!config.interfaceName) {
      errors.push('Interface name is required');
    }

    if (config.allowedVlans.length === 0) {
      errors.push('At least one VLAN must be allowed on trunk');
    }

    for (const vlanId of config.allowedVlans) {
      if (vlanId < 1 || vlanId > 4094) {
        errors.push(`Invalid VLAN ID: ${vlanId} (1-4094)`);
      }
    }

    if (config.nativeVlan && (config.nativeVlan < 1 || config.nativeVlan > 4094)) {
      errors.push(`Invalid native VLAN: ${config.nativeVlan} (1-4094)`);
    }

    return errors;
  }
}
