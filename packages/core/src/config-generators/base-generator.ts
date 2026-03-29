import type { DeviceSpec, LineSpec } from '../canonical/device.spec.ts';

export class BaseGenerator {
  public static generateBasic(device: DeviceSpec): string[] {
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

    // SSH configuration moved to services.ssh in canonical model
    if (device.services?.ssh?.enabled) {
      const domain = device.domain || 'local.domain'; // Configurable domain
      commands.push(`ip domain-name ${domain}`);
      const version = device.services.ssh.version ?? 2;
      commands.push(`crypto key generate rsa modulus ${version === 2 ? 2048 : 1024}`);
      commands.push(`ip ssh version ${version}`);
    }

    return commands;
  }

  public static generateLines(lines: LineSpec[]): string[] {
    const commands: string[] = [];

    for (const line of lines) {
      if (line.type === 'console') {
        commands.push('line console 0');
        if (line.execTimeout) {
          commands.push(` exec-timeout ${line.execTimeout.minutes} ${line.execTimeout.seconds}`);
        }
        if (line.login) {
          commands.push(' login');
        }
        if (line.password) {
          commands.push(` password ${line.password}`);
        }
        commands.push(' exit');
      }

      if (line.type === 'vty' && line.range) {
        commands.push(`line vty ${line.range[0]} ${line.range[1]}`);
        if (line.transportInput) {
          commands.push(` transport input ${line.transportInput.join(' ')}`);
        }
        if (line.login) {
          commands.push(' login local');
        }
        if (line.password) {
          commands.push(` password ${line.password}`);
        }
        commands.push(' exit');
      }
    }

    return commands;
  }
}
