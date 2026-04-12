import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';
import { vlanSchema, type VlanConfigInput } from './vlan.schema.js';
export { generateVlanCommands, VLAN_VERIFY_COMMANDS, verifyShowVlanBriefOutput } from './vlan.generator.js';

function toValidationResult(errors: PluginValidationResult['errors']): PluginValidationResult {
  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateVlanConfig(spec: unknown): PluginValidationResult {
  const parsed = vlanSchema.safeParse(spec);

  if (!parsed.success) {
    return toValidationResult(
      parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }))
    );
  }

  const config = parsed.data;

  if (config.vlans.length === 0) {
    return toValidationResult([
      {
        path: 'vlans',
        message: 'At least one VLAN is required',
        code: 'empty_vlan_list',
      },
    ]);
  }

  const vlanIds = new Set<number>();
  const duplicateErrors: PluginValidationResult['errors'] = [];

  for (const [index, vlan] of config.vlans.entries()) {
    const vlanId = vlan.id.toNumber();

    if (vlanIds.has(vlanId)) {
      duplicateErrors.push({
        path: `vlans.${index}.id`,
        message: `Duplicate VLAN ID ${vlanId}`,
        code: 'duplicate_vlan_id',
      });
    }

    vlanIds.add(vlanId);
  }

  const accessPortErrors: PluginValidationResult['errors'] = [];

  for (const [index, accessPort] of (config.accessPorts ?? []).entries()) {
    const vlanId = accessPort.vlan.toNumber();

    if (!vlanIds.has(vlanId)) {
      accessPortErrors.push({
        path: `accessPorts.${index}.vlan`,
        message: `VLAN ${vlanId} is not defined in vlans`,
        code: 'invalid_access_port_vlan_reference',
      });
    }
  }

  return toValidationResult([...duplicateErrors, ...accessPortErrors]);
}

export const vlanPlugin: ProtocolPlugin = {
  id: 'vlan',
  category: 'switching',
  name: 'VLAN',
  version: '1.0.0',
  description: 'Generates and validates IOS VLAN configuration.',
  commands: [
    {
      name: 'configure-vlan',
      description: 'Generate IOS commands for VLANs, trunks and access ports',
      inputSchema: vlanSchema,
      examples: [
        {
          input: {
            switchName: 'SW1',
            vlans: [{ id: 10, name: 'USERS' }],
            trunkPorts: ['GigabitEthernet0/1'],
            accessPorts: [{ port: 'FastEthernet0/1', vlan: 10 }],
          } satisfies VlanConfigInput,
          description: 'Create a VLAN with trunk and access ports',
        },
      ],
    },
  ],
  validate: validateVlanConfig,
};
