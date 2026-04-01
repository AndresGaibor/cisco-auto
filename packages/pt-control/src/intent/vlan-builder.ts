/**
 * VLAN Builder - Builds VLAN configurations
 * Handles VLAN creation, SVI setup, and VLAN management
 */

export interface VLANConfig {
  vlanId: number;
  name: string;
  description?: string;
  shutdown?: boolean;
}

export interface SVIConfig {
  vlanId: number;
  ipAddress: string;
  subnetMask: string;
  description?: string;
  standby?: {
    group: number;
    priority: number;
    virtualIP: string;
  };
}

export class VlanBuilder {
  buildVlan(config: VLANConfig): string[] {
    const commands: string[] = [];

    commands.push(`vlan ${config.vlanId}`);
    commands.push(`name ${config.name}`);

    if (config.description) {
      commands.push(`description ${config.description}`);
    }

    if (config.shutdown) {
      commands.push('shutdown');
    }

    commands.push('exit');

    return commands;
  }

  buildSVI(config: SVIConfig): string[] {
    const commands: string[] = [];

    commands.push(`interface vlan ${config.vlanId}`);
    commands.push(`ip address ${config.ipAddress} ${config.subnetMask}`);
    commands.push('no shutdown');

    if (config.description) {
      commands.push(`description ${config.description}`);
    }

    // HSRP/Standby configuration
    if (config.standby) {
      commands.push(`standby ${config.standby.group} ip ${config.standby.virtualIP}`);
      commands.push(`standby ${config.standby.group} priority ${config.standby.priority}`);
    }

    commands.push('exit');

    return commands;
  }

  buildVlanTrunk(interfaceName: string, vlans: number[]): string[] {
    const commands: string[] = [];

    commands.push(`interface ${interfaceName}`);
    commands.push('switchport mode trunk');
    commands.push(`switchport trunk allowed vlan ${vlans.join(',')}`);
    commands.push('exit');

    return commands;
  }

  deleteVlan(vlanId: number): string[] {
    return [`no vlan ${vlanId}`];
  }

  validateVlanConfig(config: VLANConfig): string[] {
    const errors: string[] = [];

    if (config.vlanId < 1 || config.vlanId > 4094) {
      errors.push(`Invalid VLAN ID: ${config.vlanId} (1-4094)`);
    }

    if (!config.name || config.name.length === 0) {
      errors.push('VLAN name cannot be empty');
    }

    if (config.name.length > 32) {
      errors.push(`VLAN name too long: ${config.name.length} (max 32)`);
    }

    return errors;
  }

  validateSVIConfig(config: SVIConfig): string[] {
    const errors: string[] = [];

    if (config.vlanId < 1 || config.vlanId > 4094) {
      errors.push(`Invalid VLAN ID: ${config.vlanId} (1-4094)`);
    }

    if (!this.isValidIP(config.ipAddress)) {
      errors.push(`Invalid IP address: ${config.ipAddress}`);
    }

    if (!this.isValidIP(config.subnetMask)) {
      errors.push(`Invalid subnet mask: ${config.subnetMask}`);
    }

    if (config.standby) {
      if (config.standby.priority < 1 || config.standby.priority > 255) {
        errors.push(`Invalid HSRP priority: ${config.standby.priority} (1-255)`);
      }

      if (!this.isValidIP(config.standby.virtualIP)) {
        errors.push(`Invalid virtual IP: ${config.standby.virtualIP}`);
      }
    }

    return errors;
  }

  private isValidIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }
}
