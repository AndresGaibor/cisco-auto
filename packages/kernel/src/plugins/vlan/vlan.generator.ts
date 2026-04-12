import { vlanSchema, type VlanConfigInput, type VlanConfig } from './vlan.schema.js';
import { parseVlanName } from '@cisco-auto/ios-domain/value-objects';

export const VLAN_VERIFY_COMMANDS = ['show vlan brief'] as const;

function buildValidationResult(errors: Array<{ path: string; message: string; code: string }>) {
  return {
    ok: errors.length === 0,
    errors,
  };
}

export function generateVlanCommands(spec: VlanConfigInput): string[] {
  const config = vlanSchema.parse(spec);
  const commands: string[] = [];

  for (const vlan of config.vlans) {
    commands.push(`vlan ${vlan.id.toNumber()}`);

    if (vlan.name) {
      commands.push(`name ${parseVlanName(vlan.name).value}`);
    }

    commands.push('exit');
  }

  for (const port of config.trunkPorts ?? []) {
    commands.push(`interface ${port}`);
    commands.push('switchport mode trunk');
    commands.push('exit');
  }

  for (const accessPort of config.accessPorts ?? []) {
    commands.push(`interface ${accessPort.port}`);
    commands.push('switchport mode access');
    commands.push(`switchport access vlan ${accessPort.vlan.toNumber()}`);
    commands.push('exit');
  }

  return commands;
}

export function verifyShowVlanBriefOutput(output: string, spec: VlanConfigInput) {
  const config: VlanConfig = vlanSchema.parse(spec);
  const outputLines = output.split(/\r?\n/);
  const vlanLines = new Map<number, string>();

  for (const line of outputLines) {
    const match = line.match(/^\s*(\d+)\s+/);

    if (match) {
      vlanLines.set(Number(match[1]), line);
    }
  }

  const errors = config.vlans.flatMap((vlan, index) => {
    const vlanId = vlan.id.toNumber();
    const line = vlanLines.get(vlanId);

    if (!line) {
      return [{
        path: `vlans.${index}.id`,
        message: `VLAN ${vlanId} is missing from show vlan brief`,
        code: 'missing_vlan',
      }];
    }

    const lineTokens = line.trim().split(/\s+/);
    const vlanName = lineTokens[1];

    if (vlan.name && vlanName !== vlan.name) {
      return [{
        path: `vlans.${index}.name`,
        message: `VLAN ${vlanId} name ${vlan.name} is missing from show vlan brief`,
        code: 'missing_vlan_name',
      }];
    }

    return [];
  });

  return buildValidationResult(errors);
}
