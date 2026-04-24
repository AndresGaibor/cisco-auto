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

export interface SVIStandbyConfig {
  group: number;
  virtualIP: string;
  priority?: number;
  preempt?: boolean;
  priorityPreempt?: boolean;
  authentication?: string;
  helloInterval?: number;
  holdTime?: number;
  trackInterface?: string;
  trackDecrement?: number;
  useBia?: boolean;
  version?: 1 | 2;
  secondary?: string;
}

export interface SVIConfig {
  vlanId: number;
  ipAddress: string;
  subnetMask: string;
  description?: string;
  standby?: SVIStandbyConfig;
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

    if (config.standby) {
      const sg = config.standby.group;
      commands.push(`standby ${sg} ip ${config.standby.virtualIP}`);

      if (config.standby.priority !== undefined) {
        commands.push(`standby ${sg} priority ${config.standby.priority}`);
      }

      if (config.standby.preempt !== undefined) {
        if (config.standby.preempt) {
          commands.push(`standby ${sg} preempt`);
        } else {
          commands.push(`standby ${sg} no preempt`);
        }
      }

      if (config.standby.priorityPreempt !== undefined) {
        if (config.standby.priorityPreempt) {
          commands.push(`standby ${sg} priority ${config.standby.priority} preempt`);
        }
      }

      if (config.standby.authentication) {
        commands.push(`standby ${sg} authentication ${config.standby.authentication}`);
      }

      if (config.standby.helloInterval !== undefined && config.standby.holdTime !== undefined) {
        commands.push(`standby ${sg} timers ${config.standby.helloInterval} ${config.standby.holdTime}`);
      }

      if (config.standby.trackInterface) {
        const decrement = config.standby.trackDecrement ?? 10;
        if (config.standby.trackDecrement !== undefined) {
          commands.push(`standby ${sg} track ${config.standby.trackInterface} ${decrement}`);
        } else {
          commands.push(`standby ${sg} track ${config.standby.trackInterface}`);
        }
      }

      if (config.standby.useBia !== undefined) {
        commands.push(`standby ${sg} use-bia`);
      }

      if (config.standby.version !== undefined) {
        commands.push(`standby ${sg} version ${config.standby.version}`);
      }

      if (config.standby.secondary) {
        commands.push(`standby ${sg} secondary ${config.standby.secondary}`);
      }
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
      if (config.standby.priority !== undefined && (config.standby.priority < 1 || config.standby.priority > 255)) {
        errors.push(`Invalid HSRP priority: ${config.standby.priority} (1-255)`);
      }

      if (!this.isValidIP(config.standby.virtualIP)) {
        errors.push(`Invalid virtual IP: ${config.standby.virtualIP}`);
      }

      if (config.standby.helloInterval !== undefined && (config.standby.helloInterval < 1 || config.standby.helloInterval > 255)) {
        errors.push(`Invalid hello interval: ${config.standby.helloInterval} (1-255)`);
      }

      if (config.standby.holdTime !== undefined && (config.standby.holdTime < 1 || config.standby.holdTime > 255)) {
        errors.push(`Invalid hold time: ${config.standby.holdTime} (1-255)`);
      }

      if (config.standby.trackDecrement !== undefined && (config.standby.trackDecrement < 1 || config.standby.trackDecrement > 255)) {
        errors.push(`Invalid track decrement: ${config.standby.trackDecrement} (1-255)`);
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
