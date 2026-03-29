import type { DeviceSpec, VLANSpec, VTPSpec, InterfaceSpec } from '../canonical/device.spec.ts';
import { NetworkUtils } from './utils.ts';

export class VlanGenerator {
  /**
   * Generate VLAN commands
   * Note: In canonical model, SVI IPs are on interfaces (name: 'Vlan<id>'), not on VLAN spec
   */
  public static generateVLANs(vlans: VLANSpec[], vtp?: VTPSpec): string[] {
    const commands: string[] = [];

    if (vtp?.mode === 'client') {
      return commands;
    }

    commands.push('! Configuración de VLANs');

    for (const vlan of vlans) {
      commands.push(`vlan ${vlan.id}`);
      if (vlan.name) {
        commands.push(` name ${vlan.name}`);
      }
      commands.push(' exit');
    }

    return commands;
  }

  /**
   * Generate SVI (Switch Virtual Interface) configurations
   * In canonical model, SVIs are interfaces of type 'vlan' with IPs
   */
  public static generateSVIs(interfaces: InterfaceSpec[]): string[] {
    const commands: string[] = [];

    // Find all VLAN interfaces (typically named "Vlan<X>" or have switchportMode set)
    for (const iface of interfaces) {
      // Check if this is an SVI interface (name like "Vlan10" or has ip with switchport)
      const vlanMatch = iface.name.match(/^[Vv]lan?(\d+)$/);
      if (vlanMatch || (iface.ip && !iface.switchportMode)) {
        const vlanIdStr = vlanMatch?.[1];
        const vlanId = vlanIdStr ? parseInt(vlanIdStr) : iface.vlan;
        if (vlanId) {
          commands.push(`interface ${iface.name}`);
          if (iface.description) {
            commands.push(` description ${iface.description}`);
          }
          if (iface.ip) {
            // Handle CIDR notation (e.g., "192.168.1.1/24")
            if (iface.ip.includes('/')) {
              const [ip, cidrPart] = iface.ip.split('/');
              if (cidrPart) {
                const subnetMask = NetworkUtils.cidrToMask(parseInt(cidrPart));
                commands.push(` ip address ${ip} ${subnetMask}`);
              }
            } else if (iface.subnetMask) {
              commands.push(` ip address ${iface.ip} ${iface.subnetMask}`);
            }
          }
          if (iface.shutdown === false) {
            commands.push(' no shutdown');
          }
          commands.push(' exit');
        }
      }
    }

    return commands;
  }

  public static generateVTP(vtp: VTPSpec): string[] {
    const commands: string[] = [];
    commands.push('! Configuración VTP');
    commands.push('vtp domain ' + vtp.domain);
    commands.push('vtp mode ' + vtp.mode);
    if (vtp.version) {
      commands.push('vtp version ' + String(vtp.version));
    }
    if (vtp.password) {
      commands.push('vtp password ' + vtp.password);
    }
    return commands;
  }

  public static generateInterfaces(device: DeviceSpec): string[] {
    const commands: string[] = [];
    if (!device.interfaces || device.interfaces.length === 0) {
      return commands;
    }

    commands.push('! Configuración de interfaces');

    for (const iface of device.interfaces) {
      commands.push(`interface ${iface.name}`);
      if (iface.description) {
        commands.push(` description ${iface.description}`);
      }
      // Handle IP address - only for routed interfaces or SVIs
      if (iface.ip && !iface.switchportMode) {
        if (iface.ip.includes('/')) {
          const [ip, cidrPart] = iface.ip.split('/');
          if (cidrPart) {
            const subnetMask = NetworkUtils.cidrToMask(parseInt(cidrPart));
            commands.push(` ip address ${ip} ${subnetMask}`);
          }
        } else if (iface.subnetMask) {
          commands.push(` ip address ${iface.ip} ${iface.subnetMask}`);
        }
      }
      // Handle switchport mode
      if (iface.switchportMode) {
        commands.push(' switchport mode ' + iface.switchportMode);
        if (iface.switchportMode === 'access' && iface.vlan) {
          commands.push(` switchport access vlan ${iface.vlan}`);
        }
        if (iface.switchportMode === 'trunk') {
          if (iface.nativeVlan) {
            commands.push(` switchport trunk native vlan ${iface.nativeVlan}`);
          }
          if (iface.allowedVlans) {
            commands.push(` switchport trunk allowed vlan ${iface.allowedVlans.join(',')}`);
          }
        }
      }
      if (iface.shutdown) {
        commands.push(' shutdown');
      } else {
        commands.push(' no shutdown');
      }
      commands.push(' exit');
    }

    return commands;
  }
}
