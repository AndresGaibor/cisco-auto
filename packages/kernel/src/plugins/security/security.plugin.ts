import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';
import { securitySchema, type SecurityConfigInput } from './security.schema.js';
import { toValidationResult } from '../shared/validation.utils.js';
export { generateSecurityCommands, SECURITY_VERIFY_COMMANDS, verifyShowAccessLists } from './security.generator.js';

/**
 * Valida la configuración de seguridad (ACL + NAT)
 */
export function validateSecurityConfig(spec: unknown): PluginValidationResult {
  const parsed = securitySchema.safeParse(spec);

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

  // Validar que haya al menos una regla de seguridad
  const hasAcls = (config.acls?.length ?? 0) > 0;
  const hasNat = (config.natStatic?.length ?? 0) > 0 || config.natPool !== undefined;

  if (!hasAcls && !hasNat) {
    return toValidationResult([
      {
        path: 'acls',
        message: 'Se requiere al menos una ACL o configuración NAT',
        code: 'empty_security_config',
      },
    ]);
  }

  // Validar reglas ACL estándar (sin destino)
  for (const [aclIndex, acl] of (config.acls ?? []).entries()) {
    for (const [ruleIndex, rule] of acl.rules.entries()) {
      if (acl.type === 'standard' && rule.destination) {
        errors.push({
          path: `acls.${aclIndex}.rules.${ruleIndex}.destination`,
          message: 'Las ACL estándar no soportan filtros de destino',
          code: 'standard_acl_with_destination',
        });
      }

      if (acl.type === 'extended' && !rule.protocol) {
        errors.push({
          path: `acls.${aclIndex}.rules.${ruleIndex}.protocol`,
          message: 'Las ACL extendidas requieren protocolo',
          code: 'extended_acl_missing_protocol',
        });
      }
    }
  }

  return toValidationResult(errors);
}

/**
 * Plugin de seguridad para ACL y NAT
 */
export const securityPlugin: ProtocolPlugin = {
  id: 'security',
  category: 'security',
  name: 'Security (ACL/NAT)',
  version: '1.0.0',
  description: 'Genera y valida configuraciones IOS de ACL estándar, extendida y NAT.',
  commands: [
    {
      name: 'configure-security',
      description: 'Genera comandos IOS para ACL y NAT',
      inputSchema: securitySchema,
      examples: [
        {
          input: {
            deviceName: 'R1',
            acls: [
              {
                name: '100',
                type: 'extended',
                rules: [
                  {
                    action: 'permit',
                    protocol: 'tcp',
                    source: '192.168.1.0',
                    sourceWildcard: '0.0.0.255',
                    destination: 'any',
                    destinationPort: '80',
                  },
                ],
                appliedOn: 'GigabitEthernet0/0',
                direction: 'in',
              },
            ],
            natStatic: [
              {
                localIp: '192.168.1.100',
                globalIp: '203.0.113.10',
              },
            ],
            natInsideInterfaces: ['GigabitEthernet0/0'],
            natOutsideInterfaces: ['GigabitEthernet0/1'],
          } satisfies SecurityConfigInput,
          description: 'ACL extendida + NAT estático con interfaces',
        },
        {
          input: {
            deviceName: 'R2',
            acls: [
              {
                name: '10',
                type: 'standard',
                rules: [
                  {
                    action: 'permit',
                    source: '192.168.1.0',
                    sourceWildcard: '0.0.0.255',
                  },
                ],
              },
            ],
          } satisfies SecurityConfigInput,
          description: 'ACL estándar simple',
        },
      ],
    },
  ],
  validate: validateSecurityConfig,
};
