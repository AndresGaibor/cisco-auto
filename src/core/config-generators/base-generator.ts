import { Device } from '../types/index.ts';

export class BaseGenerator {
  public static generateBasic(device: Device): string[] {
    const commands: string[] = [];
    
    if (device.hostname) {
      commands.push(`hostname ${device.hostname}`);
    }
    commands.push('no ip domain-lookup');
    commands.push('banner motd #');
    commands.push('Acceso autorizado unicamente');
    commands.push('Dispositivo: ' + (device.hostname || device.name));
    commands.push('#');
    commands.push('service password-encryption');
    commands.push('logging synchronous');
    commands.push('clock timezone EST -5');
    
    if (device.ssh?.enabled) {
      commands.push('ip domain-name espoch.local');
      commands.push(`crypto key generate rsa modulus ${device.ssh.version === 2 ? 2048 : 1024}`);
      commands.push(`ip ssh version ${device.ssh.version}`);
    }
    
    return commands;
  }

  public static generateLines(lines: NonNullable<Device['lines']>): string[] {
    const commands: string[] = [];
    
    if (lines.console) {
      commands.push('line console 0');
      commands.push(` exec-timeout ${lines.console.execTimeout}`);
      if (lines.console.login) {
        commands.push(' login');
      }
      if (lines.console.password) {
        commands.push(` password ${lines.console.password}`);
      }
      commands.push(' exit');
    }
    
    if (lines.vty) {
      commands.push(`line vty ${lines.vty.start} ${lines.vty.end}`);
      commands.push(` transport input ${lines.vty.transportInput}`);
      if (lines.vty.login) {
        commands.push(' login local');
      }
      if (lines.vty.password) {
        commands.push(` password ${lines.vty.password}`);
      }
      commands.push(' exit');
    }
    
    return commands;
  }
}