import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';
import { stpSchema, vtpSchema, etherChannelSchema } from './switching.schema.js';
export {
  generateStpCommands,
  generateVtpCommands,
  generateEtherChannelCommands,
  SWITCHING_VERIFY_COMMANDS,
  verifyShowStpSummary,
  verifyShowVtpStatus,
  verifyShowEtherchannelSummary,
} from './switching.generator.js';

function toValidationResult(errors: PluginValidationResult['errors']): PluginValidationResult {
  return {
    ok: errors.length === 0,
    errors,
  };
}

function validateSchema(schema: typeof stpSchema, spec: unknown): PluginValidationResult {
  const parsed = schema.safeParse(spec);

  if (!parsed.success) {
    return toValidationResult(
      parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }))
    );
  }

  return toValidationResult([]);
}

function validateStpConfig(spec: unknown): PluginValidationResult {
  const result = validateSchema(stpSchema, spec);

  if (!result.ok) {
    return result;
  }

  const config = spec as Record<string, unknown>;
  const errors: PluginValidationResult['errors'] = [];

  // Validar que no haya prioridades duplicadas en vlanConfig
  const vlanPriorities = new Map<number, number>();
  for (const [index, vlanConf] of ((config.vlanConfig as Record<string, unknown>[]) ?? []).entries()) {
    const vlanId = vlanConf.vlanId as number;
    if (vlanConf.priority !== undefined) {
      if (vlanPriorities.has(vlanId)) {
        errors.push({
          path: `vlanConfig.${index}.priority`,
          message: `Duplicate priority definition for VLAN ${vlanId}`,
          code: 'duplicate_stp_vlan_priority',
        });
      }
      vlanPriorities.set(vlanId, vlanConf.priority as number);
    }
  }

  return toValidationResult(errors);
}

function validateVtpConfig(spec: unknown): PluginValidationResult {
  const result = validateSchema(vtpSchema, spec);

  if (!result.ok) {
    return result;
  }

  const config = spec as Record<string, unknown>;
  const errors: PluginValidationResult['errors'] = [];

  // Validar coherencia: modo transparent no usa domain/password
  if (config.mode === 'transparent' && config.password !== undefined) {
    errors.push({
      path: 'password',
      message: 'VTP password is not applicable in transparent mode',
      code: 'invalid_vtp_password_mode',
    });
  }

  return toValidationResult(errors);
}

function validateEtherChannelConfig(spec: unknown): PluginValidationResult {
  const result = validateSchema(etherChannelSchema, spec);

  if (!result.ok) {
    return result;
  }

  const config = spec as Record<string, unknown>;
  const errors: PluginValidationResult['errors'] = [];

  // Validar que haya al menos 2 interfaces
  const interfaces = config.interfaces as string[] | undefined;
  if (interfaces === undefined || interfaces.length < 2) {
    errors.push({
      path: 'interfaces',
      message: 'At least 2 interfaces are required for EtherChannel',
      code: 'insufficient_etherchannel_interfaces',
    });
  }

  // Validar coherencia trunk/access
  if (config.trunkMode === 'access' && config.nativeVlan !== undefined) {
    errors.push({
      path: 'nativeVlan',
      message: 'nativeVlan is not applicable in access mode',
      code: 'invalid_etherchannel_native_vlan',
    });
  }

  if (config.trunkMode === 'access' && config.allowedVlans !== undefined) {
    errors.push({
      path: 'allowedVlans',
      message: 'allowedVlans is not applicable in access mode',
      code: 'invalid_etherchannel_allowed_vlans',
    });
  }

  return toValidationResult(errors);
}

export const switchingPlugin: ProtocolPlugin = {
  id: 'switching',
  category: 'switching',
  name: 'Switching Protocols',
  version: '1.0.0',
  description: 'Generates and validates IOS STP, VTP, and EtherChannel configuration.',
  commands: [
    {
      name: 'configure-stp',
      description: 'Generate IOS commands for Spanning Tree Protocol',
      inputSchema: stpSchema,
      examples: [
        {
          input: {
            mode: 'rapid-pvst',
            priority: 24576,
            rootPrimary: [1, 10, 20],
            portfastDefault: true,
            bpduguardDefault: true,
            interfaceConfig: [
              { interface: 'GigabitEthernet0/1', portfast: false },
              { interface: 'FastEthernet0/1', portfast: true, bpduguard: true },
            ],
          },
          description: 'Configure STP with rapid-pvst mode and root primary for VLANs 1, 10, 20',
        },
      ],
    },
    {
      name: 'configure-vtp',
      description: 'Generate IOS commands for VLAN Trunking Protocol',
      inputSchema: vtpSchema,
      examples: [
        {
          input: {
            mode: 'server',
            domain: 'CISCO',
            password: 'cisco123',
            version: 2,
          },
          description: 'Configure VTP as server with domain CISCO',
        },
      ],
    },
    {
      name: 'configure-etherchannel',
      description: 'Generate IOS commands for EtherChannel (LACP/PAGP)',
      inputSchema: etherChannelSchema,
      examples: [
        {
          input: {
            groupId: 1,
            mode: 'active',
            interfaces: ['GigabitEthernet0/1', 'GigabitEthernet0/2'],
            portChannel: 'Port-channel1',
            trunkMode: 'trunk',
            nativeVlan: 99,
            allowedVlans: 'all',
          },
          description: 'Create LACP EtherChannel with trunk mode',
        },
      ],
    },
  ],
  validate: validateStpConfig,
};

export { validateStpConfig, validateVtpConfig, validateEtherChannelConfig };
