import type { DeviceSpec } from '../canonical/device.spec.ts';
import { BaseGenerator } from './base-generator.js';
import { VlanGenerator } from './vlan-generator.js';
import { RoutingGenerator } from './routing-generator.js';
import { SecurityGenerator } from './security-generator.js';

export interface GeneratedConfig {
  hostname: string;
  commands: string[];
  sections: Record<string, string[]>;
}

export class IOSGenerator {
  public static generate(device: DeviceSpec): GeneratedConfig {
    const sections: Record<string, string[]> = {
      'basic': BaseGenerator.generateBasic(device),
      'interfaces': VlanGenerator.generateInterfaces(device),
      'vlans': device.vlans ? VlanGenerator.generateVLANs(device.vlans, device.vtp) : [],
      'vtp': device.vtp ? VlanGenerator.generateVTP(device.vtp) : [],
      'routing': device.routing ? RoutingGenerator.generateRouting(device.routing) : [],
      // Security: canonical uses device.security.acls and device.security.nat
      'security': device.security ? SecurityGenerator.generateSecurity(device.security) : [],
      'lines': device.lines ? BaseGenerator.generateLines(device.lines) : []
    };

    const commands: string[] = [];
    commands.push('!');
    commands.push(`! Configuración generada por cisco-auto`);
    commands.push(`! Dispositivo: ${device.name}`);
    commands.push(`! Tipo: ${device.type}`);
    commands.push('!');
    commands.push('');

    Object.entries(sections).forEach(([name, sectionCommands]) => {
      if (sectionCommands.length > 0) {
        commands.push(`! --- ${name.toUpperCase()} ---`);
        commands.push(...sectionCommands);
        commands.push('');
      }
    });

    commands.push('! Guardar configuración');
    commands.push('end');
    commands.push('write memory');

    return {
      hostname: device.hostname || device.name,
      commands,
      sections
    };
  }

  public static formatCommands(commands: string[]): string {
    return commands.join('\n');
  }
}

export function generateIOS(device: DeviceSpec): GeneratedConfig {
  return IOSGenerator.generate(device);
}
