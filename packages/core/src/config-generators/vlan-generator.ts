import { Device, VLAN, VTP } from '../types/index.ts';
import { NetworkUtils } from './utils.ts';

export class VlanGenerator {
  public static generateVLANs(vlans: VLAN[], vtp?: VTP): string[] {
    const commands: string[] = [];
    
    if (vtp?.mode === 'client') {
      return commands;
    }
    
    commands.push('! Configuración de VLANs');
    
    for (const vlan of vlans) {
      commands.push(`vlan ${vlan.id}`);
      commands.push(` name ${vlan.name}`);
      if (vlan.description) {
        commands.push(` description ${vlan.description}`);
      }
      commands.push(' exit');
    }
    
    for (const vlan of vlans) {
      if (vlan.ip) {
        const [ip, mask] = vlan.ip.split('/');
        const subnetMask = NetworkUtils.cidrToMask(parseInt(mask));
        
        commands.push(`interface vlan ${vlan.id}`);
        commands.push(` description SVI ${vlan.name}`);
        commands.push(` ip address ${ip} ${subnetMask}`);
        if (vlan.active !== false) {
          commands.push(' no shutdown');
        }
        commands.push(' exit');
      }
    }
    
    return commands;
  }

  public static generateVTP(vtp: VTP): string[] {
    const commands: string[] = [];
    commands.push('! Configuración VTP');
    commands.push('vtp domain ' + vtp.domain);
    commands.push('vtp mode ' + vtp.mode);
    commands.push('vtp version ' + vtp.version);
    if (vtp.password) {
      commands.push('vtp password ' + vtp.password);
    }
    return commands;
  }

  public static generateInterfaces(device: Device): string[] {
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
      if (iface.ip && iface.mode !== 'access') {
        const [ip, mask] = iface.ip.split('/');
        const subnetMask = NetworkUtils.cidrToMask(parseInt(mask));
        commands.push(` ip address ${ip} ${subnetMask}`);
      }
      if (iface.mode) {
        commands.push(' switchport mode ' + iface.mode);
        if (iface.mode === 'access' && iface.vlan) {
          commands.push(` switchport access vlan ${iface.vlan}`);
        }
        if (iface.mode === 'trunk') {
          if (iface.encapsulation) {
            commands.push(` switchport trunk encapsulation ${iface.encapsulation}`);
          }
          if (iface.trunkAllowedVlans) {
            commands.push(` switchport trunk allowed vlan ${iface.trunkAllowedVlans.join(',')}`);
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