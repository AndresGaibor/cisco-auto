import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';
import { vlanSchema, type VlanConfigInput, sviSchema, type SviConfigInput } from './vlan.schema.js';
import { toValidationResult } from '../shared/validation.utils.js';
export { generateVlanCommands, VLAN_VERIFY_COMMANDS, verifyShowVlanBriefOutput, generateSviCommands, SVI_VERIFY_COMMANDS, verifyShowIpInterfaceBrief } from './vlan.generator.js';

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

export function validateSviConfig(spec: unknown, vlanConfig?: VlanConfigInput): PluginValidationResult {
  const parsed = sviSchema.safeParse(spec);

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

  if (config.svis.length === 0) {
    return toValidationResult([
      {
        path: 'svis',
        message: 'At least one SVI is required',
        code: 'empty_svi_list',
      },
    ]);
  }

  const vlanIds = vlanConfig
    ? new Set(
        vlanSchema.parse(vlanConfig).vlans.map((v) => v.id.toNumber())
      )
    : new Set<number>();

  const sviErrors: PluginValidationResult['errors'] = [];

  for (const [index, svi] of config.svis.entries()) {
    const sviVlanId = svi.vlanId.toNumber();

    if (vlanIds.size > 0 && !vlanIds.has(sviVlanId)) {
      sviErrors.push({
        path: `svis.${index}.vlanId`,
        message: `SVI VLAN ${sviVlanId} is not defined in vlans`,
        code: 'invalid_svi_vlan_reference',
      });
    }
  }

  return toValidationResult(sviErrors);
}

export const vlanPlugin: ProtocolPlugin = {
  id: 'vlan',
  category: 'switching',
  name: 'VLAN',
  version: '1.0.0',
  description: 'Generates and validates IOS VLAN and SVI configuration.',
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
    {
      name: 'configure-svi',
      description: 'Generate IOS commands for Switch Virtual Interfaces (SVI)',
      inputSchema: sviSchema,
      examples: [
        {
          input: {
            deviceName: 'SW1',
            svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', description: 'Gateway USERS' }],
            ipRouting: true,
          } satisfies SviConfigInput,
          description: 'Create SVI for VLAN 10 with IP routing enabled',
        },
      ],
    },
  ],
  validate: validateVlanConfig,
};
