import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';
import { portTemplateConfigSchema, portTemplateSchema, type PortTemplateConfigInput } from './port-template.schema.js';
import { toValidationResult } from '../shared/validation.utils.js';
export { generatePortTemplateCommands, PORT_TEMPLATE_VERIFY_COMMANDS } from './port-template.generator.js';

export function validatePortTemplateConfig(spec: unknown): PluginValidationResult {
  const parsed = portTemplateConfigSchema.safeParse(spec);

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
  const errors: PluginValidationResult['errors'] = [];

  // Validar templates individualmente
  for (const [index, ifaceSpec] of config.interfaces.entries()) {
    const templateResult = portTemplateSchema.safeParse(ifaceSpec.template);
    if (!templateResult.success) {
      for (const issue of templateResult.error.issues) {
        errors.push({
          path: `interfaces.${index}.template.${issue.path.join('.')}`,
          message: issue.message,
          code: issue.code,
        });
      }
    }

    const tmpl = ifaceSpec.template;

    // Validaciones adicionales de negocio
    // Trunk sin VLANs permitidas
    if ((tmpl.type === 'trunk' || tmpl.type === 'uplink') &&
        (!tmpl.allowedVlans || tmpl.allowedVlans.length === 0)) {
      errors.push({
        path: `interfaces.${index}.template.allowedVlans`,
        message: 'Trunk port without allowed VLANs specified',
        code: 'trunk_no_allowed_vlans',
      });
    }

    // Voice VLAN sin access VLAN
    if (tmpl.voiceVlan !== undefined && tmpl.vlan === undefined) {
      errors.push({
        path: `interfaces.${index}.template`,
        message: 'Voice VLAN configured without access VLAN',
        code: 'voice_without_access_vlan',
      });
    }
  }

  return toValidationResult(errors);
}

export const portTemplatePlugin: ProtocolPlugin = {
  id: 'port-template',
  category: 'switching',
  name: 'Port Template',
  version: '1.0.0',
  description: 'Generates IOS interface configuration from port templates including switchport mode, VLANs, speed, duplex, STP, and port security.',
  commands: [
    {
      name: 'configure-port-template',
      description: 'Generate IOS interface commands from port templates',
      inputSchema: portTemplateConfigSchema,
      examples: [
        {
          input: {
            deviceName: 'Switch1',
            interfaces: [
              {
                interfaceName: 'GigabitEthernet0/1',
                template: {
                  type: 'access',
                  description: 'User PC',
                  vlan: 10,
                  stpPortfast: true,
                  stpBpduguard: true,
                },
              },
              {
                interfaceName: 'GigabitEthernet0/24',
                template: {
                  type: 'trunk',
                  description: 'Uplink to core',
                  nativeVlan: 99,
                  allowedVlans: [10, 20, 30, 99],
                  speed: '1000',
                  duplex: 'full',
                },
              },
            ],
          } satisfies PortTemplateConfigInput,
          description: 'Configure access and trunk ports',
        },
        {
          input: {
            deviceName: 'Switch1',
            interfaces: [
              {
                interfaceName: 'FastEthernet0/1',
                template: {
                  type: 'voice',
                  description: 'IP Phone + PC',
                  vlan: 10,
                  voiceVlan: 100,
                  stpPortfast: true,
                },
              },
            ],
          } satisfies PortTemplateConfigInput,
          description: 'Configure voice port with data VLAN',
        },
      ],
    },
  ],
  validate: validatePortTemplateConfig,
};
